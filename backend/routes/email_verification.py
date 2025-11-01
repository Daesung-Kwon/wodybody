"""이메일 인증 관련 라우트 (회원가입용)"""

from flask import Blueprint, request, jsonify
from models.user import Users
from models.email_verification import EmailVerification
from config.database import db
from utils.email import send_verification_code

# 블루프린트 생성
bp = Blueprint('email_verification', __name__, url_prefix='/api/email-verification')

@bp.route('/request', methods=['POST'])
def request_verification():
    """이메일 인증번호 전송 (회원가입용)"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        
        if not email:
            return jsonify({'message': '이메일을 입력해주세요.'}), 400
        
        # 이메일 형식 검증
        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({'message': '올바른 이메일 형식을 입력해주세요.'}), 400
        
        # 이미 가입된 이메일인지 확인
        existing_user = Users.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'message': '이미 등록된 이메일입니다.'}), 409
        
        # 기존 미사용 인증번호가 있으면 모두 만료 처리
        existing_verifications = EmailVerification.query.filter_by(
            email=email,
            is_used=False
        ).all()
        for verification in existing_verifications:
            verification.mark_as_used()
        
        # 새 인증번호 생성
        email_verification = EmailVerification(email=email)
        db.session.add(email_verification)
        db.session.commit()
        
        # 이메일 전송
        success, message = send_verification_code(
            email, 
            email_verification.verification_code,
            user_name=''  # 회원가입이므로 이름이 없음
        )
        
        if not success:
            # 이메일 전송 실패시 생성된 인증번호 삭제
            db.session.delete(email_verification)
            db.session.commit()
            return jsonify({'message': message}), 500
        
        from flask import current_app
        current_app.logger.info(f'회원가입 이메일 인증 요청: {email} (코드: {email_verification.verification_code})')
        
        return jsonify({
            'message': '인증번호가 이메일로 전송되었습니다. (10분간 유효)',
            'email': email
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('email_verification_request error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '인증번호 전송 중 오류가 발생했습니다.'}), 500

@bp.route('/verify', methods=['POST'])
def verify_code():
    """인증번호 확인 (회원가입용)"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        code = (data.get('code') or '').strip()
        
        if not email or not code:
            return jsonify({'message': '이메일과 인증번호를 입력해주세요.'}), 400
        
        # 최신 인증번호 조회
        email_verification = EmailVerification.query.filter_by(
            email=email,
            is_used=False
        ).order_by(EmailVerification.created_at.desc()).first()
        
        if not email_verification:
            return jsonify({'message': '유효한 인증번호 요청이 없습니다.'}), 404
        
        # 인증번호 확인
        success, message = email_verification.verify_code(code)
        if not success:
            return jsonify({'message': message}), 400
        
        # 인증 완료 표시
        email_verification.mark_as_verified()
        db.session.commit()
        
        from flask import current_app
        current_app.logger.info(f'회원가입 이메일 인증 성공: {email}')
        
        return jsonify({
            'message': '인증이 완료되었습니다.',
            'verified': True,
            'verification_id': email_verification.id  # 회원가입 시 사용
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('email_verification_verify error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '인증번호 확인 중 오류가 발생했습니다.'}), 500

