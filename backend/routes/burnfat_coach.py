"""
BurnFat 대화형 코치 — Sprint 2.5.

단발성 AI 조언(burnfat_ai.py)을 *주차별 누적 데이터 기반의 멀티턴 대화* 로 격상한다.
세션·발화·장기 메모리를 서버에 영속화해 "지난 대화와 약속을 기억하는 코치" 를 구현.

설계 원칙 (STEP 2 / IMPROVEMENT_REPORT §2.5.2)
  - Grok 은 무상태 → 매 호출마다 [system + memory + 최근 N턴 + 새 user] 를 새로 조립.
  - 응답은 xAI chat.completions stream=true → SSE 로 토큰 단위 전송.
  - 캐시·페치·Grok 호출 패턴은 Sprint 2 burnfat_ai.py 를 그대로 재사용(import).
  - Supabase 접근은 백엔드(service_role)만 — coach_* 테이블은 RLS anon deny.
  - 세션 소유권은 device_secret(SHA-256) 으로 애플리케이션 레벨 검증.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Iterator

import requests
from flask import Blueprint, Response, jsonify, request, stream_with_context

from routes.burnfat_ai import (
    XAI_API_URL,
    XAI_MODEL,
    XAI_TIMEOUT_SECONDS,
    _build_advice_md,
    _build_user_content,
    _call_grok,
    _compute_week_no,
    _fetch_challenge_dates,
    _fetch_participant,
    _fetch_weekly_logs,
    _get_supabase_config,
    _supabase_get,
)

bp = Blueprint("burnfat_coach", __name__, url_prefix="/api/burnfat/coach")
logger = logging.getLogger(__name__)

# ── 가드 상수 ──────────────────────────────────────────────────────────────
USER_MESSAGE_MAX_CHARS = 1000
ASSISTANT_MAX_TOKENS = 600
WEEKLY_MESSAGE_LIMIT = 30          # 참가자당 주 30개 user 메시지
DAILY_TOKENS_IN_LIMIT = 30_000
DAILY_TOKENS_OUT_LIMIT = 10_000
RECENT_TURNS = 12                  # 컨텍스트에 싣는 최근 턴 수
MAX_INPUT_TOKENS = 6_000           # 입력 토큰 상한(추정) — 초과 시 오래된 턴부터 제거

VALID_PERSONAS = {"strict", "friendly", "scientist"}
VALID_VISIBILITY = {"private", "room"}

# ── 시스템 프롬프트 ────────────────────────────────────────────────────────
_COACH_SYSTEM = """당신은 BurnFat 의 체지방 감량 코치입니다. 참가자와 *대화* 합니다.
- 항상 한국어로, 간결하고 따뜻하게 답하세요. 한 응답은 5문장 이내.
- <PROFILE_AND_STATS> 의 실제 기록 수치를 인용해 말하세요. 일반론 반복 금지.
- 근거가 된 주차를 언급할 때는 본문에서 자연스럽게 말하고, 메시지 맨 끝에
  `[ref:W2,W3]` 형식으로 인용 주차를 표기하세요 (없으면 생략).
- 이전 대화 맥락과 약속을 이어가세요."""

_SAFETY_GUARD = """## 안전 가드 (반드시 준수)
다음 주제는 조언하지 말고, 정중히 거부한 뒤 의사·영양사 등 전문가 상담을 권유하세요:
- 질병 진단·치료, 약물·보조제 처방
- 체지방률 5% 미만 등 극단적·위험한 목표
- 극단적 단식(장기 단식, 하루 800kcal 미만 등)·구토 등 섭식장애 유발 행위
거부 시에도 따뜻한 톤을 유지하고, 건강한 범위의 대안을 1가지 제시하세요."""

_PERSONA_TONES = {
    "strict": "코치 톤: 엄격하고 직설적. 핑계를 받아주지 않되 인신공격은 하지 않습니다.",
    "friendly": "코치 톤: 다정하고 격려하는 친구. 작은 진전도 구체적으로 칭찬합니다.",
    "scientist": "코치 톤: 데이터·근거 중심. 수치와 생리학적 메커니즘을 쉽게 설명합니다.",
}

_MEMORY_SYSTEM = """당신은 코칭 세션 요약가입니다.
기존 장기 메모리와 이번 세션의 발화를 합쳐, 다음 세션에서 코치가 참고할
'장기 메모리'를 한국어 markdown 으로 작성하세요.
포함: 사용자의 목표·패턴, 코치와 한 약속, 효과 있던/없던 전략, 주의사항.
500 토큰 이내로 간결하게. 약속과 다음 행동을 우선 보존하세요."""

_REF_PATTERN = re.compile(r"\[ref:\s*([0-9Ww,\s]+)\]")
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"01[016789][-\s]?\d{3,4}[-\s]?\d{4}")


# ── 공용 헬퍼 ──────────────────────────────────────────────────────────────

def _hash_secret(plain: str) -> str:
    return hashlib.sha256((plain or "").encode("utf-8")).hexdigest()


def _estimate_tokens(text: str) -> int:
    """대략적 토큰 추정 (tiktoken 미설치 — 문자 길이 기반)."""
    return max(1, len(text or "") // 3)


def _mask_pii(text: str) -> str:
    """저장·전송 전 전화/이메일 마스킹."""
    masked = _EMAIL_RE.sub("[이메일 가림]", text or "")
    masked = _PHONE_RE.sub("[전화번호 가림]", masked)
    return masked


def _extract_references(text: str) -> tuple[str, list[dict[str, int]]]:
    """`[ref:W2,W3]` 마커를 추출해 references 로 분리하고 본문에서 제거."""
    refs: list[dict[str, int]] = []
    seen: set[int] = set()
    for m in _REF_PATTERN.finditer(text):
        for tok in re.findall(r"\d+", m.group(1)):
            n = int(tok)
            if n not in seen:
                seen.add(n)
                refs.append({"week_no": n})
    clean = _REF_PATTERN.sub("", text).strip()
    return clean, refs


def _sse(obj: dict[str, Any]) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _device_secret() -> str:
    return (request.headers.get("X-Device-Secret") or "").strip()


def _service_key_role() -> str:
    """SUPABASE_SERVICE_ROLE_KEY(JWT) 의 role 클레임만 디코드해 반환.
    coach_* 테이블 쓰기는 service_role 이 필수 — 'anon' 이면 INSERT 가 RLS 로 막힌다.
    키 값 자체는 노출하지 않고 role 만 본다(서명 검증 불필요)."""
    _, key = _get_supabase_config()
    if not key:
        return "missing"
    try:
        payload_b64 = key.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return str(payload.get("role") or "unknown")
    except Exception:  # noqa: BLE001 — 진단용, 모든 파싱 실패는 unparseable
        return "unparseable"


# ── Supabase REST 헬퍼 (insert/patch/count) ────────────────────────────────

def _supabase_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    _, key = _get_supabase_config()
    headers = {
        "apikey": key or "",
        "Authorization": f"Bearer {key or ''}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _supabase_insert(path: str, body: dict[str, Any]) -> dict[str, Any]:
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    resp = requests.post(
        f"{url}{path}",
        json=body,
        headers=_supabase_headers({"Prefer": "return=representation"}),
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and data else (data or {})


def _supabase_patch(path: str, params: dict[str, str], body: dict[str, Any]) -> None:
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    resp = requests.patch(
        f"{url}{path}",
        params=params,
        json=body,
        headers=_supabase_headers({"Prefer": "return=minimal"}),
        timeout=10,
    )
    resp.raise_for_status()


def _supabase_delete(path: str, params: dict[str, str]) -> None:
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    resp = requests.delete(
        f"{url}{path}",
        params=params,
        headers=_supabase_headers({"Prefer": "return=minimal"}),
        timeout=10,
    )
    resp.raise_for_status()


# ── coach_* DB 연산 ────────────────────────────────────────────────────────

def _get_session(session_id: str) -> dict[str, Any] | None:
    rows = _supabase_get(
        "/rest/v1/coach_sessions", {"id": f"eq.{session_id}", "select": "*"}
    )
    return rows[0] if rows else None


def _get_active_session(participant_id: str, week_no: int) -> dict[str, Any] | None:
    rows = _supabase_get(
        "/rest/v1/coach_sessions",
        {
            "participant_id": f"eq.{participant_id}",
            "week_no": f"eq.{week_no}",
            "status": "eq.active",
            "select": "*",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _create_session(
    participant_id: str, week_no: int, persona: str, visibility: str, device_hash: str
) -> dict[str, Any]:
    return _supabase_insert(
        "/rest/v1/coach_sessions",
        {
            "participant_id": participant_id,
            "week_no": week_no,
            "persona": persona,
            "visibility": visibility,
            "device_secret_hash": device_hash or None,
        },
    )


def _insert_message(
    session_id: str,
    role: str,
    content: str,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
    references: list[dict[str, int]] | None = None,
) -> dict[str, Any]:
    return _supabase_insert(
        "/rest/v1/coach_messages",
        {
            "session_id": session_id,
            "role": role,
            "content": content,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "references_jsonb": references,
        },
    )


def _fetch_messages(session_id: str) -> list[dict[str, Any]]:
    return _supabase_get(
        "/rest/v1/coach_messages",
        {"session_id": f"eq.{session_id}", "select": "*", "order": "created_at.asc"},
    )


def _fetch_memory(participant_id: str) -> dict[str, Any] | None:
    rows = _supabase_get(
        "/rest/v1/participant_coach_memory",
        {"participant_id": f"eq.{participant_id}", "select": "*"},
    )
    return rows[0] if rows else None


def _store_memory(participant_id: str, summary_md: str, last_week_no: int | None) -> None:
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    resp = requests.post(
        f"{url}/rest/v1/participant_coach_memory",
        params={"on_conflict": "participant_id"},
        json={
            "participant_id": participant_id,
            "summary_md": summary_md,
            "last_week_no": last_week_no,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=_supabase_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        timeout=10,
    )
    resp.raise_for_status()


def _participant_session_ids(participant_id: str) -> list[str]:
    rows = _supabase_get(
        "/rest/v1/coach_sessions",
        {"participant_id": f"eq.{participant_id}", "select": "id"},
    )
    return [str(r["id"]) for r in rows if r.get("id")]


def _weekly_usage(participant_id: str) -> dict[str, int]:
    """최근 7일 user 메시지 수 + 최근 24h 토큰 사용량(추정) 집계."""
    session_ids = _participant_session_ids(participant_id)
    if not session_ids:
        return {"week_messages": 0, "day_tokens_in": 0, "day_tokens_out": 0}
    in_list = "in.(" + ",".join(session_ids) + ")"
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    day_ago = (now - timedelta(hours=24)).isoformat()

    week_rows = _supabase_get(
        "/rest/v1/coach_messages",
        {
            "session_id": in_list,
            "role": "eq.user",
            "created_at": f"gte.{week_ago}",
            "select": "id",
        },
    )
    day_rows = _supabase_get(
        "/rest/v1/coach_messages",
        {
            "session_id": in_list,
            "created_at": f"gte.{day_ago}",
            "select": "tokens_in,tokens_out",
        },
    )
    return {
        "week_messages": len(week_rows),
        "day_tokens_in": sum(int(r.get("tokens_in") or 0) for r in day_rows),
        "day_tokens_out": sum(int(r.get("tokens_out") or 0) for r in day_rows),
    }


# ── Grok 호출 ──────────────────────────────────────────────────────────────

def _stream_grok(messages: list[dict[str, str]]) -> Iterator[str]:
    """xAI chat.completions stream=true → content 토큰 조각을 yield."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("XAI_API_KEY not configured")
    payload = {
        "model": XAI_MODEL,
        "messages": messages,
        "max_tokens": ASSISTANT_MAX_TOKENS,
        "temperature": 0.7,
        "stream": True,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = requests.post(
        XAI_API_URL, json=payload, headers=headers, timeout=XAI_TIMEOUT_SECONDS, stream=True
    )
    resp.raise_for_status()
    # text/event-stream 은 charset 미표기 시 requests 가 Latin-1 로 추정 → 한글이 깨진다.
    # xAI SSE 본문은 UTF-8 이므로 명시적으로 지정.
    resp.encoding = "utf-8"
    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        chunk = line[5:].strip()
        if chunk == "[DONE]":
            break
        try:
            obj = json.loads(chunk)
            delta = (obj.get("choices") or [{}])[0].get("delta") or {}
            piece = delta.get("content")
            if piece:
                yield piece
        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
            continue


def _call_grok_plain(system_prompt: str, user_content: str, max_tokens: int) -> str:
    """비스트리밍 단발 호출 — 메모리 압축용."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("XAI_API_KEY not configured")
    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.5,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = requests.post(
        XAI_API_URL, json=payload, headers=headers, timeout=XAI_TIMEOUT_SECONDS
    )
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Grok response had no choices")
    return (choices[0].get("message") or {}).get("content", "").strip()


# ── 컨텍스트 조립 ──────────────────────────────────────────────────────────

def _build_system_prompt(
    persona: str,
    participant: dict[str, Any],
    logs: list[dict[str, Any]],
    start_date: str,
    end_date: str,
    memory_summary: str | None,
) -> str:
    parts = [
        _COACH_SYSTEM,
        _PERSONA_TONES.get(persona, _PERSONA_TONES["friendly"]),
        _SAFETY_GUARD,
        "<PROFILE_AND_STATS>\n"
        + _build_user_content(participant, logs, start_date, end_date),
    ]
    if memory_summary:
        parts.append(
            "<MEMORY>\n"
            + memory_summary
            + "\n위 <MEMORY> 는 지난 주까지의 흐름·약속이다. "
            "세션 첫 응답에서 지난 약속을 자연스럽게 인용하라."
        )
    return "\n\n".join(parts)


def _trim_turns(
    turns: list[dict[str, Any]], system_prompt: str, new_content: str
) -> list[dict[str, str]]:
    """최근 RECENT_TURNS 턴을 싣되, 입력 토큰 추정이 MAX_INPUT_TOKENS 를 넘으면
    가장 오래된 턴부터 잘라낸다."""
    kept = [
        {"role": t["role"], "content": t["content"]}
        for t in turns[-RECENT_TURNS:]
        if t.get("role") in ("user", "assistant") and t.get("content")
    ]
    base = _estimate_tokens(system_prompt) + _estimate_tokens(new_content)
    while kept and base + sum(_estimate_tokens(t["content"]) for t in kept) > MAX_INPUT_TOKENS:
        kept.pop(0)
    return kept


def _session_summary_for_memory(messages: list[dict[str, Any]]) -> str:
    lines = []
    for m in messages:
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        who = "사용자" if role == "user" else "코치"
        lines.append(f"{who}: {m.get('content', '')}")
    return "\n".join(lines)


# ── 소유권 검증 ────────────────────────────────────────────────────────────

def _can_access_session(session: dict[str, Any], device_hash: str) -> bool:
    """본인 디바이스이거나, 세션이 'room' 공개면 접근 허용."""
    if session.get("visibility") == "room":
        return True
    stored = session.get("device_secret_hash")
    return bool(stored) and stored == device_hash


# ── 엔드포인트 ─────────────────────────────────────────────────────────────

@bp.route("/health", methods=["GET"])
def coach_health():
    supabase_url, supabase_key = _get_supabase_config()
    ready = True
    try:
        _supabase_get("/rest/v1/coach_sessions", {"select": "id", "limit": "1"})
    except (requests.RequestException, RuntimeError):
        ready = False
    return jsonify({
        "supabase_configured": bool(supabase_url and supabase_key),
        "xai_configured": bool(os.environ.get("XAI_API_KEY")),
        "coach_tables_ready": ready,
        # coach_* 쓰기는 service_role 필수. 'anon' 이면 SUPABASE_SERVICE_ROLE_KEY
        # 환경변수가 잘못 설정된 것(INSERT 가 401 로 실패).
        "service_key_role": _service_key_role(),
        "model": XAI_MODEL,
    }), 200


@bp.route("/sessions", methods=["GET"])
def list_sessions():
    """주차별 세션 목록 + 각 세션 첫 메시지 미리보기. '지난 세션 보기' 용."""
    participant_id = request.args.get("participant_id")
    if not participant_id:
        return jsonify({"error": "participant_id required"}), 400
    week_no = request.args.get("week_no")
    device_hash = _hash_secret(_device_secret())

    params: dict[str, str] = {
        "participant_id": f"eq.{participant_id}",
        "select": "*",
        "order": "created_at.desc",
    }
    if week_no:
        params["week_no"] = f"eq.{week_no}"
    try:
        sessions = _supabase_get("/rest/v1/coach_sessions", params)
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach list_sessions failed: %s", e)
        return jsonify({"error": "Failed to fetch sessions"}), 502

    out = []
    for s in sessions:
        # 공유 OFF(private) 세션은 본인 디바이스만 조회 가능.
        if not _can_access_session(s, device_hash):
            continue
        preview = ""
        try:
            msgs = _supabase_get(
                "/rest/v1/coach_messages",
                {
                    "session_id": f"eq.{s['id']}",
                    "select": "content,role",
                    "order": "created_at.asc",
                    "limit": "1",
                },
            )
            if msgs:
                preview = str(msgs[0].get("content") or "")[:120]
        except (requests.RequestException, RuntimeError):
            preview = ""
        out.append({
            "id": s["id"],
            "week_no": s["week_no"],
            "persona": s["persona"],
            "status": s["status"],
            "visibility": s["visibility"],
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
            "preview": preview,
            "owned": bool(s.get("device_secret_hash") == device_hash),
        })
    return jsonify({"sessions": out}), 200


@bp.route("/sessions/<session_id>/messages", methods=["GET"])
def get_session_messages(session_id: str):
    """세션 전체 메시지 복원 — 모달 재진입 시 이전 대화 복원용."""
    device_hash = _hash_secret(_device_secret())
    try:
        session = _get_session(session_id)
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach get_session failed: %s", e)
        return jsonify({"error": "Failed to fetch session"}), 502
    if not session:
        return jsonify({"error": "Session not found"}), 404
    if not _can_access_session(session, device_hash):
        return jsonify({"error": "Forbidden"}), 403
    try:
        messages = _fetch_messages(session_id)
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach fetch_messages failed: %s", e)
        return jsonify({"error": "Failed to fetch messages"}), 502
    return jsonify({"session": session, "messages": messages}), 200


@bp.route("/messages", methods=["POST", "OPTIONS"])
def post_message():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(silent=True) or {}
    participant_id = body.get("participant_id")
    content = str(body.get("content") or "").strip()
    if not participant_id:
        return jsonify({"error": "participant_id required"}), 400
    participant_id = str(participant_id)
    if not content:
        return jsonify({"error": "메시지를 입력해주세요."}), 400
    if len(content) > USER_MESSAGE_MAX_CHARS:
        return jsonify({"error": f"메시지는 {USER_MESSAGE_MAX_CHARS}자 이하로 입력해주세요."}), 400

    device_secret = _device_secret()
    device_hash = _hash_secret(device_secret)
    persona_raw = str(body.get("persona") or "")
    persona_explicit = persona_raw in VALID_PERSONAS
    persona = persona_raw if persona_explicit else "friendly"
    visibility = str(body.get("visibility") or "private")
    if visibility not in VALID_VISIBILITY:
        visibility = "private"
    session_id = body.get("session_id")
    seed_content = str(body.get("seed_content") or "").strip()

    # PII 마스킹 (저장·전송 전)
    content = _mask_pii(content)

    # 참가자/기록/챌린지
    try:
        participant = _fetch_participant(participant_id)
    except RuntimeError:
        return jsonify({"error": "Supabase not configured"}), 500
    except requests.RequestException:
        return jsonify({"error": "Failed to fetch participant"}), 502
    if not participant:
        return jsonify({"error": "Participant not found"}), 404

    try:
        logs = _fetch_weekly_logs(participant_id)
        start_date, end_date = _fetch_challenge_dates(participant.get("challenge_id"))
    except requests.RequestException:
        return jsonify({"error": "Failed to fetch supporting data"}), 502

    week_no_raw = body.get("week_no")
    try:
        week_no = int(week_no_raw) if week_no_raw is not None else _compute_week_no(start_date)
    except (TypeError, ValueError):
        week_no = _compute_week_no(start_date)

    # 호출 한도
    try:
        usage = _weekly_usage(participant_id)
    except (requests.RequestException, RuntimeError):
        usage = {"week_messages": 0, "day_tokens_in": 0, "day_tokens_out": 0}
    if usage["week_messages"] >= WEEKLY_MESSAGE_LIMIT:
        return jsonify({
            "error": f"이번 주 코치 대화 한도({WEEKLY_MESSAGE_LIMIT}개)를 모두 사용했어요. 다음 주에 다시 만나요."
        }), 429
    if usage["day_tokens_in"] >= DAILY_TOKENS_IN_LIMIT or usage["day_tokens_out"] >= DAILY_TOKENS_OUT_LIMIT:
        return jsonify({"error": "오늘 코치 대화 한도를 모두 사용했어요. 내일 다시 시도해주세요."}), 429

    # 세션 get-or-create
    session: dict[str, Any] | None = None
    try:
        if session_id:
            session = _get_session(str(session_id))
            if not session:
                return jsonify({"error": "Session not found"}), 404
            if not _can_access_session(session, device_hash):
                return jsonify({"error": "Forbidden"}), 403
        else:
            session = _get_active_session(participant_id, week_no)
            if session and not _can_access_session(session, device_hash):
                session = None  # 남의 세션이면 새로 만든다
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach session lookup failed: %s", e)
        return jsonify({"error": "Failed to load session"}), 502

    memory = None
    try:
        memory_row = _fetch_memory(participant_id)
        memory = memory_row.get("summary_md") if memory_row else None
    except (requests.RequestException, RuntimeError):
        memory = None

    is_new_session = session is None
    try:
        if is_new_session:
            session = _create_session(participant_id, week_no, persona, visibility, device_hash)
            # 첫 어시스턴트 시드 메시지 — 카드 콘텐츠(seed_content) 또는 Sprint 2 조언 생성.
            seed_text = seed_content
            if not seed_text:
                try:
                    seed_text = _build_advice_md(
                        _call_grok(_build_user_content(participant, logs, start_date, end_date))
                    )
                except (requests.RequestException, RuntimeError):
                    seed_text = "이번 주 기록을 함께 살펴봐요. 궁금한 점을 물어보세요."
            _insert_message(
                session["id"], "assistant", seed_text, tokens_out=_estimate_tokens(seed_text)
            )
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach session create failed: %s", e)
        return jsonify({"error": "Failed to create session"}), 502

    assert session is not None
    sid = str(session["id"])

    # 톤 변경 — 기존 세션에 명시적 persona 가 오면 즉시 반영.
    if not is_new_session and persona_explicit and session.get("persona") != persona:
        try:
            _supabase_patch("/rest/v1/coach_sessions", {"id": f"eq.{sid}"}, {"persona": persona})
            session["persona"] = persona
        except (requests.RequestException, RuntimeError):
            pass

    # user 메시지 저장
    tokens_in_est = _estimate_tokens(content)
    try:
        _insert_message(sid, "user", content, tokens_in=tokens_in_est)
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach user message store failed: %s", e)
        return jsonify({"error": "Failed to store message"}), 502

    # 컨텍스트 조립
    try:
        prior = _fetch_messages(sid)
    except (requests.RequestException, RuntimeError):
        prior = []
    # 방금 저장한 user 메시지는 별도로 붙이므로 prior 에서 마지막 user 1건 제외
    history = [m for m in prior if not (m.get("role") == "user" and m.get("content") == content)]
    system_prompt = _build_system_prompt(
        session.get("persona", persona), participant, logs, start_date, end_date, memory
    )
    chat_messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    chat_messages.extend(_trim_turns(history, system_prompt, content))
    chat_messages.append({"role": "user", "content": content})

    def generate() -> Iterator[str]:
        yield _sse({
            "session_id": sid,
            "session_created": is_new_session,
            "week_messages_used": usage["week_messages"] + 1,  # 방금 보낸 메시지 포함
            "week_messages_limit": WEEKLY_MESSAGE_LIMIT,
        })
        collected: list[str] = []
        try:
            for piece in _stream_grok(chat_messages):
                collected.append(piece)
                yield _sse({"delta": piece})
        except (requests.RequestException, RuntimeError) as e:
            logger.exception("coach stream failed: %s", e)
            yield _sse({"error": "AI 코치에 일시적으로 연결할 수 없어요. 잠시 후 다시 시도해주세요."})
            return
        assistant_text = "".join(collected).strip()
        if not assistant_text:
            yield _sse({"error": "응답이 비어 있어요. 다시 시도해주세요."})
            return
        clean_text, refs = _extract_references(assistant_text)
        stored = None
        try:
            stored = _insert_message(
                sid,
                "assistant",
                clean_text,
                tokens_in=_estimate_tokens(system_prompt),
                tokens_out=_estimate_tokens(clean_text),
                references=refs or None,
            )
        except (requests.RequestException, RuntimeError) as e:
            logger.warning("coach assistant store failed: %s", e)
        yield _sse({"done": True, "session_id": sid, "message": stored, "references": refs})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@bp.route("/sessions/<session_id>/end", methods=["POST", "OPTIONS"])
def end_session(session_id: str):
    if request.method == "OPTIONS":
        return ("", 204)

    device_hash = _hash_secret(_device_secret())
    try:
        session = _get_session(session_id)
    except (requests.RequestException, RuntimeError):
        return jsonify({"error": "Failed to fetch session"}), 502
    if not session:
        return jsonify({"error": "Session not found"}), 404
    if not (session.get("device_secret_hash") and session["device_secret_hash"] == device_hash):
        return jsonify({"error": "Forbidden"}), 403

    try:
        _supabase_patch(
            "/rest/v1/coach_sessions", {"id": f"eq.{session_id}"}, {"status": "archived"}
        )
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach end_session archive failed: %s", e)
        return jsonify({"error": "Failed to archive session"}), 502

    # 장기 메모리 압축 갱신 (동기, 짧게)
    memory_updated = False
    try:
        messages = _fetch_messages(session_id)
        memory_row = _fetch_memory(str(session["participant_id"]))
        prev_summary = memory_row.get("summary_md") if memory_row else ""
        user_content = (
            f"[기존 장기 메모리]\n{prev_summary or '(없음)'}\n\n"
            f"[이번 세션 발화]\n{_session_summary_for_memory(messages)}"
        )
        new_summary = _call_grok_plain(_MEMORY_SYSTEM, user_content, max_tokens=700)
        if new_summary:
            _store_memory(
                str(session["participant_id"]), new_summary, session.get("week_no")
            )
            memory_updated = True
    except (requests.RequestException, RuntimeError) as e:
        logger.warning("coach memory compression skipped: %s", e)

    return jsonify({"status": "archived", "memory_updated": memory_updated}), 200


@bp.route("/memory/reset", methods=["POST", "OPTIONS"])
def reset_memory():
    """기억 초기화 — participant_coach_memory 삭제 + 모든 세션 archived."""
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(silent=True) or {}
    participant_id = body.get("participant_id")
    if not participant_id:
        return jsonify({"error": "participant_id required"}), 400
    participant_id = str(participant_id)
    device_hash = _hash_secret(_device_secret())

    # 소유권 검증 — 이 디바이스가 만든 세션이 하나라도 있어야 초기화 허용.
    try:
        owned = _supabase_get(
            "/rest/v1/coach_sessions",
            {
                "participant_id": f"eq.{participant_id}",
                "device_secret_hash": f"eq.{device_hash}",
                "select": "id",
                "limit": "1",
            },
        )
    except (requests.RequestException, RuntimeError):
        return jsonify({"error": "Failed to verify ownership"}), 502
    if not owned:
        return jsonify({"error": "이 기기에서 시작한 코치 대화가 없어 초기화할 수 없어요."}), 403

    try:
        _supabase_delete(
            "/rest/v1/participant_coach_memory",
            {"participant_id": f"eq.{participant_id}"},
        )
        _supabase_patch(
            "/rest/v1/coach_sessions",
            {"participant_id": f"eq.{participant_id}", "device_secret_hash": f"eq.{device_hash}"},
            {"status": "archived"},
        )
    except (requests.RequestException, RuntimeError) as e:
        logger.exception("coach memory reset failed: %s", e)
        return jsonify({"error": "Failed to reset memory"}), 502

    return jsonify({"status": "reset"}), 200
