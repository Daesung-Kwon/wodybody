"""Grok 기반 일일 WOD 추천 엔진.

- 외부 API: xAI Grok (OpenAI 호환 chat/completions). burnfat_ai.py 의 호출 패턴을 재사용.
- 캐싱: (user_id, assignment_date) 단위로 daily_assignments 테이블에 1행.
- 라우트:
    POST /api/recommendations/generate  (내부/디버그용)
"""

from __future__ import annotations

import json
import logging
import os
import random
from datetime import date as date_cls, datetime, timedelta
from typing import Any

import requests
from flask import Blueprint, jsonify, request, current_app

from config.database import db
from utils.auth import get_current_user_id as get_user_id_from_session_or_cookies
from routes.xai_consent import request_has_xai_consent
from models.daily_assignment import DailyAssignments
from models.preference import UserPreferences
from models.program import Programs
from models.workout_record import WorkoutRecords
from models.exercise import WorkoutPatterns


bp = Blueprint('recommendations', __name__, url_prefix='/api')

logger = logging.getLogger(__name__)

XAI_API_URL = "https://api.x.ai/v1/chat/completions"
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-4-1-fast-non-reasoning")
XAI_MAX_TOKENS = int(os.environ.get("XAI_MAX_TOKENS_RECOMMEND", "300"))
XAI_TIMEOUT_SECONDS = int(os.environ.get("XAI_TIMEOUT_SECONDS", "30"))

DAILY_REFRESH_LIMIT = int(os.environ.get('PT_DAILY_REFRESH_LIMIT', '3'))
CANDIDATE_POOL_LIMIT = int(os.environ.get('PT_CANDIDATE_POOL_LIMIT', '30'))


SYSTEM_PROMPT = """당신은 사용자에게 매일 1개의 크로스핏식 WOD를 추천하는 코치입니다.
난이도, 기구, 운동 기록(완료 여부·시간·날짜·프로그램 id)과 후보 id만 보고
오늘 가장 적합한 WOD 하나를 program_id로 지정하세요.

닉네임, 사진, 체지방, 나이, 성별, 몸무게, 이메일, 자유 텍스트 목표, 프로그램 제목,
운동 이름은 주어지지 않습니다. 없는 이름을 만들지 마세요.

## 선택 원칙
1. preferences.equipment에 없는 기구가 메인이면 후보에서 제외하세요. 기구 태그가 없으면 id와 난이도만 보세요.
2. preferences.available_minutes의 ±25% 범위에 들어오는 WOD를 우선합니다.
3. preferences.difficulty와 일치 또는 한 단계 차이만 허용.
4. 직전 7일에 이미 추천된 program_id는 절대 다시 고르지 마세요.
5. recent_records로 보아 평균 완료 시간이 목표 시간보다 짧다면 난이도를 한 단계 올리고,
   길거나 스킵이 많다면 한 단계 내리세요.
6. user_feedback이 "easy"면 강도를 올리고, "hard" 또는 "skip"이면 회복 강도로 추천.
   그 외 문장은 오지 않습니다.
7. 후보가 부족하거나 모두 부적합하면 program_id를 null로 반환하고
   rationale에 그 이유를 한국어 1문장으로 적으세요.

## 출력 형식 (반드시 JSON 한 줄만)
{
  "program_id": <number | null>,
  "rationale": "<한국어 1~2문장>",
  "intensity_hint": "<easy|moderate|hard>",
  "duration_estimate_minutes": <number>
}

규칙:
- 반드시 JSON 객체 하나만 출력. 마크다운/설명/코드 블록 금지.
- rationale은 사용자가 운동 직전에 읽을 톤(친근하고 실용적).
"""


# --------------------------------------------------------------------
# 컨텍스트 빌더
# --------------------------------------------------------------------


def _today_for_user(pref: UserPreferences | None) -> date_cls:
    """사용자 timezone 기준 오늘 날짜."""
    try:
        import pytz
        tz = pytz.timezone(pref.timezone if (pref and pref.timezone) else 'Asia/Seoul')
        return datetime.now(tz).date()
    except Exception:
        return date_cls.today()


def _serialize_program(p: Programs) -> dict[str, Any]:
    """Grok에 전달할 후보. 제목·운동 이름은 이용자가 지은 값일 수 있어 보내지 않는다."""
    pattern = WorkoutPatterns.query.filter_by(program_id=p.id).first()
    expected_minutes = None
    pattern_type = None
    total_rounds = None
    if pattern is not None:
        pattern_type = pattern.pattern_type
        total_rounds = pattern.total_rounds
        if pattern.time_cap_per_round and pattern.total_rounds:
            expected_minutes = pattern.time_cap_per_round * pattern.total_rounds
        elif pattern.time_cap_per_round:
            expected_minutes = pattern.time_cap_per_round

    return {
        'id': p.id,
        'difficulty': p.difficulty,
        'pattern_type': pattern_type,
        'total_rounds': total_rounds,
        'expected_minutes': expected_minutes,
    }


_FEEDBACK_OK = {'easy', 'ok', 'moderate', 'hard', 'skip'}
_INTENSITY_OK = {'easy', 'moderate', 'hard'}


def minimize_wod_context(context: dict[str, Any]) -> dict[str, Any]:
    """xAI 로 나가기 직전 허용 필드만 남긴다. 제목·운동명·goals·자유 피드백은 제거."""
    prefs = context.get('preferences') if isinstance(context.get('preferences'), dict) else {}
    equipment = prefs.get('equipment') or []
    if not isinstance(equipment, list):
        equipment = []
    equipment_out = [str(item) for item in equipment if isinstance(item, (str, int, float))][:20]

    assignments = []
    for row in context.get('recent_assignments') or []:
        if not isinstance(row, dict):
            continue
        raw_fb = row.get('user_feedback')
        feedback = raw_fb.strip().lower() if isinstance(raw_fb, str) else None
        if feedback not in _FEEDBACK_OK:
            feedback = None
        hint = row.get('intensity_hint')
        if hint not in _INTENSITY_OK:
            hint = None
        assignments.append({
            'date': row.get('date'),
            'program_id': row.get('program_id'),
            'completed': bool(row.get('completed')),
            'skipped': bool(row.get('skipped')),
            'user_feedback': feedback,
            'intensity_hint': hint,
        })

    programs = []
    for row in context.get('available_programs') or []:
        if not isinstance(row, dict):
            continue
        programs.append({
            'id': row.get('id'),
            'difficulty': row.get('difficulty'),
            'expected_minutes': row.get('expected_minutes'),
        })

    summary = context.get('recent_records_summary') if isinstance(context.get('recent_records_summary'), dict) else {}
    last5 = []
    for row in summary.get('last_5_records') or []:
        if not isinstance(row, dict):
            continue
        last5.append({
            'date': row.get('date'),
            'program_id': row.get('program_id'),
            'completion_minutes': row.get('completion_minutes'),
        })
    assign_summary = context.get('recent_assignments_summary') if isinstance(context.get('recent_assignments_summary'), dict) else {}

    return {
        'today': context.get('today'),
        'preferences': {
            'difficulty': prefs.get('difficulty'),
            'equipment': equipment_out,
            'available_minutes': prefs.get('available_minutes'),
        },
        'recent_assignments': assignments,
        'recent_assignments_summary': {
            'completed_count_7d': assign_summary.get('completed_count_7d'),
            'skipped_count_7d': assign_summary.get('skipped_count_7d'),
        },
        'recent_records_summary': {
            'count_30d': summary.get('count_30d'),
            'avg_completion_minutes': summary.get('avg_completion_minutes'),
            'last_5_records': last5,
        },
        'available_programs': programs,
    }


def _build_context(
    user_id: int,
    today: date_cls,
    pref: UserPreferences | None,
    candidate_programs: list[Programs],
    recent_assignments: list[DailyAssignments],
    recent_records: list[WorkoutRecords],
) -> dict[str, Any]:
    pref_dict = pref.to_dict() if pref else {
        'goals': UserPreferences.default_payload()['goals'],
        'equipment': UserPreferences.default_payload()['equipment'],
        'available_minutes': UserPreferences.default_payload()['available_minutes'],
        'difficulty': UserPreferences.default_payload()['difficulty'],
    }

    # 직전 5개 기록은 상세, 나머지는 요약 통계로 (토큰 절약).
    detail_records = recent_records[:5]
    record_details = [
        {
            'date': r.completed_at.isoformat() if r.completed_at else None,
            'program_id': r.program_id,
            'completion_minutes': round((r.completion_time or 0) / 60.0, 1),
        }
        for r in detail_records
    ]

    skipped_count = sum(1 for a in recent_assignments if a.skipped_at)
    completed_count = sum(1 for a in recent_assignments if a.completed_at)

    return {
        'today': today.isoformat(),
        'preferences': {
            'equipment': pref_dict.get('equipment', []),
            'available_minutes': pref_dict.get('available_minutes', 20),
            'difficulty': pref_dict.get('difficulty', 'intermediate'),
        },
        'recent_assignments': [
            {
                'date': a.assignment_date.isoformat() if a.assignment_date else None,
                'program_id': a.program_id,
                'completed': bool(a.completed_at),
                'skipped': bool(a.skipped_at),
                'user_feedback': a.feedback_dict().get('user_feedback'),
                'intensity_hint': a.intensity_hint,
            }
            for a in recent_assignments
        ],
        'recent_assignments_summary': {
            'completed_count_7d': completed_count,
            'skipped_count_7d': skipped_count,
        },
        'recent_records_summary': {
            'count_30d': len(recent_records),
            'avg_completion_minutes': round(
                sum((r.completion_time or 0) for r in recent_records) / 60.0
                / max(len(recent_records), 1),
                1,
            ) if recent_records else None,
            'last_5_records': record_details,
        },
        'available_programs': [_serialize_program(p) for p in candidate_programs],
    }


# --------------------------------------------------------------------
# 후보 풀 수집
# --------------------------------------------------------------------


def _collect_candidate_programs(
    user_id: int, exclude_program_ids: set[int]
) -> list[Programs]:
    """사용자 본인 + 공개 풀에서 후보를 모은다."""
    candidates: dict[int, Programs] = {}

    # 1) 사용자 본인이 만든 프로그램
    own = Programs.query.filter_by(creator_id=user_id).limit(CANDIDATE_POOL_LIMIT).all()
    for p in own:
        if p.id not in exclude_program_ids:
            candidates[p.id] = p

    remaining = max(0, CANDIDATE_POOL_LIMIT - len(candidates))
    if remaining > 0:
        # 2) 공개 풀 (마켓플레이스가 deprecate되었지만 데이터는 후보로 사용 가능)
        try:
            opened = (
                Programs.query.filter(
                    Programs.creator_id != user_id,
                    Programs.is_open.is_(True),
                )
                .order_by(Programs.created_at.desc())
                .limit(remaining * 2)
                .all()
            )
        except Exception:
            opened = []
        for p in opened:
            if p.id in exclude_program_ids or p.id in candidates:
                continue
            candidates[p.id] = p
            if len(candidates) >= CANDIDATE_POOL_LIMIT:
                break

    # 3) 그래도 부족하면 전체 프로그램 중 무작위 보충 (콜드스타트)
    if len(candidates) < 5:
        try:
            extras = (
                Programs.query.filter(Programs.creator_id != user_id)
                .order_by(Programs.created_at.desc())
                .limit(CANDIDATE_POOL_LIMIT)
                .all()
            )
        except Exception:
            extras = []
        for p in extras:
            if p.id in exclude_program_ids or p.id in candidates:
                continue
            candidates[p.id] = p
            if len(candidates) >= CANDIDATE_POOL_LIMIT:
                break

    return list(candidates.values())


# --------------------------------------------------------------------
# Grok 호출 + 응답 검증
# --------------------------------------------------------------------


def _call_grok(context: dict[str, Any]) -> dict[str, Any]:
    """Grok 호출. 키 미설정/네트워크 에러는 RuntimeError 또는 RequestException."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("XAI_API_KEY not configured")

    safe_context = minimize_wod_context(context)
    user_content = (
        "다음 컨텍스트를 보고 오늘의 추천을 JSON 한 줄로 반환하세요.\n\n"
        + json.dumps(safe_context, ensure_ascii=False, indent=2)
    )
    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": XAI_MAX_TOKENS,
        "temperature": 0.6,
        "response_format": {"type": "json_object"},
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
    content = ((choices[0].get("message") or {}).get("content") or "").strip()
    if not content:
        raise RuntimeError("Grok response content was empty")

    return _parse_grok_response(content)


def _parse_grok_response(text: str) -> dict[str, Any]:
    """JSON 한 객체를 파싱. 실패 시 빈 딕트 + program_id None."""
    try:
        # 일부 모델이 코드 블록으로 감싸는 경우 제거
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip('`')
            # ``` json {...} ``` 같이 들어오면 첫 줄 제거
            if cleaned.lstrip().lower().startswith('json'):
                cleaned = cleaned.split('\n', 1)[-1]
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            return {}
        return data
    except (TypeError, ValueError):
        return {}


def _fallback_pick(candidates: list[Programs]) -> tuple[int | None, str]:
    if not candidates:
        return None, '오늘 추천할 수 있는 후보 WOD가 부족합니다. 라이브러리에 새 WOD를 추가하거나 잠시 후 다시 시도해 주세요.'
    pick = random.choice(candidates)
    return pick.id, '오늘은 가용 후보 중 무작위로 선정했습니다. 가볍게 몸을 풀어보세요.'


# --------------------------------------------------------------------
# 핵심 엔트리 포인트
# --------------------------------------------------------------------


def generate_recommendation(
    user_id: int,
    today: date_cls | None = None,
    *,
    force_refresh: bool = False,
    allow_xai: bool = False,
) -> DailyAssignments:
    """
    (user_id, today) 행을 반환. 없으면 새로 생성. force_refresh=True면 신규 추천 추가.

    반환: DailyAssignments (commit 완료된 객체).
    """
    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    if today is None:
        today = _today_for_user(pref)

    existing = (
        DailyAssignments.query.filter_by(user_id=user_id, assignment_date=today).first()
    )

    # 캐시 적중
    if existing is not None and not force_refresh:
        return existing

    # 직전 7일 + 기존 같은 날 추천 program_id 모두 anti-repeat에 포함
    cutoff = today - timedelta(days=7)
    history = (
        DailyAssignments.query.filter(
            DailyAssignments.user_id == user_id,
            DailyAssignments.assignment_date >= cutoff,
        )
        .order_by(DailyAssignments.assignment_date.desc())
        .all()
    )
    exclude_ids: set[int] = {a.program_id for a in history if a.program_id}
    if existing is not None and existing.program_id:
        exclude_ids.add(existing.program_id)

    candidates = _collect_candidate_programs(user_id, exclude_ids)
    candidate_id_set = {p.id for p in candidates}

    recent_records = (
        WorkoutRecords.query.filter(
            WorkoutRecords.user_id == user_id,
            WorkoutRecords.completed_at >= datetime.utcnow() - timedelta(days=30),
        )
        .order_by(WorkoutRecords.completed_at.desc())
        .limit(50)
        .all()
    )

    context = _build_context(
        user_id=user_id,
        today=today,
        pref=pref,
        candidate_programs=candidates,
        recent_assignments=history,
        recent_records=recent_records,
    )

    program_id: int | None = None
    rationale = ''
    intensity_hint = 'moderate'
    duration_estimate = (pref.available_minutes if pref and pref.available_minutes else 20)
    source = 'fallback'

    if allow_xai:
        source = 'ai_grok'
        try:
            parsed = _call_grok(context)
            program_id = parsed.get('program_id')
            if isinstance(program_id, str):
                try:
                    program_id = int(program_id)
                except (TypeError, ValueError):
                    program_id = None
            if program_id is not None and program_id not in candidate_id_set:
                current_app.logger.warning(
                    'Grok suggested program_id=%s not in candidate set; falling back', program_id
                )
                program_id = None
            rationale = (parsed.get('rationale') or '').strip()[:300]
            intensity_hint = (parsed.get('intensity_hint') or 'moderate').strip()[:20]
            try:
                duration_estimate = int(parsed.get('duration_estimate_minutes') or duration_estimate)
            except (TypeError, ValueError):
                pass
        except RuntimeError as e:
            current_app.logger.warning('Grok unavailable, using fallback: %s', e)
            source = 'fallback'
        except requests.RequestException as e:
            current_app.logger.warning('Grok request failed, using fallback: %s', e)
            source = 'fallback'
        except Exception as e:
            current_app.logger.exception('Unexpected Grok error: %s', e)
            source = 'fallback'
    else:
        current_app.logger.info('xAI transfer skipped: consent not granted')

    if program_id is None:
        fallback_id, fallback_reason = _fallback_pick(candidates)
        program_id = fallback_id
        if not rationale:
            rationale = fallback_reason
        if source == 'ai_grok':
            source = 'fallback'

    if existing is None:
        existing = DailyAssignments(
            user_id=user_id,
            assignment_date=today,
            program_id=program_id,
            source=source,
            ai_rationale=rationale,
            intensity_hint=intensity_hint,
            duration_estimate_minutes=duration_estimate,
            refresh_count=0,
        )
        db.session.add(existing)
    else:
        # refresh: 직전 program_id를 refused로 마킹
        prev_feedback = existing.feedback_dict()
        prev_feedback['previous_program_ids'] = (
            prev_feedback.get('previous_program_ids', []) + [existing.program_id]
        )
        prev_feedback['user_feedback'] = 'refused'
        existing.set_feedback(prev_feedback)
        existing.program_id = program_id
        existing.source = source
        existing.ai_rationale = rationale
        existing.intensity_hint = intensity_hint
        existing.duration_estimate_minutes = duration_estimate
        existing.refresh_count = (existing.refresh_count or 0) + 1
        existing.completed_at = None
        existing.skipped_at = None

    db.session.commit()
    return existing


# --------------------------------------------------------------------
# 디버그 라우트 (운영 모니터링/테스트용)
# --------------------------------------------------------------------


@bp.route('/recommendations/generate', methods=['POST'])
def recommendations_generate():
    """현재 사용자의 오늘 추천을 생성/조회. 디버그·내부 호출용."""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    body = request.get_json(silent=True) or {}
    force = bool(body.get('force_refresh'))
    try:
        assignment = generate_recommendation(
            user_id, force_refresh=force, allow_xai=request_has_xai_consent()
        )
    except Exception as e:
        current_app.logger.exception('recommendations_generate error: %s', e)
        return jsonify({'message': '추천 생성 중 오류가 발생했습니다'}), 500
    return jsonify(assignment.to_dict(include_program=True)), 200


@bp.route('/recommendations/health', methods=['GET'])
def recommendations_health():
    return jsonify({
        'xai_configured': bool(os.environ.get('XAI_API_KEY')),
        'model': XAI_MODEL,
        'daily_refresh_limit': DAILY_REFRESH_LIMIT,
        'candidate_pool_limit': CANDIDATE_POOL_LIMIT,
    }), 200
