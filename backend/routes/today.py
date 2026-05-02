"""오늘의 WOD 라우트.

GET  /api/today              -> 오늘 배정 조회 (없으면 생성)
POST /api/today/refresh      -> "다른 추천" — 일 N회 한도
POST /api/today/complete     -> 완료 마킹 + workout_records INSERT
POST /api/today/skip         -> 스킵 마킹
POST /api/today/feedback     -> easy/hard 피드백 (Phase 4)
"""

from datetime import datetime

from flask import Blueprint, request, jsonify, current_app

from config.database import db
from models.daily_assignment import DailyAssignments
from models.workout_record import WorkoutRecords
from models.preference import UserPreferences
from routes.recommendations import (
    generate_recommendation,
    DAILY_REFRESH_LIMIT,
    _today_for_user,
)


bp = Blueprint('today', __name__, url_prefix='/api/today')


def get_user_id_from_session_or_cookies():
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


def _serialize_assignment(a: DailyAssignments) -> dict:
    payload = a.to_dict(include_program=True)
    payload['daily_refresh_limit'] = DAILY_REFRESH_LIMIT
    payload['can_refresh'] = (a.refresh_count or 0) < DAILY_REFRESH_LIMIT
    return payload


@bp.route('', methods=['GET'])
@bp.route('/', methods=['GET'])
def get_today():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    try:
        assignment = generate_recommendation(user_id)
        return jsonify(_serialize_assignment(assignment)), 200
    except Exception as e:
        current_app.logger.exception('get_today error: %s', e)
        return jsonify({'message': '오늘의 추천을 가져오는 중 오류가 발생했습니다'}), 500


@bp.route('/refresh', methods=['POST'])
def refresh_today():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401

    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    today = _today_for_user(pref)
    existing = (
        DailyAssignments.query.filter_by(user_id=user_id, assignment_date=today).first()
    )
    if existing is not None and (existing.refresh_count or 0) >= DAILY_REFRESH_LIMIT:
        return jsonify({
            'message': f'오늘은 추천 새로받기 한도({DAILY_REFRESH_LIMIT}회)를 초과했습니다.',
            'limit': DAILY_REFRESH_LIMIT,
            'refresh_count': existing.refresh_count or 0,
        }), 429

    try:
        assignment = generate_recommendation(user_id, today=today, force_refresh=True)
        return jsonify(_serialize_assignment(assignment)), 200
    except Exception as e:
        current_app.logger.exception('refresh_today error: %s', e)
        return jsonify({'message': '추천 새로받기 중 오류가 발생했습니다'}), 500


@bp.route('/complete', methods=['POST'])
def complete_today():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401

    body = request.get_json(silent=True) or {}
    completion_time = body.get('completion_time')
    notes = body.get('notes') or ''

    if completion_time is None:
        return jsonify({'message': 'completion_time(초)이 필요합니다'}), 400
    try:
        completion_time = int(completion_time)
        if completion_time <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'message': 'completion_time은 양의 정수(초)여야 합니다'}), 400

    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    today = _today_for_user(pref)
    assignment = (
        DailyAssignments.query.filter_by(user_id=user_id, assignment_date=today).first()
    )
    if assignment is None or assignment.program_id is None:
        return jsonify({'message': '오늘의 배정 WOD가 없습니다'}), 404

    try:
        assignment.completed_at = datetime.utcnow()
        assignment.skipped_at = None

        # workout_records INSERT (기존 기록 시스템과 호환)
        record = WorkoutRecords(
            program_id=assignment.program_id,
            user_id=user_id,
            completion_time=completion_time,
            notes=notes,
            is_public=False,
            completed_at=datetime.utcnow(),
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({
            'message': '완료 기록이 저장되었습니다',
            'record_id': record.id,
            'assignment': _serialize_assignment(assignment),
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('complete_today error: %s', e)
        return jsonify({'message': '완료 기록 중 오류가 발생했습니다'}), 500


@bp.route('/skip', methods=['POST'])
def skip_today():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401

    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    today = _today_for_user(pref)
    assignment = (
        DailyAssignments.query.filter_by(user_id=user_id, assignment_date=today).first()
    )
    if assignment is None:
        return jsonify({'message': '오늘의 배정 WOD가 없습니다'}), 404
    try:
        assignment.skipped_at = datetime.utcnow()
        feedback = assignment.feedback_dict()
        feedback['user_feedback'] = 'skip'
        assignment.set_feedback(feedback)
        db.session.commit()
        return jsonify({
            'message': '오늘은 건너뛰셨습니다. 내일 다시 시도해주세요.',
            'assignment': _serialize_assignment(assignment),
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('skip_today error: %s', e)
        return jsonify({'message': '건너뛰기 처리 중 오류가 발생했습니다'}), 500


@bp.route('/feedback', methods=['POST'])
def feedback_today():
    """easy / hard / skip 등 사용자 피드백 저장."""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    body = request.get_json(silent=True) or {}
    rating = (body.get('rating') or '').strip().lower()
    if rating not in {'easy', 'moderate', 'hard'}:
        return jsonify({'message': "rating은 'easy' | 'moderate' | 'hard' 중 하나여야 합니다"}), 400

    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    today = _today_for_user(pref)
    assignment = (
        DailyAssignments.query.filter_by(user_id=user_id, assignment_date=today).first()
    )
    if assignment is None:
        return jsonify({'message': '오늘의 배정 WOD가 없습니다'}), 404
    try:
        feedback = assignment.feedback_dict()
        feedback['user_feedback'] = rating
        assignment.set_feedback(feedback)
        db.session.commit()
        return jsonify({'message': '피드백이 저장되었습니다', 'assignment': _serialize_assignment(assignment)}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('feedback_today error: %s', e)
        return jsonify({'message': '피드백 저장 중 오류가 발생했습니다'}), 500
