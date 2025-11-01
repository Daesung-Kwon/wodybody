"""인증 관련 라우트"""

from flask import Blueprint, request, jsonify, session
from models.user import Users
from utils.validators import validate_register
from datetime import datetime

# 블루프린트 생성
bp = Blueprint('auth', __name__, url_prefix='/api')

@bp.route('/user/profile', methods=['GET'])
def profile():
    """사용자 프로필 조회"""
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    
    user = Users.query.get(session['user_id'])
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role
    }), 200

@bp.route('/register', methods=['POST'])
def register():
    """회원가입 (이메일 인증 필수)"""
    try:
        data = request.get_json(silent=True)
        error = validate_register(data)
        if error:
            return jsonify({'message': error}), 400
        
        email = data['email'].strip()
        name = data['name'].strip()
        password = data['password']
        verification_id = data.get('verification_id')  # 이메일 인증 ID
        
        # 이메일 인증 확인 (필수)
        if not verification_id:
            return jsonify({'message': '이메일 인증이 필요합니다.'}), 400
        
        from models.email_verification import EmailVerification
        from config.database import db
        
        # 인증번호 확인
        email_verification = EmailVerification.query.filter_by(
            id=verification_id,
            email=email,
            is_used=False
        ).first()
        
        if not email_verification:
            return jsonify({'message': '유효하지 않은 인증 정보입니다.'}), 404
        
        # 인증 완료 여부 확인
        if not email_verification.verified_at:
            return jsonify({'message': '이메일 인증을 먼저 완료해주세요.'}), 400
        
        # 만료 확인
        if email_verification.is_expired():
            return jsonify({'message': '인증번호가 만료되었습니다. 다시 시도해주세요.'}), 400
        
        # 이메일 중복 확인
        if Users.query.filter_by(email=email).first():
            return jsonify({'message': '이미 등록된 이메일입니다'}), 409
        
        # 사용자 생성
        user = Users(email=email, name=name)
        user.set_password(password)
        
        db.session.add(user)
        
        # 인증번호 사용 완료 표시
        email_verification.mark_as_used()
        
        db.session.commit()
        
        from flask import current_app
        current_app.logger.info(f'회원가입 완료: {email} (이름: {name})')
        
        return jsonify({'message': '회원가입이 완료되었습니다'}), 201
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('register error: %s', str(e))
        from config.database import db
        db.session.rollback()
        return jsonify({'message': '회원가입 처리 중 오류가 발생했습니다'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """로그인"""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        password = data.get('password') or ''
        
        if not email or not password:
            return jsonify({'message': '이메일과 비밀번호가 필요합니다'}), 400
        
        user = Users.query.filter_by(email=email).first()
        if user and user.check_password(password):
            # 마지막 로그인 시간 업데이트
            user.last_login_at = datetime.utcnow()
            from config.database import db
            db.session.commit()

            # 세션도 유지하되, 헤더 기반 토큰도 함께 발급
            session['user_id'] = user.id

            # access_token 발급 (itsdangerous)
            try:
                from utils.token import generate_access_token
                access_token = generate_access_token(user.id)
                try:
                    from flask import current_app
                    masked = access_token[:8] + '...' if access_token else 'None'
                    current_app.logger.info(f'login success → access_token issued (user_id={user.id}, token={masked})')
                except Exception:
                    pass
            except Exception:
                access_token = None

            return jsonify({
                'message': '로그인 성공',
                'user_id': user.id,
                'name': user.name,
                'role': user.role,
                'access_token': access_token
            }), 200
        
        return jsonify({'message': '잘못된 인증정보입니다'}), 401
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('login error: %s', str(e))
        return jsonify({'message': '로그인 처리 중 오류가 발생했습니다'}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    """로그아웃"""
    try:
        session.pop('user_id', None)
        return jsonify({'message': '로그아웃되었습니다'}), 200
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('logout error: %s', str(e))
        return jsonify({'message': '로그아웃 처리 중 오류가 발생했습니다'}), 500
