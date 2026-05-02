"""푸시 토큰 등록/해제 라우트.

POST   /api/me/push-tokens         { platform, token, app_version? }
DELETE /api/me/push-tokens/<id>    토큰 비활성화
GET    /api/me/push-tokens         자기 디바이스 목록 (preview only)
"""

from datetime import datetime

from flask import Blueprint, request, jsonify, current_app

from config.database import db
from models.push_token import PushTokens


bp = Blueprint('push', __name__, url_prefix='/api/me')


VALID_PLATFORMS = {'ios', 'android', 'web'}


def get_user_id_from_session_or_cookies():
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


@bp.route('/push-tokens', methods=['GET'])
def list_push_tokens():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    tokens = (
        PushTokens.query.filter_by(user_id=user_id, is_active=True)
        .order_by(PushTokens.last_seen_at.desc().nullslast())
        .all()
    )
    return jsonify({'tokens': [t.to_dict() for t in tokens]}), 200


@bp.route('/push-tokens', methods=['POST'])
def register_push_token():
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    body = request.get_json(silent=True) or {}
    platform = (body.get('platform') or '').strip().lower()
    token = (body.get('token') or '').strip()
    app_version = (body.get('app_version') or '').strip() or None

    if platform not in VALID_PLATFORMS:
        return jsonify({'message': f"platform은 {sorted(VALID_PLATFORMS)} 중 하나여야 합니다"}), 400
    if not token or len(token) < 8:
        return jsonify({'message': '유효한 token이 필요합니다'}), 400

    try:
        existing = PushTokens.query.filter_by(user_id=user_id, token=token).first()
        if existing is None:
            existing = PushTokens(
                user_id=user_id,
                platform=platform,
                token=token,
                app_version=app_version,
                is_active=True,
            )
            db.session.add(existing)
        else:
            existing.platform = platform
            existing.app_version = app_version or existing.app_version
            existing.is_active = True
            existing.touch()
        db.session.commit()
        return jsonify({'message': '푸시 토큰이 등록되었습니다', 'token': existing.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('register_push_token error: %s', e)
        return jsonify({'message': '푸시 토큰 등록 중 오류가 발생했습니다'}), 500


@bp.route('/push-tokens/<int:token_id>', methods=['DELETE'])
def deactivate_push_token(token_id: int):
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    pt = PushTokens.query.filter_by(id=token_id, user_id=user_id).first()
    if pt is None:
        return jsonify({'message': '토큰을 찾을 수 없습니다'}), 404
    try:
        pt.is_active = False
        pt.last_seen_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': '푸시 토큰이 비활성화되었습니다'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('deactivate_push_token error: %s', e)
        return jsonify({'message': '푸시 토큰 비활성화 중 오류가 발생했습니다'}), 500
