"""비밀번호 재설정 관련 라우트"""

from flask import Blueprint, request, jsonify
from models.user import Users
from models.password_reset import PasswordReset
from config.database import db
from utils.email import send_verification_code, send_password_changed_notification
from datetime import datetime

# 블루프린트 생성
bp = Blueprint('password_reset', __name__, url_prefix='/api/password-reset')

@bp.route('/request', methods=['POST'])
def request_password_reset():
    """비밀번호 재설정 요청 (인증번호 이메일 전송)"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        
        if not email:
            return jsonify({'message': '이메일을 입력해주세요.'}), 400
        
        # 사용자 확인
        user = Users.query.filter_by(email=email).first()
        if not user:
            # 보안상 사용자가 존재하지 않아도 동일한 응답 반환
            return jsonify({
                'message': '인증번호가 이메일로 전송되었습니다. (10분간 유효)',
                'email': email
            }), 200
        
        # 기존 미사용 인증번호가 있으면 모두 만료 처리
        existing_resets = PasswordReset.query.filter_by(
            user_id=user.id,
            is_used=False
        ).all()
        for reset in existing_resets:
            reset.mark_as_used()
        
        # 새 인증번호 생성
        password_reset = PasswordReset(user_id=user.id, email=email)
        db.session.add(password_reset)
        db.session.commit()
        
        # 이메일 전송
        success, message = send_verification_code(
            email, 
            password_reset.verification_code,
            user.name
        )
        
        if not success:
            # 이메일 전송 실패시 생성된 인증번호 삭제
            db.session.delete(password_reset)
            db.session.commit()
            return jsonify({'message': message}), 500
        
        from flask import current_app
        current_app.logger.info(f'비밀번호 재설정 요청: {email} (코드: {password_reset.verification_code})')
        
        return jsonify({
            'message': '인증번호가 이메일로 전송되었습니다. (10분간 유효)',
            'email': email
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('password_reset_request error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '비밀번호 재설정 요청 처리 중 오류가 발생했습니다.'}), 500

@bp.route('/verify', methods=['POST'])
def verify_code():
    """인증번호 확인"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        code = (data.get('code') or '').strip()
        
        if not email or not code:
            return jsonify({'message': '이메일과 인증번호를 입력해주세요.'}), 400
        
        # 사용자 확인
        user = Users.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': '등록되지 않은 이메일입니다.'}), 404
        
        # 최신 인증번호 조회
        password_reset = PasswordReset.query.filter_by(
            user_id=user.id,
            email=email,
            is_used=False
        ).order_by(PasswordReset.created_at.desc()).first()
        
        if not password_reset:
            return jsonify({'message': '유효한 인증번호 요청이 없습니다.'}), 404
        
        # 인증번호 확인
        success, message = password_reset.verify_code(code)
        if not success:
            return jsonify({'message': message}), 400
        
        # 인증 완료 표시
        password_reset.mark_as_verified()
        db.session.commit()
        
        from flask import current_app
        current_app.logger.info(f'인증번호 확인 성공: {email}')
        
        return jsonify({
            'message': '인증이 완료되었습니다.',
            'verified': True,
            'reset_id': password_reset.id  # 비밀번호 재설정 시 사용
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('verify_code error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '인증번호 확인 중 오류가 발생했습니다.'}), 500

@bp.route('/reset', methods=['POST'])
def reset_password():
    """비밀번호 재설정 (인증 완료 후)"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        reset_id = data.get('reset_id')
        new_password = data.get('new_password') or ''
        
        if not email or not reset_id or not new_password:
            return jsonify({'message': '필수 정보가 누락되었습니다.'}), 400
        
        # 비밀번호 유효성 검사
        if len(new_password) < 8:
            return jsonify({'message': '비밀번호는 최소 8자 이상이어야 합니다.'}), 400
        
        # 사용자 확인
        user = Users.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': '등록되지 않은 이메일입니다.'}), 404
        
        # 인증번호 확인
        password_reset = PasswordReset.query.filter_by(
            id=reset_id,
            user_id=user.id,
            email=email,
            is_used=False
        ).first()
        
        if not password_reset:
            return jsonify({'message': '유효하지 않은 재설정 요청입니다.'}), 404
        
        # 인증 완료 여부 확인
        if not password_reset.verified_at:
            return jsonify({'message': '인증번호를 먼저 확인해주세요.'}), 400
        
        # 만료 확인
        if password_reset.is_expired():
            return jsonify({'message': '인증번호가 만료되었습니다. 다시 시도해주세요.'}), 400
        
        # 비밀번호 업데이트
        user.set_password(new_password)
        user.last_login_at = datetime.utcnow()
        
        # 재설정 요청 사용 완료 표시
        password_reset.mark_as_used()
        
        db.session.commit()
        
        # 비밀번호 변경 알림 이메일 전송 (비동기로 처리하면 더 좋음)
        try:
            send_password_changed_notification(email, user.name)
        except Exception as email_error:
            # 알림 이메일 실패는 무시 (비밀번호는 이미 변경됨)
            from flask import current_app
            current_app.logger.error(f'비밀번호 변경 알림 이메일 전송 실패: {email_error}')
        
        from flask import current_app
        current_app.logger.info(f'비밀번호 재설정 완료: {email}')
        
        return jsonify({
            'message': '비밀번호가 성공적으로 변경되었습니다.',
            'success': True
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('reset_password error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '비밀번호 재설정 중 오류가 발생했습니다.'}), 500

@bp.route('/check-status', methods=['POST'])
def check_reset_status():
    """재설정 요청 상태 확인 (디버깅용)"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        
        if not email:
            return jsonify({'message': '이메일을 입력해주세요.'}), 400
        
        user = Users.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': '등록되지 않은 이메일입니다.'}), 404
        
        # 최신 재설정 요청 조회
        recent_resets = PasswordReset.query.filter_by(
            user_id=user.id,
            email=email
        ).order_by(PasswordReset.created_at.desc()).limit(5).all()
        
        reset_list = []
        for reset in recent_resets:
            reset_list.append({
                'id': reset.id,
                'created_at': reset.created_at.isoformat() if reset.created_at else None,
                'expires_at': reset.expires_at.isoformat() if reset.expires_at else None,
                'is_expired': reset.is_expired(),
                'is_used': reset.is_used,
                'verified_at': reset.verified_at.isoformat() if reset.verified_at else None
            })
        
        return jsonify({
            'email': email,
            'user_id': user.id,
            'recent_resets': reset_list
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('check_reset_status error: %s', str(e))
        return jsonify({'message': '상태 확인 중 오류가 발생했습니다.'}), 500

