"""사용자 PT 선호 설정 라우트.

GET  /api/me/preferences  -> 현재 선호 (없으면 기본값 객체).
PUT  /api/me/preferences  -> 선호 저장/갱신.
"""

import json

from flask import Blueprint, request, jsonify, current_app

from config.database import db
from models.preference import UserPreferences


bp = Blueprint('preferences', __name__, url_prefix='/api')


def get_user_id_from_session_or_cookies():
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


VALID_DIFFICULTIES = {'beginner', 'intermediate', 'advanced'}


def _coerce_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return [str(v).strip() for v in data if str(v).strip()]
        except (TypeError, ValueError):
            pass
    return []


def _serialize(pref: UserPreferences | None) -> dict:
    if pref is not None:
        return pref.to_dict()
    payload = UserPreferences.default_payload()
    return {
        'id': None,
        'user_id': None,
        **payload,
        'created_at': None,
        'updated_at': None,
    }


@bp.route('/me/preferences', methods=['GET'])
def get_preferences():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401

    pref = UserPreferences.query.filter_by(user_id=user_id).first()
    return jsonify(_serialize(pref)), 200


@bp.route('/me/preferences', methods=['PUT', 'POST'])
def upsert_preferences():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401

    body = request.get_json(silent=True) or {}

    goals = _coerce_list(body.get('goals'))
    equipment = _coerce_list(body.get('equipment'))
    available_minutes = body.get('available_minutes')
    difficulty = (body.get('difficulty') or '').strip() or None
    push_time = (body.get('push_time') or '').strip() or None
    timezone = (body.get('timezone') or '').strip() or None
    push_enabled = body.get('push_enabled')

    try:
        if available_minutes is not None:
            available_minutes = int(available_minutes)
            if available_minutes <= 0 or available_minutes > 240:
                return jsonify({'message': 'available_minutes 값이 유효하지 않습니다 (1~240)'}), 400
    except (TypeError, ValueError):
        return jsonify({'message': 'available_minutes는 정수여야 합니다'}), 400

    if difficulty and difficulty not in VALID_DIFFICULTIES:
        return jsonify({'message': f"difficulty는 {sorted(VALID_DIFFICULTIES)} 중 하나여야 합니다"}), 400

    if push_time and (len(push_time) != 5 or push_time[2] != ':'):
        return jsonify({'message': 'push_time은 HH:MM 형식이어야 합니다'}), 400

    try:
        pref = UserPreferences.query.filter_by(user_id=user_id).first()
        if pref is None:
            pref = UserPreferences(user_id=user_id)
            db.session.add(pref)

        if 'goals' in body:
            pref.goals = json.dumps(goals, ensure_ascii=False)
        if 'equipment' in body:
            pref.equipment = json.dumps(equipment, ensure_ascii=False)
        if available_minutes is not None:
            pref.available_minutes = available_minutes
        if difficulty:
            pref.difficulty = difficulty
        if push_time:
            pref.push_time = push_time
        if timezone:
            pref.timezone = timezone
        if push_enabled is not None:
            pref.push_enabled = bool(push_enabled)

        db.session.commit()
        return jsonify(pref.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('upsert_preferences error: %s', e)
        return jsonify({'message': '선호 저장 중 오류가 발생했습니다'}), 500
