"""
BurnFat AI 조언 - Grok (xAI) 프록시 엔드포인트.

- Supabase REST API를 통해 참가자/주간 기록/챌린지 정보 조회
- xAI Grok API (OpenAI 호환)로 조언 생성 — JSON 구조화 응답
- weekly_ai_advice 테이블에 (participant_id, week_no, prompt_version) 단위 서버 캐시
- CORS: 전역 CORS 설정(app.py)이 /api/* 에 적용되므로 별도 처리 불필요

Sprint 2 변경
  - 응답을 단일 문자열 → 구조화 JSON({summary, action_items[], cautions[]}) 으로 격상.
    `advice` 평문 필드는 구버전 클라이언트 호환을 위해 그대로 유지(구조화 필드로부터 합성).
  - weekly_ai_advice 서버 캐시 — 같은 주차/참가자 조언을 친구가 열어도 Grok 재호출 없음.
    캐시 신선도는 updated_at 기준 24h TTL. force_refresh / 사용자 추가 입력 시 우회.
  - 캐시 테이블이 아직 없거나(마이그레이션 미적용) 일시 오류여도 *조언 생성 자체는 동작*
    하도록 모든 캐시 연산을 graceful degrade 처리 → 백엔드/마이그레이션 배포 순서 무관.
  - 입력 가드: user_context 길이 제한, advice_style/advice_goal 화이트리스트.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests
from flask import Blueprint, jsonify, request

bp = Blueprint("burnfat_ai", __name__, url_prefix="/api/burnfat")

logger = logging.getLogger(__name__)

XAI_API_URL = "https://api.x.ai/v1/chat/completions"
XAI_MODELS_URL = "https://api.x.ai/v1/models"
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-4-1-fast-non-reasoning")
XAI_MAX_TOKENS = int(os.environ.get("XAI_MAX_TOKENS", "700"))
XAI_TIMEOUT_SECONDS = int(os.environ.get("XAI_TIMEOUT_SECONDS", "30"))
# BE-1: XAI_MODEL 이 부팅 검증에서 사용 불가로 확인되면 자동 전환할 폴백 모델.
XAI_MODEL_FALLBACK = os.environ.get("XAI_MODEL_FALLBACK", "grok-2-1212")

# BE-1: 부팅 시 1회 xAI 모델 검증 결과.
#   _model_validated — /v1/models 조회가 성공해 모델 가용성을 실제 확인했는지.
#   _active_model    — 실제 호출에 사용할 모델. XAI_MODEL 이 목록에 없으면 폴백으로 전환됨.
_model_validated: bool = False
_active_model: str = XAI_MODEL

# BE-3: 마지막으로 AI 조언이 성공 응답된 시각 (health 진단용). coach 엔드포인트와 공유.
_last_advice_success_at: datetime | None = None

# 프롬프트/응답 스키마 버전. 프롬프트가 바뀌면 올려서 과거 캐시를 자연 무효화.
PROMPT_VERSION = "sprint2-json-v1"
CACHE_TTL_HOURS = 24

# 입력 가드 (프롬프트 비용 폭주·오용 방지)
USER_CONTEXT_MAX_CHARS = 500
ADVICE_STYLE_WHITELIST = {
    "현실적으로",
    "엄격하게",
    "동기부여 중심으로",
    "식단 중심으로",
    "운동 중심으로",
}
ADVICE_GOAL_WHITELIST = {
    "이번 주 전략",
    "정체 원인 분석",
    "식단/운동 피드백",
    "동기부여",
}

SYSTEM_PROMPT = """당신은 체지방 감량 다이어트 전문 코치입니다.
참가자의 주간 데이터(체지방률, 몸무게, 운동 횟수, 수면 시간, 식단 패턴 등)를 분석하여
데이터에 근거한 개인화된 감량 전략을 제시하세요.

## 분석 지침
1. 주차별 추이를 반드시 분석하세요.
   - 어떤 주가 가장 효과적이었고, 그때의 운동·수면·식단 패턴이 무엇이었는지 구체적으로 언급하세요.
   - 체지방이 정체되거나 증가한 주가 있다면, 같은 주의 수면·식단·운동 데이터에서 원인을 찾으세요.
2. 기록된 데이터만 분석에 사용하세요.
   - 운동 횟수가 기록된 경우 → 빈도와 체지방 변화의 상관관계를 언급하세요.
   - 수면 시간이 기록된 경우 → 6시간 미만이면 코르티솔 상승으로 지방 분해 저해 가능성을 언급하세요.
   - 식단 패턴이 기록된 경우 → 과식/절식 주와 체중·체지방 변화를 연결하여 분석하세요.
3. 사용자가 추가로 입력한 현재 상황/고민/선호 조언 스타일이 있으면 최신 맥락으로 우선 반영하세요.
   단, 사용자의 설명과 기록 데이터가 충돌하면 기록 수치를 근거로 조심스럽게 해석하세요.

## 체지방 변화 판단 기준
- 주 0.3~0.5%p 감소: 이상적인 속도 (유지 권장)
- 0.5%p 초과 감소: 근손실 주의 — 단백질·칼로리 섭취 점검 권유
- 변화 없거나 증가: 수분·호르몬·주기 요인 OR 식단·운동 패턴 재점검
- 수면 6시간 미만: 코르티솔 상승 → 지방 분해 저해 — 수면 회복 최우선 권유
- 운동 2회 이하: 횟수 증가 또는 강도 조정 제안

## 출력 형식 (매우 중요)
반드시 아래 JSON 스키마를 따르는 JSON 객체 **하나만** 반환하세요. JSON 외 다른 텍스트를 절대 포함하지 마세요.

{
  "summary": "전체 추이를 한 문장으로 요약. 반드시 실제 기록 수치를 인용.",
  "action_items": ["이번 주에 실천할 구체적 행동. 숫자를 포함. 1~3개. 예: '운동 4회 + 수면 7시간 확보'"],
  "cautions": ["주의하거나 점검할 점. 0~2개. 없으면 빈 배열."]
}

- 모든 문자열은 한국어로 작성하세요.
- 일반론("단백질을 먹어라")만 반복하지 말고 반드시 실제 기록 수치를 인용하세요.
- action_items 는 측정 가능한 행동으로 작성하세요."""


# --------------------------------------------------------------------------
# Supabase REST 헬퍼
# --------------------------------------------------------------------------

def _get_supabase_config() -> tuple[str | None, str | None]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return (url or None, key or None)


def _supabase_get(path: str, params: dict[str, str]) -> list[dict[str, Any]]:
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    resp = requests.get(f"{url}{path}", params=params, headers=headers, timeout=10)
    if not resp.ok:
        logger.error(
            "Supabase REST error %s %s: status=%s body=%s",
            path,
            params,
            resp.status_code,
            (resp.text or "")[:800],
        )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def _supabase_upsert(path: str, body: dict[str, Any], on_conflict: str) -> None:
    """PostgREST upsert (merge-duplicates). on_conflict 는 UNIQUE 제약 컬럼 목록."""
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = requests.post(
        f"{url}{path}",
        params={"on_conflict": on_conflict},
        json=body,
        headers=headers,
        timeout=10,
    )
    if not resp.ok:
        logger.error(
            "Supabase upsert error %s: status=%s body=%s",
            path,
            resp.status_code,
            (resp.text or "")[:500],
        )
    resp.raise_for_status()


def _fetch_participant(participant_id: str) -> dict[str, Any] | None:
    rows = _supabase_get(
        "/rest/v1/participants",
        {"id": f"eq.{participant_id}", "select": "*"},
    )
    return rows[0] if rows else None


def _fetch_weekly_logs(participant_id: str) -> list[dict[str, Any]]:
    return _supabase_get(
        "/rest/v1/weekly_logs",
        {"participant_id": f"eq.{participant_id}", "order": "week_no.asc"},
    )


def _fetch_challenge_dates(challenge_id: Any) -> tuple[str, str]:
    if not challenge_id:
        return "", ""
    rows = _supabase_get(
        "/rest/v1/challenges",
        {"id": f"eq.{challenge_id}", "select": "start_date,end_date"},
    )
    if not rows:
        return "", ""
    return str(rows[0].get("start_date") or ""), str(rows[0].get("end_date") or "")


# --------------------------------------------------------------------------
# 주차 계산 + 캐시
# --------------------------------------------------------------------------

def _compute_week_no(start_date: str) -> int:
    """챌린지 시작일 기준 오늘이 속한 주차 (1-base). 시작 전이면 1."""
    if not start_date:
        return 1
    try:
        start = date.fromisoformat(start_date[:10])
    except ValueError:
        return 1
    diff_days = (date.today() - start).days
    if diff_days < 0:
        return 1
    return diff_days // 7 + 1


def _is_fresh(updated_at: str | None) -> bool:
    if not updated_at:
        return False
    try:
        ts = datetime.fromisoformat(str(updated_at).replace("Z", "+00:00"))
    except ValueError:
        return False
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - ts < timedelta(hours=CACHE_TTL_HOURS)


def _fetch_cached_advice(participant_id: str, week_no: int) -> dict[str, Any] | None:
    """캐시 조회. 테이블 미존재/일시 오류는 캐시 미스로 처리(graceful degrade)."""
    try:
        rows = _supabase_get(
            "/rest/v1/weekly_ai_advice",
            {
                "participant_id": f"eq.{participant_id}",
                "week_no": f"eq.{week_no}",
                "prompt_version": f"eq.{PROMPT_VERSION}",
                "select": "*",
                "order": "updated_at.desc",
                "limit": "1",
            },
        )
    except (requests.RequestException, RuntimeError) as e:
        logger.warning("weekly_ai_advice cache read skipped: %s", e)
        return None
    if not rows:
        return None
    row = rows[0]
    if not _is_fresh(row.get("updated_at")):
        return None
    return row


def _store_advice(
    participant_id: str,
    week_no: int,
    advice_md: str,
    advice_json: dict[str, Any],
) -> None:
    """캐시 저장(upsert). 실패해도 조언 응답 자체는 진행되도록 예외를 흡수."""
    try:
        _supabase_upsert(
            "/rest/v1/weekly_ai_advice",
            {
                "participant_id": participant_id,
                "week_no": week_no,
                "prompt_version": PROMPT_VERSION,
                "advice_md": advice_md,
                "advice_json": advice_json,
                "model": XAI_MODEL,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="participant_id,week_no,prompt_version",
        )
    except (requests.RequestException, RuntimeError) as e:
        logger.warning("weekly_ai_advice cache write skipped: %s", e)


# --------------------------------------------------------------------------
# 프롬프트 조립
# --------------------------------------------------------------------------

_DIET_LABEL: dict[str, str] = {
    "normal": "식단 정상",
    "overeat": "식단 과식",
    "undereat": "식단 절식",
}


def _format_log_line(log: dict[str, Any]) -> str:
    week_no = log.get("week_no")
    body_fat = log.get("body_fat_rate")
    header = (
        f"{week_no}주차: 체지방 {body_fat}%"
        if body_fat is not None
        else f"{week_no}주차: 체지방 미기록"
    )
    details: list[str] = []
    if log.get("weight_kg") is not None:
        details.append(f"몸무게 {log['weight_kg']}kg")
    if log.get("exercise_count") is not None:
        details.append(f"운동 {log['exercise_count']}회")
    if log.get("sleep_hours") is not None:
        details.append(f"수면 {log['sleep_hours']}h")
    diet = log.get("diet_quality")
    if diet:
        details.append(_DIET_LABEL.get(diet, diet))
    if log.get("note"):
        details.append(f"특이사항: {log['note']}")
    if details:
        return f"{header} ({', '.join(details)})"
    return header


def _build_user_content(
    participant: dict[str, Any],
    logs: list[dict[str, Any]],
    start_date: str,
    end_date: str,
    user_context: str = "",
    advice_style: str = "",
    advice_goal: str = "",
) -> str:
    age_str = f"{participant['age']}세" if participant.get("age") is not None else "미입력"
    gender = participant.get("gender")
    gender_str = "남성" if gender == "M" else "여성" if gender == "F" else "미입력"
    target_str = (
        f"목표 {participant['target_body_fat']}%"
        if participant.get("target_body_fat") is not None
        else "미설정"
    )
    logs_summary = "\n".join(_format_log_line(log) for log in logs) or "아직 기록 없음"

    extra_context = ""
    if advice_goal or advice_style or user_context:
        extra_context = (
            "\n사용자 추가 요청:\n"
            f"- 조언 목적: {advice_goal or '일반 감량 전략'}\n"
            f"- 원하는 톤/방식: {advice_style or '현실적이고 구체적으로'}\n"
            f"- 현재 상황/고민: {user_context or '추가 입력 없음'}\n"
        )

    return (
        f"참가자: {participant.get('nickname', '')}\n"
        f"기본정보: {age_str}, {gender_str}, {target_str}\n"
        f"대결 기간: {start_date} ~ {end_date}\n\n"
        f"주간 기록:\n{logs_summary}\n\n"
        f"{extra_context}\n"
        "위 데이터를 바탕으로 맞춤 조언을 JSON 스키마에 맞춰 제시하세요."
    )


# --------------------------------------------------------------------------
# Grok 호출 + JSON 파싱
# --------------------------------------------------------------------------

def _parse_advice_json(raw: str) -> dict[str, Any]:
    """Grok 응답 문자열 → {summary, action_items[], cautions[]} 로 정규화.
    JSON 파싱 실패 시 평문을 summary 로 폴백."""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {"summary": raw.strip(), "action_items": [], "cautions": []}
    if not isinstance(data, dict):
        return {"summary": raw.strip(), "action_items": [], "cautions": []}

    def _str_list(value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(x).strip() for x in value if str(x).strip()]

    summary = str(data.get("summary") or "").strip()
    action_items = _str_list(data.get("action_items"))
    cautions = _str_list(data.get("cautions"))
    if not summary and not action_items:
        return {"summary": raw.strip(), "action_items": [], "cautions": []}
    return {"summary": summary, "action_items": action_items, "cautions": cautions}


def _build_advice_md(structured: dict[str, Any]) -> str:
    """구조화 응답 → 사람이 읽는 평문 (구버전 클라이언트 호환·폴백 표시용)."""
    parts: list[str] = []
    summary = structured.get("summary", "")
    if summary:
        parts.append(summary)
    items = structured.get("action_items") or []
    if items:
        parts.append("[이번 주 실천]\n" + "\n".join(f"- {x}" for x in items))
    cautions = structured.get("cautions") or []
    if cautions:
        parts.append("[주의]\n" + "\n".join(f"- {x}" for x in cautions))
    return "\n\n".join(parts).strip()


def _call_grok(user_content: str) -> dict[str, Any]:
    """Grok 호출 → 구조화 dict 반환."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("XAI_API_KEY not configured")

    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": XAI_MAX_TOKENS,
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        XAI_API_URL, json=payload, headers=headers, timeout=XAI_TIMEOUT_SECONDS
    )
    # BE-2: 오류 응답 본문을 로그에 캡처 — 원인 파악(잘못된 모델명·쿼터 등)에 필수.
    if not resp.ok:
        logger.error(
            "Grok HTTP error %s body=%s", resp.status_code, (resp.text or "")[:500]
        )
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Grok response had no choices")
    message = choices[0].get("message") or {}
    content = (message.get("content") or "").strip()
    if not content:
        raise RuntimeError("Grok response content was empty")
    return _parse_advice_json(content)


def _advice_payload(
    structured: dict[str, Any],
    advice_md: str,
    week_no: int,
    cached: bool,
    model: str | None,
) -> dict[str, Any]:
    return {
        # 구버전 클라이언트 호환: 평문 advice 필드는 항상 유지.
        "advice": advice_md,
        "summary": structured.get("summary", ""),
        "action_items": structured.get("action_items", []),
        "cautions": structured.get("cautions", []),
        "cached": cached,
        "week_no": week_no,
        "model": model,
        "prompt_version": PROMPT_VERSION,
    }


# --------------------------------------------------------------------------
# 운영 안전망 (BE-1 / BE-3)
# --------------------------------------------------------------------------

def _validate_model() -> None:
    """BE-1: 부팅 시 1회 xAI 모델 가용성 검증.

    XAI_MODEL 이 /v1/models 응답 목록에 없으면 경고 로그 후 XAI_MODEL_FALLBACK 으로
    자동 전환한다. 키 미설정·네트워크 오류 등으로 검증 자체가 불가능하면 _model_validated
    를 False 로 두고 설정값(XAI_MODEL)을 그대로 사용한다(조언 생성은 계속 동작)."""
    global _model_validated, _active_model, XAI_MODEL

    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        logger.warning("XAI model validation skipped: XAI_API_KEY not configured")
        return
    try:
        resp = requests.get(
            XAI_MODELS_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError) as e:
        logger.warning("XAI model validation skipped: %s", e)
        return

    models = {str(m.get("id")) for m in (data.get("data") or []) if m.get("id")}
    if not models:
        logger.warning("XAI model validation skipped: empty model list")
        return

    _model_validated = True
    if XAI_MODEL in models:
        _active_model = XAI_MODEL
        logger.info("XAI model validated: %s", XAI_MODEL)
    else:
        logger.warning(
            "XAI_MODEL %r not in available models %s — falling back to %r",
            XAI_MODEL,
            sorted(models),
            XAI_MODEL_FALLBACK,
        )
        _active_model = XAI_MODEL_FALLBACK
        # XAI_MODEL 전역도 교체 — coach 모듈 등 import 측이 폴백 모델을 사용하도록.
        XAI_MODEL = XAI_MODEL_FALLBACK


def _mark_advice_success() -> None:
    """BE-3: AI 조언이 성공 응답된 시각을 기록. coach 엔드포인트와 공유."""
    global _last_advice_success_at
    _last_advice_success_at = datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# 엔드포인트
# --------------------------------------------------------------------------

@bp.route("/ai/advice", methods=["POST", "OPTIONS"])
def ai_advice():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(silent=True) or {}
    participant_id = body.get("participant_id")
    if not participant_id:
        return jsonify({"error": "participant_id required"}), 400
    participant_id = str(participant_id)

    force_refresh = bool(body.get("force_refresh"))

    # 입력 가드 — 길이 제한 + 화이트리스트
    user_context = str(body.get("user_context") or "").strip()[:USER_CONTEXT_MAX_CHARS]
    advice_style = str(body.get("advice_style") or "").strip()
    if advice_style and advice_style not in ADVICE_STYLE_WHITELIST:
        advice_style = ""
    advice_goal = str(body.get("advice_goal") or "").strip()
    if advice_goal and advice_goal not in ADVICE_GOAL_WHITELIST:
        advice_goal = ""
    has_user_input = bool(user_context or advice_style or advice_goal)

    try:
        participant = _fetch_participant(participant_id)
    except RuntimeError as e:
        logger.error("Supabase config error: %s", e)
        return jsonify({"error": "Supabase not configured"}), 500
    except requests.RequestException as e:
        logger.exception("Supabase fetch failed: %s", e)
        return jsonify({"error": "Failed to fetch participant"}), 502

    if not participant:
        return jsonify({"error": "Participant not found"}), 404

    try:
        logs = _fetch_weekly_logs(participant_id)
        start_date, end_date = _fetch_challenge_dates(participant.get("challenge_id"))
    except requests.RequestException as e:
        logger.exception("Supabase fetch (logs/challenge) failed: %s", e)
        return jsonify({"error": "Failed to fetch supporting data"}), 502

    week_no = _compute_week_no(start_date)

    # 캐시 조회 — 사용자 추가 입력이 없고 강제 새로고침이 아닐 때만.
    if not force_refresh and not has_user_input:
        cached = _fetch_cached_advice(participant_id, week_no)
        if cached:
            cached_json = cached.get("advice_json")
            structured = (
                cached_json
                if isinstance(cached_json, dict)
                else _parse_advice_json(str(cached.get("advice_md") or ""))
            )
            _mark_advice_success()  # BE-3
            return (
                jsonify(
                    _advice_payload(
                        structured,
                        str(cached.get("advice_md") or _build_advice_md(structured)),
                        week_no,
                        cached=True,
                        model=cached.get("model"),
                    )
                ),
                200,
            )

    user_content = _build_user_content(
        participant,
        logs,
        start_date,
        end_date,
        user_context=user_context,
        advice_style=advice_style,
        advice_goal=advice_goal,
    )

    try:
        structured = _call_grok(user_content)
    except RuntimeError as e:
        logger.error("Grok config/runtime error: %s", e)
        return jsonify({"error": "AI service not configured"}), 500
    except requests.RequestException as e:
        logger.exception("Grok call failed: %s", e)
        return jsonify({"error": "AI service unavailable"}), 502

    advice_md = _build_advice_md(structured)

    # 사용자 추가 입력이 있는 응답은 *개인 맞춤* 이므로 공용 캐시에 저장하지 않는다.
    # (캐시는 항상 일반 조언만 담아 다른 친구가 열었을 때 일관되게.)
    if not has_user_input:
        _store_advice(participant_id, week_no, advice_md, structured)

    _mark_advice_success()  # BE-3
    return jsonify(_advice_payload(structured, advice_md, week_no, cached=False, model=XAI_MODEL)), 200


@bp.route("/ai/health", methods=["GET"])
def ai_health():
    """설정 여부만 빠르게 확인하는 헬스 체크 (실제 호출 X)."""
    supabase_url, supabase_key = _get_supabase_config()
    return jsonify({
        "supabase_configured": bool(supabase_url and supabase_key),
        "xai_configured": bool(os.environ.get("XAI_API_KEY")),
        "model": XAI_MODEL,
        "prompt_version": PROMPT_VERSION,
        # BE-1: 부팅 시 모델 가용성 검증 결과.
        "model_validated": _model_validated,
        "active_model": _active_model,
        # BE-3: 마지막 AI 조언 성공 응답 시각 (없으면 null).
        "last_advice_success_at": (
            _last_advice_success_at.isoformat() if _last_advice_success_at else None
        ),
    }), 200


@bp.route("/ai/debug", methods=["GET"])
def ai_debug():
    """Supabase 연결 실제 테스트. 배포 후 원인 파악용으로만 사용."""
    supabase_url, supabase_key = _get_supabase_config()
    if not supabase_url or not supabase_key:
        return jsonify({"ok": False, "error": "Supabase env vars not set"}), 500

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json",
    }
    try:
        resp = requests.get(
            f"{supabase_url}/rest/v1/participants",
            params={"select": "id", "limit": "1"},
            headers=headers,
            timeout=10,
        )
        # weekly_ai_advice 캐시 테이블 존재 여부도 함께 확인.
        cache_resp = requests.get(
            f"{supabase_url}/rest/v1/weekly_ai_advice",
            params={"select": "id", "limit": "1"},
            headers=headers,
            timeout=10,
        )
        return jsonify({
            "ok": resp.ok,
            "supabase_status": resp.status_code,
            "weekly_ai_advice_status": cache_resp.status_code,
            "weekly_ai_advice_ready": cache_resp.ok,
            "supabase_url_host": supabase_url.split("//")[-1].split(".")[0] + ".supabase.co (masked)",
            "supabase_body_preview": (resp.text or "")[:300],
        }), 200
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502


# BE-1: 모듈 로드 시점에 1회 모델 검증 실행.
_validate_model()
