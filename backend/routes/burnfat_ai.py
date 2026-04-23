"""
BurnFat AI 조언 - Grok (xAI) 프록시 엔드포인트.

- Supabase REST API를 통해 참가자/주간 기록/챌린지 정보 조회
- xAI Grok API (OpenAI 호환)로 조언 생성
- CORS: 전역 CORS 설정(app.py)이 /api/* 에 적용되므로 별도 처리 불필요
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests
from flask import Blueprint, jsonify, request

bp = Blueprint("burnfat_ai", __name__, url_prefix="/api/burnfat")

logger = logging.getLogger(__name__)

XAI_API_URL = "https://api.x.ai/v1/chat/completions"
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-4-1-fast-non-reasoning")
XAI_MAX_TOKENS = int(os.environ.get("XAI_MAX_TOKENS", "500"))
XAI_TIMEOUT_SECONDS = int(os.environ.get("XAI_TIMEOUT_SECONDS", "30"))

SYSTEM_PROMPT = """당신은 체지방 감량 다이어트 전문 코치입니다.
참가자의 주간 데이터(체지방률, 몸무게, 운동 횟수, 수면 시간, 식단 패턴 등)를 분석하여
데이터에 근거한 개인화된 감량 전략을 제시하세요.

## 분석 지침
1. 주차별 추이를 반드시 분석하세요.
   - 어떤 주가 가장 효과적이었고, 그때의 운동·수면·식단 패턴이 무엇이었는지 구체적으로 언급하세요.
   - 체지방이 정체되거나 증가한 주가 있다면, 같은 주의 수면·식단·운동 데이터에서 원인을 찾으세요.
2. 기록된 데이터만 분석에 사용하세요.
   - 운동 횟수가 기록된 경우 → 빈도와 체지방 변화의 상관관계를 언급하세요.
   - 수면 시간이 기록된 경우 → 6시간 미만이면 코르티솔 상승으로 지방 분해 저해 가능성을 구체적으로 언급하세요.
   - 식단 패턴이 기록된 경우 → 과식/절식 주와 체중·체지방 변화를 연결하여 분석하세요.
3. 반드시 이번 주에 실천할 구체적인 행동 1~2가지를 숫자와 함께 제시하세요.
   예) "이번 주는 운동 4회 + 수면 7시간 확보를 목표로 하세요."

## 출력 형식
- 3~5문장으로 작성하세요.
- 첫 문장에서 전체 추이를 한 줄로 요약하세요.
- 일반적인 조언("단백질을 먹어라", "운동하라")만 반복하지 마세요.
  반드시 실제 기록 수치를 인용해서 말하세요.
- 마지막 문장은 이번 주 실천 행동으로 끝내세요.
- 반드시 한국어로 답변하세요.

## 체지방 변화 판단 기준
- 주 0.3~0.5%p 감소: 이상적인 속도 (유지 권장)
- 0.5%p 초과 감소: 근손실 주의 — 단백질·칼로리 섭취 점검 권유
- 변화 없거나 증가: 수분·호르몬·주기 요인 OR 식단·운동 패턴 재점검
- 수면 6시간 미만: 코르티솔 상승 → 지방 분해 저해 — 수면 회복 최우선 권유
- 운동 2회 이하: 횟수 증가 또는 강도 조정 제안
- 과식 주간: 같은 주의 체중·체지방 변화와 함께 해석하여 피드백"""


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

    return (
        f"참가자: {participant.get('nickname', '')}\n"
        f"기본정보: {age_str}, {gender_str}, {target_str}\n"
        f"대결 기간: {start_date} ~ {end_date}\n\n"
        f"주간 기록:\n{logs_summary}\n\n"
        "위 데이터를 바탕으로 맞춤 조언을 해주세요."
    )


def _call_grok(user_content: str) -> str:
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
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        XAI_API_URL, json=payload, headers=headers, timeout=XAI_TIMEOUT_SECONDS
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
    return content


@bp.route("/ai/advice", methods=["POST", "OPTIONS"])
def ai_advice():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(silent=True) or {}
    participant_id = body.get("participant_id")
    if not participant_id:
        return jsonify({"error": "participant_id required"}), 400

    try:
        participant = _fetch_participant(str(participant_id))
    except RuntimeError as e:
        logger.error("Supabase config error: %s", e)
        return jsonify({"error": "Supabase not configured"}), 500
    except requests.RequestException as e:
        logger.exception("Supabase fetch failed: %s", e)
        return jsonify({"error": "Failed to fetch participant"}), 502

    if not participant:
        return jsonify({"error": "Participant not found"}), 404

    try:
        logs = _fetch_weekly_logs(str(participant_id))
        start_date, end_date = _fetch_challenge_dates(participant.get("challenge_id"))
    except requests.RequestException as e:
        logger.exception("Supabase fetch (logs/challenge) failed: %s", e)
        return jsonify({"error": "Failed to fetch supporting data"}), 502

    user_content = _build_user_content(participant, logs, start_date, end_date)

    try:
        advice = _call_grok(user_content)
    except RuntimeError as e:
        logger.error("Grok config/runtime error: %s", e)
        return jsonify({"error": "AI service not configured"}), 500
    except requests.RequestException as e:
        logger.exception("Grok call failed: %s", e)
        return jsonify({"error": "AI service unavailable"}), 502

    return jsonify({"advice": advice}), 200


@bp.route("/ai/health", methods=["GET"])
def ai_health():
    """설정 여부만 빠르게 확인하는 헬스 체크 (실제 호출 X)."""
    supabase_url, supabase_key = _get_supabase_config()
    return jsonify({
        "supabase_configured": bool(supabase_url and supabase_key),
        "xai_configured": bool(os.environ.get("XAI_API_KEY")),
        "model": XAI_MODEL,
    }), 200


@bp.route("/ai/debug", methods=["GET"])
def ai_debug():
    """Supabase 연결 실제 테스트. 배포 후 원인 파악용으로만 사용."""
    supabase_url, supabase_key = _get_supabase_config()
    if not supabase_url or not supabase_key:
        return jsonify({"ok": False, "error": "Supabase env vars not set"}), 500

    # 실제 REST 요청 (participants 1건만)
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
        return jsonify({
            "ok": resp.ok,
            "supabase_status": resp.status_code,
            "supabase_url_host": supabase_url.split("//")[-1].split(".")[0] + ".supabase.co (masked)",
            "supabase_body_preview": (resp.text or "")[:300],
        }), 200
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502
