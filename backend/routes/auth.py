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
    """회원가입"""
    try:
        data = request.get_json(silent=True)
        error = validate_register(data)
        if error:
            return jsonify({'message': error}), 400
        
        email = data['email'].strip()
        name = data['name'].strip()
        password = data['password']
        
        # 이메일 중복 확인
        if Users.query.filter_by(email=email).first():
            return jsonify({'message': '이미 등록된 이메일입니다'}), 409
        
        # 사용자 생성
        user = Users(email=email, name=name)
        user.set_password(password)
        
        from config.database import db
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': '회원가입이 완료되었습니다'}), 201
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('register error: %s', str(e))
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
            
            session['user_id'] = user.id
            return jsonify({
                'message': '로그인 성공',
                'user_id': user.id,
                'name': user.name,
                'role': user.role
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
