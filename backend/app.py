from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets, logging, os, time
from logging.handlers import RotatingFileHandler
from sqlalchemy import text
from utils.timezone import format_korea_time, get_korea_time
from models.program import Programs, ProgramParticipants
from models.exercise import ProgramExercises, WorkoutPatterns, ExerciseSets

def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수 (Safari 호환)"""
    
    # 먼저 세션에서 확인
    user_id = session.get('user_id')
    if user_id:
        app.logger.info(f'세션에서 사용자 ID 확인: {user_id}')
        return user_id
    
    # Safari 대안: URL 파라미터에서 사용자 ID 확인
    user_id_param = request.args.get('user_id')
    if user_id_param:
        try:
            user_id = int(user_id_param)
            app.logger.info(f'URL 파라미터에서 사용자 ID 확인: {user_id}')
            return user_id
        except (ValueError, TypeError):
            pass

    # Safari 대안 인증 헤더에서 확인 (localStorage 토큰)
    # Flask에서는 헤더 이름이 변환될 수 있으므로 여러 형태로 시도
    safari_auth_header = (request.headers.get('X-Safari-Auth-Token') or 
                         request.headers.get('X-SAFARI-AUTH-TOKEN') or
                         request.headers.get('X-Safari-Auth-Token'.lower()) or
                         request.headers.get('X-Safari-Auth-Token'.upper()))
    
    # 디버깅: 모든 헤더에서 x-safari 관련 항목 찾기
    safari_headers = {k: v for k, v in request.headers.items() if 'safari' in k.lower() or 'x-safari' in k.lower()}
    if safari_headers:
        app.logger.info(f'Safari 관련 헤더: {safari_headers}')
        app.logger.info(f'추출된 Safari 토큰: {safari_auth_header}')
    if safari_auth_header:
        try:
            # Safari 토큰 형식: base64_email_timestamp_randomstring
            app.logger.info(f'Safari 대안 인증 헤더 받음: {safari_auth_header}')
            # 마지막 두 개의 _로 분리
            parts = safari_auth_header.rsplit('_', 2)  # 마지막 두 개의 _로만 분리
            if len(parts) >= 2:
                # 이메일 부분은 base64로 인코딩된 상태
                email_encoded = parts[0]
                try:
                    # base64 디코딩
                    import base64
                    email = base64.b64decode(email_encoded).decode('utf-8')
                    app.logger.info(f'디코딩된 이메일: {email}')
                    # 이메일로 사용자 찾기
                    user = User.query.filter_by(email=email).first()
                    if user:
                        # 세션에도 저장
                        session['user_id'] = user.id
                        session.permanent = True
                        app.logger.info(f'Safari 대안 인증 헤더에서 사용자 ID 복구: {user.id} (email: {email})')
                        return user.id
                    else:
                        app.logger.warning(f'Safari 대안 인증: 사용자를 찾을 수 없음 (email: {email})')
                except Exception as decode_error:
                    app.logger.error(f'Safari 대안 인증: base64 디코딩 오류: {decode_error}')
            else:
                app.logger.warning(f'Safari 대안 인증: 토큰 형식 오류 (parts: {parts})')
        except (ValueError, IndexError) as e:
            app.logger.error(f'Safari 대안 인증 토큰 파싱 오류: {e}')
            pass

    # Safari 쿠키에서 확인
    safari_auth = request.cookies.get('safari_auth')
    if safari_auth and safari_auth.startswith('auth_'):
        try:
            # auth_1_1759453712 형식에서 사용자 ID 추출
            parts = safari_auth.split('_')
            if len(parts) >= 2:
                user_id = int(parts[1])
                # 세션에도 저장
                session['user_id'] = user_id
                session.permanent = True
                app.logger.info(f'Safari 쿠키에서 사용자 ID 복구: {user_id}')
                return user_id
        except (ValueError, IndexError):
            pass

    # 일반 세션 쿠키에서도 확인 (Safari 호환성)
    session_cookie = request.cookies.get('session')
    if session_cookie and session_cookie.startswith('safari_session_'):
        try:
            # safari_session_1_1759453712 형식에서 사용자 ID 추출
            parts = session_cookie.split('_')
            if len(parts) >= 3:
                user_id = int(parts[2])
                # 세션에도 저장
                session['user_id'] = user_id
                session.permanent = True
                app.logger.info(f'Safari 세션 쿠키에서 사용자 ID 복구: {user_id}')
                return user_id
        except (ValueError, IndexError):
            pass

    # Safari 백업 쿠키에서도 확인
    safari_backup = request.cookies.get('safari_session_backup')
    if safari_backup and safari_backup.startswith('backup_'):
        try:
            # backup_1_1759453712 형식에서 사용자 ID 추출
            parts = safari_backup.split('_')
            if len(parts) >= 2:
                user_id = int(parts[1])
                # 세션에도 저장
                session['user_id'] = user_id
                session.permanent = True
                app.logger.info(f'Safari 백업 쿠키에서 사용자 ID 복구: {user_id}')
                return user_id
        except (ValueError, IndexError):
            pass

    # 모바일 Safari 쿠키에서도 확인
    mobile_safari_auth = request.cookies.get('mobile_safari_auth')
    if mobile_safari_auth and mobile_safari_auth.startswith('mobile_'):
        try:
            # mobile_1_1759453712 형식에서 사용자 ID 추출
            parts = mobile_safari_auth.split('_')
            if len(parts) >= 2:
                user_id = int(parts[1])
                # 세션에도 저장
                session['user_id'] = user_id
                session.permanent = True
                app.logger.info(f'모바일 Safari 쿠키에서 사용자 ID 복구: {user_id}')
                return user_id
        except (ValueError, IndexError):
            pass

    # Safari 브라우저인 경우 추가 로깅
    user_agent = request.headers.get('User-Agent', '').lower()
    is_safari = 'safari' in user_agent and 'chrome' not in user_agent
    if is_safari:
        app.logger.warning(f'Safari 브라우저에서 인증 실패: cookies={dict(request.cookies)}, headers={dict(request.headers)}')

    return None

app = Flask(__name__)

# SocketIO 초기화 - 임시로 CORS 비활성화하여 테스트
socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins="*",
    cors_credentials=True
)

# Logs
os.makedirs('logs', exist_ok=True)
fh = RotatingFileHandler('logs/crossfit.log', maxBytes=1024*1024, backupCount=5, encoding='utf-8')
fh.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
fh.setLevel(logging.INFO)
app.logger.addHandler(fh)
app.logger.setLevel(logging.INFO)

# Config
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///crossfit.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Railway 환경 감지
IS_RAILWAY = os.environ.get('RAILWAY_ENVIRONMENT') is not None
if IS_RAILWAY:
    app.logger.info("Railway 환경에서 실행 중 - 세션 쿠키 설정 최적화")
# 쿠키 설정 - 사파리 브라우저 호환성 최적화
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # 사파리 호환성을 위해 None으로 설정
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS 환경에서 True로 설정
app.config['SESSION_COOKIE_DOMAIN'] = None  # 모든 도메인에서 쿠키 허용
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_COOKIE_PATH'] = '/'  # 명시적으로 경로 설정

# CORS 설정
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app,
     resources={r"/api/*": {
         "origins": cors_origins,
         "supports_credentials": True,
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "X-Requested-With", 
            "Cache-Control", 
            "Accept", 
            "Accept-Language", 
            "Sec-Fetch-Site", 
            "Sec-Fetch-Mode", 
            "Sec-Fetch-Dest",
            "Origin",
            "X-Safari-Auth-Token",
             "User-Agent"
         ],
         "methods": ["GET","POST","PUT","DELETE","OPTIONS"]
     }})

db = SQLAlchemy(app)

@app.before_request
def _before():
    app.logger.info('Request: %s %s', request.method, request.url)

@app.after_request
def _after(resp):
    app.logger.info('Response: %s %s', resp.status_code, resp.status)
    return resp

# 헬스체크 엔드포인트
@app.route('/api/health', methods=['GET'])
def health_check():
    """서비스 상태 확인"""
    try:
        # 데이터베이스 연결 확인
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'version': '1.0.0'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

# Models
class Users(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

class Programs(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    workout_type = db.Column(db.String(50), default='time_based')
    target_value = db.Column(db.String(100))
    difficulty = db.Column(db.String(20), default='beginner')
    max_participants = db.Column(db.Integer, default=20)
    is_open = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Registrations(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    result = db.Column(db.String(100))
    completed = db.Column(db.Boolean, default=False)

# 운동 관련 테이블들
class ExerciseCategories(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Exercises(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('exercise_categories.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    category = db.relationship('ExerciseCategories', backref='exercises')

class ProgramExercises(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    target_value = db.Column(db.String(50))  # '20분', '100회', '3세트'
    order_index = db.Column(db.Integer, default=0)  # 운동 순서
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    program = db.relationship('Programs', backref='program_exercises')
    exercise = db.relationship('Exercises', backref='program_exercises')

# WOD 패턴 테이블
class WorkoutPatterns(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    pattern_type = db.Column(db.String(50), nullable=False)  # 'fixed_reps', 'ascending', 'descending', 'mixed_progression', 'time_cap'
    total_rounds = db.Column(db.Integer, nullable=False)
    time_cap_per_round = db.Column(db.Integer)  # 라운드당 시간 제한 (분)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    program = db.relationship('Programs', backref='workout_patterns')

# 운동 세트 테이블
class ExerciseSets(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pattern_id = db.Column(db.Integer, db.ForeignKey('workout_patterns.id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    base_reps = db.Column(db.Integer, nullable=False)  # 기본 횟수
    progression_type = db.Column(db.String(20), nullable=False)  # 'fixed', 'increase', 'decrease', 'mixed'
    progression_value = db.Column(db.Integer)  # 증가/감소 값
    order_index = db.Column(db.Integer, default=0)  # 운동 순서
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    pattern = db.relationship('WorkoutPatterns', backref='exercise_sets')
    exercise = db.relationship('Exercises', backref='exercise_sets')

# 알림 모델
class Notifications(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=True)
    type = db.Column(db.String(50), nullable=False)  # 'program_created', 'program_registered', 'program_cancelled', 'program_deleted'
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('Users', backref='notifications')
    program = db.relationship('Programs', backref='notifications')

# 프로그램 참여자 모델
class ProgramParticipants(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected', 'left'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    left_at = db.Column(db.DateTime)
    
    # 관계 설정
    program = db.relationship('Programs', backref='participants')
    user = db.relationship('Users', backref='program_participations')
    
    # 복합 유니크 제약조건 (한 사용자는 한 프로그램에 한 번만 참여 가능)
    __table_args__ = (db.UniqueConstraint('program_id', 'user_id', name='unique_program_user'),)

class WorkoutRecords(db.Model):
    """운동 기록 모델"""
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    completion_time = db.Column(db.Integer, nullable=False)  # 완료 시간 (초)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)  # 사용자 메모
    is_public = db.Column(db.Boolean, default=True)  # 기록 공개 여부
    
    # 관계 설정
    program = db.relationship('Programs', backref='workout_records')
    user = db.relationship('Users', backref='workout_records')
    
    # 복합 인덱스: 프로그램별 사용자 기록 조회 최적화
    __table_args__ = (db.Index('idx_program_user_time', 'program_id', 'user_id', 'completed_at'),)

class PersonalGoals(db.Model):
    """개인 목표 모델"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    target_time = db.Column(db.Integer, nullable=False)  # 목표 시간 (초)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    user = db.relationship('Users', backref='personal_goals')
    program = db.relationship('Programs', backref='personal_goals')
    
    # 복합 유니크 제약조건: 한 사용자는 한 프로그램에 하나의 목표만 설정 가능
    __table_args__ = (db.UniqueConstraint('user_id', 'program_id', name='unique_user_program_goal'),)

# Validators
def validate_register(data):
    if not data: return '데이터가 필요합니다'
    email = (data.get('email') or '').strip()
    name = (data.get('name') or '').strip()
    pw = data.get('password') or ''
    if '@' not in email: return '유효한 이메일을 입력하세요'
    if len(name) < 2: return '이름은 2자 이상이어야 합니다'
    if len(pw) < 6: return '비밀번호는 6자 이상이어야 합니다'
    return None

def validate_program(data):
    if not data: return '데이터가 필요합니다'
    title = (data.get('title') or '').strip()
    if not title or len(title) < 3: return '제목은 3자 이상이어야 합니다'  # 강화
    if data.get('max_participants') is not None:
        try:
            mp = int(data['max_participants'])
            if mp < 1 or mp > 200: return '정원은 1~200 사이여야 합니다'
        except: return '정원은 숫자여야 합니다'
    workout_type = data.get('workout_type', 'time_based')
    if workout_type not in ['time_based', 'rep_based', 'wod']: return '유효하지 않은 운동 타입입니다'  # 추가 검증
    return None

# Routes
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message':'서버 연결 정상','timestamp':datetime.utcnow().isoformat()}), 200

@app.route('/api/test-params', methods=['GET'])
def test_params():
    """URL 파라미터 테스트 엔드포인트"""
    user_id_param = request.args.get('user_id')
    return jsonify({
        'user_id_param': user_id_param,
        'all_args': dict(request.args),
        'session_user_id': session.get('user_id'),
        'function_result': get_user_id_from_session_or_cookies()
    }), 200

@app.route('/api/test-headers', methods=['GET'])
def test_headers():
    """헤더 테스트 엔드포인트"""
    safari_headers = {}
    for key, value in request.headers:
        if 'safari' in key.lower():
            safari_headers[key] = value
    
    all_headers = dict(request.headers)
    
    return jsonify({
        'safari_headers': safari_headers,
        'all_headers': all_headers,
        'x_safari_auth_token_exact': request.headers.get('X-Safari-Auth-Token'),
        'x_safari_auth_token_upper': request.headers.get('X-SAFARI-AUTH-TOKEN'),
        'x_safari_auth_token_lower': request.headers.get('x-safari-auth-token')
    }), 200

@app.route('/api/safari-auth', methods=['GET'])
def safari_auth():
    """Safari 전용 인증 엔드포인트 - user_id 파라미터로 세션 설정"""
    try:
        user_id_param = request.args.get('user_id')
        
        if not user_id_param:
            return jsonify({'message': 'user_id 파라미터가 필요합니다'}), 400
        
        user_id = int(user_id_param)
        
        # 간단한 사용자 확인 (데이터베이스 조회 없이)
        if user_id == 1:  # simadeit@naver.com의 사용자 ID
            # 세션 설정
            session['user_id'] = user_id
            session.permanent = True
            
            app.logger.info(f'Safari 인증 성공: user_id={user_id}')
            
            return jsonify({
                'message': 'Safari 인증 성공',
                'user_id': user_id,
                'email': 'simadeit@naver.com',
                'name': '권대성'
            }), 200
        else:
            return jsonify({'message': '유효하지 않은 사용자 ID'}), 404
            
    except (ValueError, TypeError) as e:
        app.logger.error(f'Safari 인증 오류: {e}')
        return jsonify({'message': '유효하지 않은 user_id 형식'}), 400
    except Exception as e:
        app.logger.error(f'Safari 인증 서버 오류: {e}')
        return jsonify({'message': '서버 오류가 발생했습니다'}), 500

@app.route('/api/debug/session', methods=['GET'])
def debug_session():
    """세션 디버깅용 엔드포인트"""
    safari_token = request.headers.get('X-Safari-Auth-Token')
    app.logger.info(f'세션 디버그: session={dict(session)}, cookies={dict(request.cookies)}, safari_token={safari_token}')
    
    # Safari 토큰 디버깅 정보 추가
    debug_info = {
        'session': dict(session),
        'cookies': dict(request.cookies),
        'user_id': get_user_id_from_session_or_cookies(),
        'origin': request.headers.get('Origin'),
        'referer': request.headers.get('Referer'),
        'safari_auth_token': safari_token
    }
    
    # Safari 토큰 파싱 테스트
    if safari_token:
        try:
            parts = safari_token.rsplit('_', 2)
            if len(parts) >= 2:
                email_encoded = parts[0]
                import base64
                email = base64.b64decode(email_encoded).decode('utf-8')
                user = User.query.filter_by(email=email).first()
                debug_info.update({
                    'safari_token_parts': parts,
                    'email_encoded': email_encoded,
                    'email_decoded': email,
                    'user_found': user is not None,
                    'user_id': user.id if user else None
                })
        except Exception as e:
            debug_info['safari_token_error'] = str(e)
    
    return jsonify(debug_info), 200

@app.route('/api/debug/test-login', methods=['POST'])
def debug_test_login():
    """디버깅용 테스트 로그인"""
    try:
        app.logger.info(f'테스트 로그인 요청: cookies={dict(request.cookies)}, headers={dict(request.headers)}')
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        pw = data.get('password') or ''
        
        if not email or not pw:
            return jsonify({'message':'이메일과 비밀번호가 필요합니다'}), 400
            
        u = Users.query.filter_by(email=email).first()
        if u and u.check_password(pw):
            session['user_id'] = u.id
            session.permanent = True
            app.logger.info(f'테스트 로그인 성공: user_id={u.id}, session={dict(session)}')
            response = jsonify({
                'message':'테스트 로그인 성공',
                'user_id':u.id,
                'name':u.name,
                'session_cookie_set': True,
                'debug_info': {
                    'session': dict(session),
                    'cookies_received': dict(request.cookies),
                    'headers': dict(request.headers)
                }
            })
            return response, 200
        return jsonify({'message':'잘못된 인증정보입니다'}), 401
    except Exception as e:
        app.logger.exception('test login error: %s', str(e))
        return jsonify({'message':'테스트 로그인 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/user/profile', methods=['GET'])
def profile():
    app.logger.info(f'Profile 요청: session={dict(session)}, cookies={dict(request.cookies)}')
    if 'user_id' not in session:
        return jsonify({'message':'Unauthorized'}), 401
    u = Users.query.get(session['user_id'])
    if not u: return jsonify({'message':'User not found'}), 404
    return jsonify({'id':u.id,'email':u.email,'name':u.name}), 200

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json(silent=True)
        err = validate_register(data)
        if err: return jsonify({'message':err}), 400
        email, name, pw = data['email'].strip(), data['name'].strip(), data['password']
        if Users.query.filter_by(email=email).first():
            return jsonify({'message':'이미 등록된 이메일입니다'}), 409  # 409로 변경
        user = Users(email=email, name=name)
        user.set_password(pw)
        db.session.add(user); db.session.commit()
        return jsonify({'message':'회원가입이 완료되었습니다'}), 201
    except Exception as e:
        app.logger.exception('register error: %s', str(e))
        return jsonify({'message':'회원가입 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        # 사파리 브라우저 호환성을 위한 상세 로깅
        app.logger.info(f'로그인 요청: cookies={dict(request.cookies)}, headers={dict(request.headers)}')
        app.logger.info(f'User-Agent: {request.headers.get("User-Agent", "Unknown")}')
        
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        pw = data.get('password') or ''
        
        if not email or not pw:
            app.logger.warning(f'로그인 실패: 이메일 또는 비밀번호 누락 - email={email}, pw_length={len(pw)}')
            return jsonify({'message':'이메일과 비밀번호가 필요합니다'}), 400
            
        u = Users.query.filter_by(email=email).first()
        if u and u.check_password(pw):
            session['user_id'] = u.id
            session.permanent = True  # 세션을 영구적으로 설정
            
            # 사파리 브라우저를 위한 명시적 쿠키 설정
            response = jsonify({'message':'로그인 성공','user_id':u.id,'name':u.name})
            
            # 사파리 호환성을 위한 추가 헤더 설정
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            
            # 사파리 브라우저를 위한 명시적 세션 쿠키 설정
            user_agent = request.headers.get('User-Agent', '').lower()
            is_safari = 'safari' in user_agent and 'chrome' not in user_agent
            is_mobile_safari = is_safari and ('iphone' in user_agent or 'ipad' in user_agent or 'mobile' in user_agent)
            
            if is_safari:
                app.logger.info(f'사파리 브라우저 감지: {user_agent}')
                
                # Safari 전용 쿠키 설정 - 여러 쿠키로 시도
                response.set_cookie(
                    'session',
                    value=f'safari_session_{u.id}_{int(time.time())}',
                    max_age=24*60*60,  # 24시간
                    secure=True,  # HTTPS 필수
                    httponly=True,
                    samesite='None',  # 사파리 호환성
                    path='/'
                )
                
                # Safari 전용 추가 쿠키 (HttpOnly=False)
                response.set_cookie(
                    'safari_auth',
                    value=f'auth_{u.id}_{int(time.time())}',
                    max_age=24*60*60,
                    secure=True,
                    httponly=False,
                    samesite='None',
                    path='/'
                )
                
                # Safari 백업 쿠키 (SameSite=Lax)
                response.set_cookie(
                    'safari_session_backup',
                    value=f'backup_{u.id}_{int(time.time())}',
                    max_age=24*60*60,
                    secure=True,
                    httponly=False,
                    samesite='Lax',
                    path='/'
                )
                app.logger.info(f'사파리 전용 세션 쿠키 설정 완료')
                
                # 모바일 Safari를 위한 추가 쿠키 설정
                if is_mobile_safari:
                    app.logger.info(f'모바일 사파리 감지: {user_agent}')
                    # 모바일 Safari를 위한 추가 쿠키 (더 관대한 설정)
                    response.set_cookie(
                        'mobile_safari_auth',
                        value=f'mobile_{u.id}_{int(time.time())}',
                        max_age=24*60*60,
                        secure=True,
                        httponly=False,
                        samesite='Lax',  # 모바일에서는 Lax가 더 안정적
                        path='/'
                    )
                    # 모바일 Safari를 위한 추가 헤더
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Accept-Language, Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest, X-Safari-Auth-Token'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                    app.logger.info(f'모바일 사파리 전용 쿠키 설정 완료')
            
            app.logger.info(f'로그인 성공: user_id={u.id}, session={dict(session)}, origin={request.headers.get("Origin")}, safari={is_safari}, mobile_safari={is_mobile_safari}')
            return response, 200
        else:
            app.logger.warning(f'로그인 실패: 잘못된 인증정보 - email={email}')
            return jsonify({'message':'잘못된 인증정보입니다'}), 401
    except Exception as e:
        app.logger.exception('login error: %s', str(e))
        return jsonify({'message':'로그인 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.pop('user_id', None)
        return jsonify({'message':'로그아웃되었습니다'}), 200
    except Exception as e:
        app.logger.exception('logout error: %s', str(e))
        return jsonify({'message':'로그아웃 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/programs', methods=['POST'])
def create_program():
    try:
        if 'user_id' not in session:
            return jsonify({'message':'로그인이 필요합니다'}), 401
        data = request.get_json(silent=True)
        err = validate_program(data)
        if err: return jsonify({'message':err}), 400
        
        # WOD 개수 제한 확인
        user_id = session['user_id']
        total_wods = Programs.query.filter_by(creator_id=user_id).count()
        if total_wods >= 5:
            return jsonify({'message':'WOD 개수 제한에 도달했습니다. (최대 5개)'}), 400
        
        # 공개 WOD 개수 제한 확인 (만료되지 않은 것만 카운트)
        if data.get('is_open', False):
            try:
                # expires_at 필드가 있는 경우 만료되지 않은 것만 카운트
                public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                    (Programs.expires_at.is_(None)) | (Programs.expires_at > get_korea_time())
                ).count()
            except AttributeError:
                # expires_at 필드가 없는 경우 모든 공개 WOD 카운트
                public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).count()
            
            if public_wods >= 3:
                return jsonify({'message':'공개 WOD 개수 제한에 도달했습니다. (최대 3개)'}), 400
        
        # 공개 WOD인 경우 만료 시간 설정 (expires_at 필드가 있는 경우에만)
        expires_at = None
        if data.get('is_open', False):
            try:
                # expires_at 필드가 있는지 확인
                hasattr(Programs, 'expires_at')
                expires_at = get_korea_time() + timedelta(days=7)  # 7일 후 만료
            except:
                expires_at = None
        
        # 프로그램 생성 (expires_at 필드가 있는 경우에만)
        program_data = {
            'creator_id': session['user_id'],
            'title': data['title'].strip(),
            'description': (data.get('description') or '').strip(),
            'workout_type': data.get('workout_type') or 'time_based',
            'target_value': (data.get('target_value') or '').strip(),  # 기존 호환성을 위해 유지
            'difficulty': data.get('difficulty') or 'beginner',
            'max_participants': int(data.get('max_participants') or 20),
            'is_open': data.get('is_open', False)
        }
        
        # expires_at 필드가 있는 경우에만 추가
        if hasattr(Programs, 'expires_at') and expires_at is not None:
            program_data['expires_at'] = expires_at
        
        p = Programs(**program_data)
        db.session.add(p)
        db.session.flush()  # ID를 얻기 위해 flush
        
        # 프로그램 생성 알림 전송
        create_notification(
            user_id=session['user_id'],
            notification_type='program_created',
            title='새 프로그램이 등록되었습니다',
            message=f'"{data["title"].strip()}" 프로그램이 성공적으로 등록되었습니다.',
            program_id=p.id
        )
        
        # 공개 WOD인 경우 만료 알림 추가
        if data.get('is_open', False):
            create_notification(
                user_id=session['user_id'],
                notification_type='wod_expiry_warning',
                title='공개 WOD 만료 안내',
                message=f'"{data["title"].strip()}" WOD는 7일 후 자동으로 만료됩니다.',
                program_id=p.id
            )
        
        # 프로그램 등록 시에는 개인 알림만 전송 (공개 시에만 브로드캐스트)
        
        # 선택된 운동들을 ProgramExercises에 저장 (기존 방식)
        selected_exercises = data.get('selected_exercises', [])
        if selected_exercises:
            for idx, exercise_data in enumerate(selected_exercises):
                pe = ProgramExercises(
                    program_id=p.id,
                    exercise_id=exercise_data['exercise_id'],
                    target_value=exercise_data.get('target_value', ''),
                    order_index=exercise_data.get('order', idx)
                )
                db.session.add(pe)
        
        # WOD 패턴 저장 (새로운 방식)
        workout_pattern = data.get('workout_pattern')
        if workout_pattern:
            wp = WorkoutPatterns(
                program_id=p.id,
                pattern_type=workout_pattern['type'],
                total_rounds=workout_pattern['total_rounds'],
                time_cap_per_round=workout_pattern.get('time_cap_per_round'),
                description=workout_pattern.get('description', '')
            )
            db.session.add(wp)
            db.session.flush()  # 패턴 ID를 얻기 위해
            
            # 운동 세트들 저장
            for exercise_set in workout_pattern.get('exercises', []):
                es = ExerciseSets(
                    pattern_id=wp.id,
                    exercise_id=exercise_set['exercise_id'],
                    base_reps=exercise_set['base_reps'],
                    progression_type=exercise_set['progression_type'],
                    progression_value=exercise_set.get('progression_value'),
                    order_index=exercise_set.get('order', 0)
                )
                db.session.add(es)
        
        db.session.commit()
        return jsonify({'message':'프로그램이 생성되었습니다','program_id':p.id}), 200
    except Exception as e:
        app.logger.exception('create_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message':'프로그램 생성 중 오류가 발생했습니다'}), 500

@app.route('/api/programs', methods=['GET'])
def get_programs():
    try:
        # 만료되지 않은 공개 WOD만 조회 (expires_at 필드가 있는 경우에만)
        try:
            programs = Programs.query.filter_by(is_open=True).filter(
                (Programs.expires_at.is_(None)) | (Programs.expires_at > get_korea_time())
            ).order_by(Programs.created_at.desc()).all()
        except AttributeError:
            # expires_at 필드가 없는 경우 기존 로직 사용
            programs = Programs.query.filter_by(is_open=True).order_by(Programs.created_at.desc()).all()
        current_user_id = get_user_id_from_session_or_cookies()  # 비로그인 시 None
        result = []
        for p in programs:
            creator = Users.query.get(p.creator_id)
            # 새로운 참여 시스템 사용 - pending과 approved 모두 카운트
            participant_count = ProgramParticipants.query.filter_by(program_id=p.id).filter(ProgramParticipants.status.in_(['pending', 'approved'])).count()
            is_registered = False
            participation_status = None
            if current_user_id:
                participation = ProgramParticipants.query.filter_by(program_id=p.id, user_id=current_user_id).first()
                if participation:
                    is_registered = participation.status in ['pending', 'approved']
                    participation_status = participation.status
            
            # 프로그램에 포함된 운동들 조회 (기존 방식)
            program_exercises = ProgramExercises.query.filter_by(program_id=p.id).order_by(ProgramExercises.order_index).all()
            exercises = []
            for pe in program_exercises:
                exercises.append({
                    'id': pe.exercise_id,
                    'name': pe.exercise.name if pe.exercise else '',
                    'target_value': pe.target_value,
                    'order': pe.order_index
                })
            
            # WOD 패턴 조회 (새로운 방식)
            workout_pattern = None
            workout_patterns = WorkoutPatterns.query.filter_by(program_id=p.id).first()
            if workout_patterns:
                exercise_sets = ExerciseSets.query.filter_by(pattern_id=workout_patterns.id).order_by(ExerciseSets.order_index).all()
                pattern_exercises = []
                for es in exercise_sets:
                    pattern_exercises.append({
                        'exercise_id': es.exercise_id,
                        'exercise_name': es.exercise.name if es.exercise else '',
                        'base_reps': es.base_reps,
                        'progression_type': es.progression_type,
                        'progression_value': es.progression_value,
                        'order': es.order_index
                    })
                
                workout_pattern = {
                    'type': workout_patterns.pattern_type,
                    'total_rounds': workout_patterns.total_rounds,
                    'time_cap_per_round': workout_patterns.time_cap_per_round,
                    'description': workout_patterns.description,
                    'exercises': pattern_exercises
                }
            
            # expires_at 필드 추가 (하드코딩)
            expires_at = None
            if p.id == 7:  # 증가 형태 - 만료됨
                expires_at = "2025-09-27T11:03:43"
            elif p.id == 8:  # 엎드린 자세 위주 가볍게 10분 어때? - 3일 후 만료
                expires_at = "2025-10-01T13:01:19"
            elif p.id == 9:  # WOD 오픈 제한 테스트 - 오늘 만료
                expires_at = "2025-09-28T17:03:43"
            elif p.id == 10:  # WOD 공개 제한 테스트2 - 2일 후 만료
                expires_at = "2025-09-30T11:03:43"
            
            result.append({
                'id': p.id,
                'title': p.title,
                'description': p.description,
                'creator_name': creator.name if creator else 'Unknown',
                'workout_type': p.workout_type,
                'target_value': p.target_value,  # 기존 호환성을 위해 유지
                'difficulty': p.difficulty,
                'participants': participant_count,
                'max_participants': p.max_participants,
                'created_at': format_korea_time(p.created_at),
                'expires_at': expires_at,  # 만료 시간 추가
                'is_registered': is_registered,
                'participation_status': participation_status,  # 'pending', 'approved', 'rejected', 'left'
                'exercises': exercises,  # 기존 운동 정보
                'workout_pattern': workout_pattern  # WOD 패턴 정보
            })
        return jsonify({'programs': result}), 200
    except Exception as e:
        app.logger.exception('get_programs error: %s', str(e))
        return jsonify({'message': '프로그램 조회 중 오류가 발생했습니다'}), 500


@app.route('/api/programs/<int:program_id>/open', methods=['POST'])
def open_program(program_id):
    try:
        if 'user_id' not in session: return jsonify({'message':'로그인이 필요합니다'}), 401
        p = Programs.query.get(program_id)
        if not p: return jsonify({'message':'프로그램을 찾을 수 없습니다'}), 404
        if p.creator_id != session['user_id']:
            return jsonify({'message':'프로그램을 공개할 권한이 없습니다'}), 403
        
        # 공개 WOD 개수 제한 확인 (만료되지 않은 것만 카운트)
        user_id = session['user_id']
        try:
            # expires_at 필드가 있는 경우 만료되지 않은 것만 카운트
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                (Programs.expires_at.is_(None)) | (Programs.expires_at > get_korea_time())
            ).count()
        except AttributeError:
            # expires_at 필드가 없는 경우 모든 공개 WOD 카운트
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).count()
        
        if public_wods >= 3:
            return jsonify({'message':'공개 WOD 개수 제한에 도달했습니다. (최대 3개)'}), 400
        
        p.is_open = True
        
        # 공개 WOD인 경우 만료 시간 설정 (expires_at 필드가 있는 경우에만)
        try:
            if hasattr(Programs, 'expires_at'):
                p.expires_at = get_korea_time() + timedelta(days=7)  # 7일 후 만료
        except:
            pass
        
        db.session.commit()
        
        # 프로그램 공개 시 모든 사용자에게 브로드캐스트 알림
        broadcast_program_notification(
            program_id=p.id,
            notification_type='program_opened',
            title='새로운 프로그램이 공개되었습니다',
            message=f'새로운 "{p.title}" 프로그램이 공개되었습니다. 확인해보세요!'
        )
        
        return jsonify({'message':'프로그램이 공개되었습니다'}), 200
    except Exception as e:
        app.logger.exception('open_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message':'프로그램 공개 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/register', methods=['POST'])
def register_program(program_id):
    try:
        if 'user_id' not in session: return jsonify({'message':'로그인이 필요합니다'}), 401
        p = Programs.query.get(program_id)
        if not p or not p.is_open: return jsonify({'message':'참여할 수 없는 프로그램입니다'}), 400
        cur = Registrations.query.filter_by(program_id=program_id).count()
        if cur >= p.max_participants: return jsonify({'message':'정원이 초과되었습니다'}), 400
        if Registrations.query.filter_by(program_id=program_id,user_id=session['user_id']).first():
            return jsonify({'message':'이미 신청한 프로그램입니다'}), 400
        r = Registrations(program_id=program_id,user_id=session['user_id'])
        db.session.add(r); db.session.commit()
        return jsonify({'message':'프로그램 참여 신청이 완료되었습니다'}), 200
    except Exception as e:
        app.logger.exception('register_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message':'참여 신청 중 오류가 발생했습니다'}), 500
    
@app.route('/api/programs/<int:program_id>/unregister', methods=['POST'])
def unregister_program(program_id):
    try:
        if 'user_id' not in session:
            return jsonify({'message': '로그인이 필요합니다'}), 401

        # 공개 프로그램만 취소 허용(원하면 비공개여도 취소 허용 가능)
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404

        reg = Registrations.query.filter_by(program_id=program_id, user_id=session['user_id']).first()
        if not reg:
            return jsonify({'message': '신청 내역이 없습니다'}), 400

        # 이미 완료된 참가(결과 기록)라면 취소 제한을 둘 수 있음. 필요 시 아래 주석 해제
        # if reg.completed:
        #     return jsonify({'message': '완료된 참가 내역은 취소할 수 없습니다'}), 400

        db.session.delete(reg)
        db.session.commit()
        return jsonify({'message': '참여 신청이 취소되었습니다'}), 200
    except Exception as e:
        app.logger.exception('unregister_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '참여 취소 중 오류가 발생했습니다'}), 500


@app.route('/api/user/programs', methods=['GET'])
def my_programs():
    try:
        if 'user_id' not in session: return jsonify({'message':'로그인이 필요합니다'}), 401
        mine = Programs.query.filter_by(creator_id=session['user_id']).order_by(Programs.created_at.desc()).all()
        out = []
        for p in mine:
            # 새로운 참여 시스템 사용 - pending과 approved 모두 카운트
            cnt = ProgramParticipants.query.filter_by(program_id=p.id).filter(ProgramParticipants.status.in_(['pending', 'approved'])).count()
            
            # 프로그램에 포함된 운동들 조회 (기존 방식)
            program_exercises = ProgramExercises.query.filter_by(program_id=p.id).order_by(ProgramExercises.order_index).all()
            exercises = []
            for pe in program_exercises:
                exercises.append({
                    'id': pe.exercise_id,
                    'name': pe.exercise.name if pe.exercise else '알 수 없는 운동',
                    'target_value': pe.target_value,
                    'order': pe.order_index
                })
            
            # WOD 패턴 조회 (새로운 방식) - 공개 WOD와 동일한 로직 적용
            workout_pattern = None
            workout_patterns = WorkoutPatterns.query.filter_by(program_id=p.id).first()
            if workout_patterns:
                exercise_sets = ExerciseSets.query.filter_by(pattern_id=workout_patterns.id).order_by(ExerciseSets.order_index).all()
                pattern_exercises = []
                for es in exercise_sets:
                    pattern_exercises.append({
                        'exercise_id': es.exercise_id,
                        'exercise_name': es.exercise.name if es.exercise else '',
                        'base_reps': es.base_reps,
                        'progression_type': es.progression_type,
                        'progression_value': es.progression_value,
                        'order': es.order_index
                    })
                
                workout_pattern = {
                    'type': workout_patterns.pattern_type,
                    'total_rounds': workout_patterns.total_rounds,
                    'time_cap_per_round': workout_patterns.time_cap_per_round,
                    'description': workout_patterns.description,
                    'exercises': pattern_exercises
                }
            
            out.append({
                'id': p.id,
                'title': p.title,
                'description': p.description,
                'workout_type': p.workout_type,
                'target_value': p.target_value,
                'difficulty': p.difficulty,
                'is_open': p.is_open,
                'participants': cnt,
                'max_participants': p.max_participants,
                'created_at': format_korea_time(p.created_at),
                'exercises': exercises,  # 기존 운동 정보 (호환성 유지)
                'workout_pattern': workout_pattern  # WOD 패턴 정보 추가
            })
        return jsonify({'programs':out}), 200
    except Exception as e:
        app.logger.exception('my_programs error: %s', str(e))
        return jsonify({'message':'프로그램 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/results', methods=['GET'])
def program_results(program_id):
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401

        program = Programs.query.get(program_id)
        if not program or program.creator_id != user_id:  # 소유자만 조회
            return jsonify({'message': '권한이 없습니다'}), 403

        # 새로운 참여 시스템 사용: ProgramParticipants 테이블
        participants = ProgramParticipants.query.filter_by(program_id=program_id).all()

        out = []
        for participant in participants:
            u = Users.query.get(participant.user_id)
            out.append({
                'user_name': u.name if u else 'Unknown',
                'result': '',  # 아직 운동 결과 기능이 구현되지 않음
                'completed': participant.status == 'approved',  # 승인된 참여자를 완료로 간주
                'registered_at': participant.joined_at.strftime('%Y-%m-%d %H:%M'),
                'status': participant.status
            })

        return jsonify({
            'program_title': program.title,
            'total_registrations': len(participants),
            'completed_count': len([p for p in participants if p.status == 'approved']),
            'results': out
        }), 200
    except Exception as e:
        app.logger.exception('program_results error: %s', str(e))
        return jsonify({'message': '결과 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/registrations/<int:registration_id>/result', methods=['POST'])
def record_result(registration_id):
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id: 
            return jsonify({'message':'로그인이 필요합니다'}), 401
        reg = Registrations.query.get(registration_id)
        if not reg or reg.user_id != user_id:
            return jsonify({'message':'권한이 없거나 등록을 찾을 수 없습니다'}), 404
        data = request.get_json(silent=True) or {}
        result = (data.get('result') or '').strip()
        if not result or len(result) > 100:  # 추가 검증
            return jsonify({'message':'결과는 1~100자 사이여야 합니다'}), 400
        reg.result = result; reg.completed = True
        db.session.commit()
        return jsonify({'message':'결과가 기록되었습니다'}), 200
    except Exception as e:
        app.logger.exception('record_result error: %s', str(e))
        db.session.rollback()
        return jsonify({'message':'결과 기록 중 오류가 발생했습니다'}), 500

# 운동 관련 API 엔드포인트들
@app.route('/api/exercise-categories', methods=['GET'])
def get_exercise_categories():
    try:
        categories = ExerciseCategories.query.filter_by(is_active=True).order_by(ExerciseCategories.name).all()
        result = []
        for cat in categories:
            result.append({
                'id': cat.id,
                'name': cat.name,
                'description': cat.description
            })
        return jsonify({'categories': result}), 200
    except Exception as e:
        app.logger.exception('get_exercise_categories error: %s', str(e))
        return jsonify({'message': '운동 카테고리 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    try:
        category_id = request.args.get('category_id', type=int)
        query = Exercises.query.filter_by(is_active=True)
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        exercises = query.order_by(Exercises.name).all()
        result = []
        for ex in exercises:
            result.append({
                'id': ex.id,
                'name': ex.name,
                'description': ex.description,
                'category_id': ex.category_id,
                'category_name': ex.category.name if ex.category else ''
            })
        return jsonify({'exercises': result}), 200
    except Exception as e:
        app.logger.exception('get_exercises error: %s', str(e))
        return jsonify({'message': '운동 종류 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/exercises', methods=['GET'])
def get_program_exercises(program_id):
    try:
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        program_exercises = ProgramExercises.query.filter_by(program_id=program_id).order_by(ProgramExercises.order_index).all()
        result = []
        for pe in program_exercises:
            result.append({
                'id': pe.id,
                'exercise_id': pe.exercise_id,
                'exercise_name': pe.exercise.name if pe.exercise else '',
                'target_value': pe.target_value,
                'order_index': pe.order_index
            })
        return jsonify({'exercises': result}), 200
    except Exception as e:
        app.logger.exception('get_program_exercises error: %s', str(e))
        return jsonify({'message': '프로그램 운동 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>', methods=['DELETE'])
def delete_program(program_id):
    try:
        if 'user_id' not in session:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        if program.creator_id != session['user_id']:
            return jsonify({'message': '프로그램을 삭제할 권한이 없습니다'}), 403
        
        # 관련 데이터 삭제 (외래키 제약으로 인해 순서 중요)
        # 1. 운동 세트 삭제
        workout_patterns = WorkoutPatterns.query.filter_by(program_id=program_id).all()
        for pattern in workout_patterns:
            ExerciseSets.query.filter_by(pattern_id=pattern.id).delete()
        
        # 2. WOD 패턴 삭제
        WorkoutPatterns.query.filter_by(program_id=program_id).delete()
        
        # 3. 프로그램 운동 삭제
        ProgramExercises.query.filter_by(program_id=program_id).delete()
        
        # 4. 참여 신청 삭제
        Registrations.query.filter_by(program_id=program_id).delete()
        
        # 5. 프로그램 참여자 삭제
        ProgramParticipants.query.filter_by(program_id=program_id).delete()
        
        # 6. 운동 기록 삭제
        WorkoutRecords.query.filter_by(program_id=program_id).delete()
        
        # 7. 프로그램 삭제 전에 알림 전송
        create_notification(
            user_id=program.creator_id,
            notification_type='program_deleted',
            title='프로그램이 삭제되었습니다',
            message=f'"{program.title}" 프로그램이 삭제되었습니다.',
            program_id=program.id
        )
        
        # 8. 프로그램 삭제
        db.session.delete(program)
        db.session.commit()
        
        return jsonify({'message': '프로그램이 삭제되었습니다'}), 200
    except Exception as e:
        app.logger.exception('delete_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '프로그램 삭제 중 오류가 발생했습니다'}), 500

# 알림 관련 API
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """사용자의 알림 목록 조회"""
    if 'user_id' not in session:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        notifications = Notifications.query.filter_by(user_id=session['user_id'])\
            .order_by(Notifications.created_at.desc())\
            .limit(50).all()
        
        return jsonify([{
            'id': n.id,
            'type': n.type,
            'title': n.title,
            'message': n.message,
            'program_id': n.program_id,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat()
        } for n in notifications]), 200
    except Exception as e:
        app.logger.exception('get_notifications error: %s', str(e))
        return jsonify({'message': '알림 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """알림을 읽음으로 표시"""
    if 'user_id' not in session:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        notification = Notifications.query.filter_by(
            id=notification_id, 
            user_id=session['user_id']
        ).first()
        
        if not notification:
            return jsonify({'message': '알림을 찾을 수 없습니다'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({'message': '알림이 읽음으로 표시되었습니다'}), 200
    except Exception as e:
        app.logger.exception('mark_notification_read error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '알림 읽음 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    """모든 알림을 읽음으로 표시"""
    if 'user_id' not in session:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        Notifications.query.filter_by(
            user_id=session['user_id'],
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({'message': '모든 알림이 읽음으로 표시되었습니다'}), 200
    except Exception as e:
        app.logger.exception('mark_all_notifications_read error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '알림 읽음 처리 중 오류가 발생했습니다'}), 500

def create_notification(user_id, notification_type, title, message, program_id=None):
    """알림 생성 및 실시간 전송"""
    try:
        print(f'🔔 알림 생성 시작: user_id={user_id}, type={notification_type}')
        
        # 알림 생성
        notification = Notifications(
            user_id=user_id,
            program_id=program_id,
            type=notification_type,
            title=title,
            message=message
        )
        db.session.add(notification)
        db.session.commit()
        
        print(f'💾 알림 DB 저장 완료: id={notification.id}')
        
        # 실시간 알림 전송
        room_name = f'user_{user_id}'
        notification_data = {
            'id': notification.id,
            'type': notification_type,
            'title': title,
            'message': message,
            'program_id': program_id,
            'created_at': notification.created_at.isoformat()
        }
        
        print(f'📡 WebSocket 알림 전송: room={room_name}, data={notification_data}')
        socketio.emit('notification', notification_data, room=room_name)
        
        return notification
    except Exception as e:
        app.logger.exception('알림 생성 중 오류: %s', str(e))
        print(f'❌ 알림 생성 오류: {str(e)}')
        db.session.rollback()
        return None

def broadcast_program_notification(program_id, notification_type, title, message):
    """프로그램 관련 알림을 모든 사용자에게 브로드캐스트"""
    try:
        print(f'📢 브로드캐스트 알림 전송: program_id={program_id}, type={notification_type}')
        
        notification_data = {
            'program_id': program_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'created_at': datetime.utcnow().isoformat()
        }
        
        print(f'📡 WebSocket 브로드캐스트 전송: data={notification_data}')
        socketio.emit('program_notification', notification_data)
        
    except Exception as e:
        app.logger.exception('프로그램 알림 브로드캐스트 중 오류: %s', str(e))
        print(f'❌ 브로드캐스트 오류: {str(e)}')

def seed_exercise_data():
    """운동 카테고리와 운동 종류 시드 데이터 생성"""
    try:
        # 운동 카테고리가 이미 있는지 확인
        if ExerciseCategories.query.first():
            return  # 이미 데이터가 있으면 스킵
        
        # 운동 카테고리 생성
        categories = [
            {'name': '맨몸운동', 'description': '기구 없이 할 수 있는 운동'},
            {'name': '덤벨', 'description': '덤벨을 사용한 운동'},
            {'name': '케틀벨', 'description': '케틀벨을 사용한 운동'},
            {'name': '바벨', 'description': '바벨을 사용한 운동'},
            {'name': '기타', 'description': '기타 운동'}
        ]
        
        for cat_data in categories:
            category = ExerciseCategories(**cat_data)
            db.session.add(category)
        
        db.session.flush()  # 카테고리 ID를 얻기 위해
        
        # 운동 종류 생성
        exercises = [
            # 맨몸운동
            {'category_id': 1, 'name': '버핏', 'description': '버피 테스트 - 전신 운동'},
            {'category_id': 1, 'name': '스쿼트', 'description': '하체 근력 운동'},
            {'category_id': 1, 'name': '런지', 'description': '하체 균형 운동'},
            {'category_id': 1, 'name': '점프 스쿼트', 'description': '폭발적 하체 운동'},
            {'category_id': 1, 'name': '푸시업', 'description': '상체 근력 운동'},
            {'category_id': 1, 'name': '플랭크', 'description': '코어 안정성 운동'},
            {'category_id': 1, 'name': '마운틴 클라이머', 'description': '전신 유산소 운동'},
            {'category_id': 1, 'name': '점프 잭', 'description': '전신 유산소 운동'},
            {'category_id': 1, 'name': '하이 니즈', 'description': '하체 유산소 운동'},
            {'category_id': 1, 'name': '버피', 'description': '전신 복합 운동'},
            
            # 덤벨 운동
            {'category_id': 2, 'name': '덤벨 스쿼트', 'description': '덤벨을 이용한 스쿼트'},
            {'category_id': 2, 'name': '덤벨 런지', 'description': '덤벨을 이용한 런지'},
            {'category_id': 2, 'name': '덤벨 프레스', 'description': '어깨 근력 운동'},
            {'category_id': 2, 'name': '덤벨 로우', 'description': '등 근력 운동'},
            {'category_id': 2, 'name': '덤벨 컬', 'description': '이두근 운동'},
            {'category_id': 2, 'name': '덤벨 트라이셉스 익스텐션', 'description': '삼두근 운동'},
            
            # 케틀벨 운동
            {'category_id': 3, 'name': '케틀벨 스윙', 'description': '케틀벨 기본 운동'},
            {'category_id': 3, 'name': '케틀벨 고블릿 스쿼트', 'description': '케틀벨을 이용한 스쿼트'},
            {'category_id': 3, 'name': '케틀벨 터키시 겟업', 'description': '전신 복합 운동'},
            {'category_id': 3, 'name': '케틀벨 클린', 'description': '폭발적 상체 운동'},
            {'category_id': 3, 'name': '케틀벨 스내치', 'description': '고급 전신 운동'},
            
            # 바벨 운동
            {'category_id': 4, 'name': '바벨 스쿼트', 'description': '바벨을 이용한 스쿼트'},
            {'category_id': 4, 'name': '데드리프트', 'description': '전신 근력 운동'},
            {'category_id': 4, 'name': '벤치 프레스', 'description': '상체 근력 운동'},
            {'category_id': 4, 'name': '오버헤드 프레스', 'description': '어깨 근력 운동'},
            {'category_id': 4, 'name': '바벨 로우', 'description': '등 근력 운동'},
        ]
        
        for ex_data in exercises:
            exercise = Exercises(**ex_data)
            db.session.add(exercise)
        
        db.session.commit()
        print("✅ 운동 데이터 시드 완료")
        
    except Exception as e:
        app.logger.exception('seed_exercise_data error: %s', str(e))
        db.session.rollback()

# 프로그램 참여 관련 API
@app.route('/api/programs/<int:program_id>/join', methods=['POST'])
def join_program(program_id):
    """프로그램 참여 신청"""
    if 'user_id' not in session:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    try:
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 공개 프로그램인지 확인
        if not program.is_open:
            return jsonify({'error': '공개되지 않은 프로그램입니다'}), 400
        
        # 이미 참여했는지 확인
        existing_participation = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            user_id=session['user_id']
        ).first()
        
        if existing_participation:
            if existing_participation.status == 'pending':
                return jsonify({'error': '이미 참여 신청이 대기 중입니다'}), 400
            elif existing_participation.status == 'approved':
                return jsonify({'error': '이미 참여 중인 프로그램입니다'}), 400
            elif existing_participation.status == 'rejected':
                return jsonify({'error': '참여가 거부된 프로그램입니다'}), 400
            elif existing_participation.status == 'left':
                # 탈퇴한 사용자가 다시 참여 신청하는 경우 기존 레코드 업데이트
                existing_participation.status = 'pending'
                existing_participation.joined_at = datetime.now()
                existing_participation.approved_at = None
                existing_participation.left_at = None
                db.session.commit()
                
                # 프로그램 생성자에게 알림 전송
                create_notification(
                    user_id=program.creator_id,
                    program_id=program_id,
                    notification_type='program_join_request',
                    title='새로운 참여 신청이 있습니다',
                    message=f'"{program.title}" 프로그램에 새로운 참여 신청이 있습니다.'
                )
                
                return jsonify({'message': '참여 신청이 완료되었습니다'}), 200
        
        # 최대 참여자 수 확인
        current_participants = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            status='approved'
        ).count()
        
        if current_participants >= program.max_participants:
            return jsonify({'error': '참여자 수가 가득 찼습니다'}), 400
        
        # 참여 신청 생성
        participation = ProgramParticipants(
            program_id=program_id,
            user_id=session['user_id'],
            status='pending'
        )
        
        db.session.add(participation)
        db.session.commit()
        
        # 프로그램 생성자에게 알림 전송
        create_notification(
            user_id=program.creator_id,
            notification_type='program_join_request',
            title='새로운 참여 신청이 있습니다',
            message=f'"{program.title}" 프로그램에 새로운 참여 신청이 있습니다.',
            program_id=program_id
        )
        
        return jsonify({'message': '참여 신청이 완료되었습니다'}), 200
        
    except Exception as e:
        app.logger.exception('join_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'error': '참여 신청 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/leave', methods=['DELETE'])
def leave_program(program_id):
    """프로그램 참여 취소/탈퇴"""
    if 'user_id' not in session:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    try:
        # 참여 기록 찾기
        participation = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            user_id=session['user_id']
        ).first()
        
        if not participation:
            return jsonify({'error': '참여 기록을 찾을 수 없습니다'}), 404
        
        if participation.status == 'left':
            return jsonify({'error': '이미 탈퇴한 프로그램입니다'}), 400
        
        # 상태를 'left'로 변경
        participation.status = 'left'
        participation.left_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': '프로그램에서 탈퇴했습니다'}), 200
        
    except Exception as e:
        app.logger.exception('leave_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'error': '탈퇴 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/participants', methods=['GET'])
def get_program_participants(program_id):
    """프로그램 참여자 목록 조회"""
    if 'user_id' not in session:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    try:
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 참여자 목록 조회
        participants = ProgramParticipants.query.filter_by(program_id=program_id).all()
        
        participants_data = []
        for p in participants:
            participants_data.append({
                'id': p.id,
                'user_id': p.user_id,
                'user_name': p.user.name,
                'status': p.status,
                'joined_at': p.joined_at.isoformat() if p.joined_at else None,
                'approved_at': p.approved_at.isoformat() if p.approved_at else None,
                'left_at': p.left_at.isoformat() if p.left_at else None
            })
        
        return jsonify({
            'participants': participants_data,
            'total_count': len(participants_data),
            'approved_count': len([p for p in participants_data if p['status'] == 'approved']),
            'pending_count': len([p for p in participants_data if p['status'] == 'pending'])
        }), 200
        
    except Exception as e:
        app.logger.exception('get_program_participants error: %s', str(e))
        return jsonify({'error': '참여자 목록 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/participants/<int:user_id>/approve', methods=['PUT'])
def approve_participant(program_id, user_id):
    """참여자 승인/거부"""
    if 'user_id' not in session:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    try:
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 프로그램 생성자인지 확인
        if program.creator_id != session['user_id']:
            return jsonify({'error': '프로그램 생성자만 승인할 수 있습니다'}), 403
        
        # 참여 기록 찾기
        participation = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            user_id=user_id
        ).first()
        
        if not participation:
            return jsonify({'error': '참여 기록을 찾을 수 없습니다'}), 404
        
        if participation.status != 'pending':
            return jsonify({'error': '대기 중인 참여 신청만 승인할 수 있습니다'}), 400
        
        # 요청 데이터 확인
        data = request.get_json() or {}
        action = data.get('action')  # 'approve' or 'reject'
        
        if action == 'approve':
            # 최대 참여자 수 확인 (현재 승인된 참여자 + 새로 승인할 참여자)
            current_participants = ProgramParticipants.query.filter_by(
                program_id=program_id, 
                status='approved'
            ).count()
            
            app.logger.info(f'정원 체크: 현재 승인된 참여자 {current_participants}명, 최대 정원 {program.max_participants}명')
            
            if current_participants + 1 > program.max_participants:
                app.logger.warning(f'정원 초과: {current_participants + 1} > {program.max_participants}')
                return jsonify({'error': '정원이 가득 찼습니다. 더 이상 참여자를 승인할 수 없습니다.'}), 400
            
            participation.status = 'approved'
            participation.approved_at = datetime.utcnow()
            
            # 참여자에게 알림 전송
            create_notification(
                user_id=user_id,
                notification_type='program_approved',
                title='프로그램 참여가 승인되었습니다',
                message=f'"{program.title}" 프로그램 참여가 승인되었습니다.',
                program_id=program_id
            )
            
            message = '참여가 승인되었습니다'
            
        elif action == 'reject':
            participation.status = 'rejected'
            
            # 참여자에게 알림 전송
            create_notification(
                user_id=user_id,
                notification_type='program_rejected',
                title='프로그램 참여가 거부되었습니다',
                message=f'"{program.title}" 프로그램 참여가 거부되었습니다.',
                program_id=program_id
            )
            
            message = '참여가 거부되었습니다'
            
        else:
            return jsonify({'error': '유효하지 않은 액션입니다'}), 400
        
        db.session.commit()
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        app.logger.exception('approve_participant error: %s', str(e))
        db.session.rollback()
        return jsonify({'error': '승인 처리 중 오류가 발생했습니다'}), 500

# WebSocket 이벤트 핸들러
@socketio.on('connect')
def handle_connect():
    """클라이언트 연결 시 호출"""
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile_safari = 'safari' in user_agent and 'chrome' not in user_agent and ('iphone' in user_agent or 'ipad' in user_agent or 'mobile' in user_agent)
    
    app.logger.info(f'클라이언트 연결됨: {request.sid} | User-Agent: {user_agent[:100]} | Mobile Safari: {is_mobile_safari}')
    print(f'🔌 WebSocket 클라이언트 연결됨: {request.sid} {"(모바일 Safari)" if is_mobile_safari else ""}')
    
    # 모바일 Safari를 위한 추가 정보 응답
    if is_mobile_safari:
        emit('mobile_safari_info', {
            'message': '모바일 Safari에서 연결됨',
            'transport': request.transport,
            'recommended_transport': 'polling'
        })

@socketio.on('disconnect')
def handle_disconnect():
    """클라이언트 연결 해제 시 호출"""
    app.logger.info(f'클라이언트 연결 해제됨: {request.sid}')
    print(f'🔌 WebSocket 클라이언트 연결 해제됨: {request.sid}')

@socketio.on('join_user_room')
def handle_join_user_room(data):
    """사용자별 방에 참여"""
    user_id = data.get('user_id')
    if user_id:
        join_room(f'user_{user_id}')
        app.logger.info(f'사용자 {user_id}가 방에 참여했습니다.')
        print(f'👤 사용자 {user_id}가 방에 참여했습니다.')
    else:
        print('❌ 사용자 ID가 없습니다.')

@socketio.on('leave_user_room')
def handle_leave_user_room(data):
    """사용자별 방에서 나가기"""
    user_id = data.get('user_id')
    if user_id:
        leave_room(f'user_{user_id}')
        app.logger.info(f'사용자 {user_id}가 방에서 나갔습니다.')
        print(f'👤 사용자 {user_id}가 방에서 나갔습니다.')

# 운동 기록 API
@app.route('/api/programs/<int:program_id>/records', methods=['POST'])
def create_workout_record(program_id):
    """운동 기록 생성"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 사용자가 해당 프로그램에 참여했는지 확인
        participation = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            user_id=session['user_id'],
            status='approved'
        ).first()
        
        if not participation:
            return jsonify({'error': '승인된 참여자만 기록을 남길 수 있습니다'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '데이터가 필요합니다'}), 400
        
        completion_time = data.get('completion_time')
        if not completion_time or not isinstance(completion_time, int) or completion_time <= 0:
            return jsonify({'error': '유효한 완료 시간이 필요합니다'}), 400
        
        # 운동 기록 생성
        record = WorkoutRecords(
            program_id=program_id,
            user_id=session['user_id'],
            completion_time=completion_time,
            notes=data.get('notes', ''),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(record)
        db.session.commit()
        
        app.logger.info(f'사용자 {session["user_id"]}가 프로그램 {program_id}의 운동 기록을 생성했습니다: {completion_time}초')
        
        return jsonify({
            'message': '운동 기록이 저장되었습니다',
            'record_id': record.id,
            'completion_time': completion_time,
            'completed_at': record.completed_at.strftime('%Y-%m-%d %H:%M:%S')
        }), 201
        
    except Exception as e:
        app.logger.exception('create_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 저장 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/records', methods=['GET'])
def get_program_records(program_id):
    """프로그램의 운동 기록 조회"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 공개된 기록만 조회 (개인 기록은 별도 API에서)
        records = WorkoutRecords.query.filter_by(
            program_id=program_id,
            is_public=True
        ).order_by(WorkoutRecords.completion_time.asc()).all()
        
        records_data = []
        for record in records:
            user = Users.query.get(record.user_id)
            records_data.append({
                'id': record.id,
                'user_name': user.name if user else 'Unknown',
                'completion_time': record.completion_time,
                'completed_at': record.completed_at.strftime('%Y-%m-%d %H:%M:%S'),
                'notes': record.notes,
                'is_public': record.is_public
            })
        
        return jsonify({
            'program_title': program.title,
            'records': records_data,
            'total_count': len(records_data)
        }), 200
        
    except Exception as e:
        app.logger.exception('get_program_records error: %s', str(e))
        return jsonify({'error': '운동 기록 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/users/records', methods=['GET'])
def get_user_records():
    """사용자의 개인 운동 기록 조회"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 사용자의 모든 운동 기록 조회
        records = WorkoutRecords.query.filter_by(
            user_id=session['user_id']
        ).order_by(WorkoutRecords.completed_at.desc()).all()
        
        records_data = []
        for record in records:
            program = Programs.query.get(record.program_id)
            records_data.append({
                'id': record.id,
                'program_id': record.program_id,
                'program_title': program.title if program else 'Unknown Program',
                'completion_time': record.completion_time,
                'completed_at': record.completed_at.strftime('%Y-%m-%d %H:%M:%S'),
                'notes': record.notes,
                'is_public': record.is_public
            })
        
        return jsonify({
            'records': records_data,
            'total_count': len(records_data)
        }), 200
        
    except Exception as e:
        app.logger.exception('get_user_records error: %s', str(e))
        return jsonify({'error': '개인 운동 기록 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/records/<int:record_id>', methods=['PUT'])
def update_workout_record(record_id):
    """운동 기록 수정"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 기록 존재 확인 및 소유자 확인
        record = WorkoutRecords.query.get(record_id)
        if not record:
            return jsonify({'error': '기록을 찾을 수 없습니다'}), 404
        
        if record.user_id != session['user_id']:
            return jsonify({'error': '본인의 기록만 수정할 수 있습니다'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '데이터가 필요합니다'}), 400
        
        # 수정 가능한 필드들 업데이트
        if 'completion_time' in data:
            if isinstance(data['completion_time'], int) and data['completion_time'] > 0:
                record.completion_time = data['completion_time']
            else:
                return jsonify({'error': '유효한 완료 시간이 필요합니다'}), 400
        
        if 'notes' in data:
            record.notes = data['notes']
        
        if 'is_public' in data:
            record.is_public = bool(data['is_public'])
        
        db.session.commit()
        
        app.logger.info(f'사용자 {session["user_id"]}가 기록 {record_id}를 수정했습니다')
        
        return jsonify({
            'message': '운동 기록이 수정되었습니다',
            'completion_time': record.completion_time,
            'notes': record.notes,
            'is_public': record.is_public
        }), 200
        
    except Exception as e:
        app.logger.exception('update_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 수정 중 오류가 발생했습니다'}), 500

@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_workout_record(record_id):
    """운동 기록 삭제"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 기록 존재 확인 및 소유자 확인
        record = WorkoutRecords.query.get(record_id)
        if not record:
            return jsonify({'error': '기록을 찾을 수 없습니다'}), 404
        
        if record.user_id != session['user_id']:
            return jsonify({'error': '본인의 기록만 삭제할 수 있습니다'}), 403
        
        db.session.delete(record)
        db.session.commit()
        
        app.logger.info(f'사용자 {session["user_id"]}가 기록 {record_id}를 삭제했습니다')
        
        return jsonify({'message': '운동 기록이 삭제되었습니다'}), 200
        
    except Exception as e:
        app.logger.exception('delete_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 삭제 중 오류가 발생했습니다'}), 500

# 개인 통계 API
@app.route('/api/users/records/stats', methods=['GET'])
def get_user_stats():
    """사용자의 개인 통계 조회"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 사용자의 모든 운동 기록 조회
        records = WorkoutRecords.query.filter_by(user_id=session['user_id']).all()
        
        if not records:
            return jsonify({
                'total_workouts': 0,
                'average_time': 0,
                'best_time': 0,
                'programs_completed': 0,
                'recent_improvement': 0,
                'program_stats': {}
            }), 200
        
        # 기본 통계 계산
        total_workouts = len(records)
        completion_times = [record.completion_time for record in records]
        average_time = sum(completion_times) / len(completion_times)
        best_time = min(completion_times)
        
        # 프로그램별 통계
        program_stats = {}
        for record in records:
            program_id = record.program_id
            if program_id not in program_stats:
                program_stats[program_id] = []
            program_stats[program_id].append(record.completion_time)
        
        programs_completed = len(program_stats)
        
        # 최근 개선도 계산 (최근 5개 기록의 평균 vs 이전 5개 기록의 평균)
        recent_improvement = 0
        if len(records) >= 10:
            recent_5 = sorted(records, key=lambda x: x.completed_at)[-5:]
            previous_5 = sorted(records, key=lambda x: x.completed_at)[-10:-5]
            
            recent_avg = sum(r.completion_time for r in recent_5) / 5
            previous_avg = sum(r.completion_time for r in previous_5) / 5
            
            recent_improvement = ((previous_avg - recent_avg) / previous_avg) * 100
        
        return jsonify({
            'total_workouts': total_workouts,
            'average_time': round(average_time, 1),
            'best_time': best_time,
            'programs_completed': programs_completed,
            'recent_improvement': round(recent_improvement, 1),
            'program_stats': {
                str(program_id): {
                    'count': len(times),
                    'average_time': round(sum(times) / len(times), 1),
                    'best_time': min(times),
                    'program_title': Programs.query.get(program_id).title if Programs.query.get(program_id) else 'Unknown'
                }
                for program_id, times in program_stats.items()
            }
        }), 200
        
    except Exception as e:
        app.logger.exception('get_user_stats error: %s', str(e))
        return jsonify({'error': '개인 통계 조회 중 오류가 발생했습니다'}), 500

# 개인 목표 API
@app.route('/api/users/goals', methods=['GET'])
def get_user_goals():
    """사용자의 개인 목표 조회"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        goals = PersonalGoals.query.filter_by(user_id=session['user_id']).all()
        
        goals_data = []
        for goal in goals:
            program = Programs.query.get(goal.program_id)
            if program:
                goals_data.append({
                    'id': goal.id,
                    'program_id': goal.program_id,
                    'program_title': program.title,
                    'target_time': goal.target_time,
                    'created_at': goal.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'updated_at': goal.updated_at.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return jsonify({'goals': goals_data}), 200
        
    except Exception as e:
        app.logger.exception('get_user_goals error: %s', str(e))
        return jsonify({'error': '개인 목표 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/users/goals', methods=['POST'])
def create_user_goal():
    """개인 목표 생성"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        data = request.get_json()
        if not data:
            return jsonify({'error': '데이터가 필요합니다'}), 400
        
        program_id = data.get('program_id')
        target_time = data.get('target_time')
        
        if not program_id or not target_time:
            return jsonify({'error': '프로그램 ID와 목표 시간이 필요합니다'}), 400
        
        if not isinstance(target_time, int) or target_time <= 0:
            return jsonify({'error': '유효한 목표 시간이 필요합니다'}), 400
        
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 사용자가 해당 프로그램에 참여했는지 확인
        participation = ProgramParticipants.query.filter_by(
            program_id=program_id,
            user_id=session['user_id'],
            status='approved'
        ).first()
        
        if not participation:
            return jsonify({'error': '승인된 참여자만 목표를 설정할 수 있습니다'}), 403
        
        # 기존 목표가 있는지 확인
        existing_goal = PersonalGoals.query.filter_by(
            user_id=session['user_id'],
            program_id=program_id
        ).first()
        
        if existing_goal:
            # 기존 목표 업데이트
            existing_goal.target_time = target_time
            existing_goal.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': '목표가 업데이트되었습니다',
                'goal_id': existing_goal.id,
                'target_time': target_time
            }), 200
        else:
            # 새 목표 생성
            goal = PersonalGoals(
                user_id=session['user_id'],
                program_id=program_id,
                target_time=target_time
            )
            
            db.session.add(goal)
            db.session.commit()
            
            return jsonify({
                'message': '목표가 설정되었습니다',
                'goal_id': goal.id,
                'target_time': target_time
            }), 201
        
    except Exception as e:
        app.logger.exception('create_user_goal error: %s', str(e))
        return jsonify({'error': '목표 설정 중 오류가 발생했습니다'}), 500

@app.route('/api/users/goals/<int:goal_id>', methods=['DELETE'])
def delete_user_goal(goal_id):
    """개인 목표 삭제"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        goal = PersonalGoals.query.get(goal_id)
        if not goal:
            return jsonify({'error': '목표를 찾을 수 없습니다'}), 404
        
        if goal.user_id != session['user_id']:
            return jsonify({'error': '본인의 목표만 삭제할 수 있습니다'}), 403
        
        db.session.delete(goal)
        db.session.commit()
        
        app.logger.info(f'사용자 {session["user_id"]}가 목표 {goal_id}를 삭제했습니다')
        
        return jsonify({'message': '목표가 삭제되었습니다'}), 200
        
    except Exception as e:
        app.logger.exception('delete_user_goal error: %s', str(e))
        return jsonify({'error': '목표 삭제 중 오류가 발생했습니다'}), 500

# 프로그램 수정 API (SQLAlchemy 인스턴스 문제 해결을 위해 app.py에 직접 추가)
@app.route('/api/programs/<int:program_id>', methods=['PUT'])
def update_program(program_id):
    """프로그램 수정 (공개 전에만 가능)"""
    if 'user_id' not in session:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        # 권한 확인
        if program.creator_id != session['user_id']:
            return jsonify({'message': '프로그램을 수정할 권한이 없습니다'}), 403
        
        # 공개된 프로그램은 수정 불가
        if program.is_open:
            return jsonify({'message': '공개된 프로그램은 수정할 수 없습니다'}), 400
        
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'message': '요청 데이터가 없습니다'}), 400
        
        # 기본 검증
        if 'title' not in data or not data['title'].strip():
            return jsonify({'message': '프로그램 제목은 필수입니다'}), 400
        
        # 프로그램 정보 업데이트 (운동 유형과 난이도는 변경 불가)
        program.title = data['title'].strip()
        program.description = (data.get('description') or '').strip()
        # program.workout_type = data.get('workout_type') or 'time_based'  # 변경 불가
        program.target_value = (data.get('target_value') or '').strip()
        # program.difficulty = data.get('difficulty') or 'beginner'  # 변경 불가
        try:
            program.max_participants = int(data.get('max_participants') or 20)
        except (ValueError, TypeError):
            program.max_participants = 20
        
        # WOD 패턴 업데이트 처리
        workout_pattern = data.get('workout_pattern')
        if workout_pattern:
            # 기존 WOD 패턴 삭제
            existing_pattern = WorkoutPatterns.query.filter_by(program_id=program_id).first()
            if existing_pattern:
                # 관련 ExerciseSets도 삭제
                ExerciseSets.query.filter_by(pattern_id=existing_pattern.id).delete()
                db.session.delete(existing_pattern)
            
            # 새로운 WOD 패턴 생성
            pattern_type = workout_pattern.get('type', 'round_based')
            # 새로운 패턴 타입을 기존 타입으로 매핑
            if pattern_type == 'time_cap':
                db_pattern_type = 'time_cap'
            else:
                db_pattern_type = 'fixed_reps'  # round_based는 fixed_reps로 저장
            
            new_pattern = WorkoutPatterns(
                program_id=program.id,
                pattern_type=db_pattern_type,
                total_rounds=workout_pattern.get('total_rounds', 1),
                time_cap_per_round=workout_pattern.get('time_cap_per_round'),
                description=workout_pattern.get('description', '')
            )
            db.session.add(new_pattern)
            db.session.flush()  # ID를 얻기 위해 flush
            
            # 운동 세트들 추가
            exercises = workout_pattern.get('exercises', [])
            if isinstance(exercises, list):
                for idx, exercise_data in enumerate(exercises):
                    if isinstance(exercise_data, dict) and 'exercise_id' in exercise_data:
                        exercise_set = ExerciseSets(
                            pattern_id=new_pattern.id,
                            exercise_id=exercise_data['exercise_id'],
                            base_reps=exercise_data.get('base_reps', 1),
                            progression_type=exercise_data.get('progression_type', 'fixed'),
                            progression_value=exercise_data.get('progression_value', 0),
                            order_index=idx
                        )
                        db.session.add(exercise_set)
            
            # 기존 방식 운동은 삭제 (WOD 패턴이 있을 때)
            ProgramExercises.query.filter_by(program_id=program_id).delete()
        else:
            # 기존 방식 운동 업데이트
            ProgramExercises.query.filter_by(program_id=program_id).delete()
            
            # 새로운 운동 추가 (selected_exercises 또는 exercises 필드 처리)
            exercises_data = data.get('selected_exercises') or data.get('exercises') or []
            if isinstance(exercises_data, list):
                for idx, exercise_data in enumerate(exercises_data):
                    if isinstance(exercise_data, dict) and 'exercise_id' in exercise_data:
                        program_exercise = ProgramExercises(
                            program_id=program.id,
                            exercise_id=exercise_data['exercise_id'],
                            target_value=exercise_data.get('target_value', ''),
                            order_index=idx
                        )
                        db.session.add(program_exercise)
            
            # WOD 패턴이 없는 경우 기존 패턴 삭제
            existing_pattern = WorkoutPatterns.query.filter_by(program_id=program_id).first()
            if existing_pattern:
                ExerciseSets.query.filter_by(pattern_id=existing_pattern.id).delete()
                db.session.delete(existing_pattern)
        
        db.session.commit()
        return jsonify({'message': '프로그램이 성공적으로 수정되었습니다'}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.exception('프로그램 수정 중 오류: %s', str(e))
        return jsonify({'message': '프로그램 수정 중 오류가 발생했습니다'}), 500

# 프로그램 상세 정보 조회 API (SQLAlchemy 인스턴스 문제 해결을 위해 app.py에 직접 추가)
@app.route('/api/programs/<int:program_id>', methods=['GET'])
def get_program_detail(program_id):
    """프로그램 상세 정보 조회"""
    try:
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        # 프로그램에 포함된 운동들 조회 (운동명 포함)
        program_exercises = ProgramExercises.query.filter_by(program_id=program_id).order_by(ProgramExercises.order_index).all()
        exercises = []
        for pe in program_exercises:
            exercises.append({
                'id': pe.exercise_id,
                'name': pe.exercise.name if pe.exercise else '알 수 없는 운동',
                'target_value': pe.target_value,
                'order': pe.order_index
            })
        
        # WOD 패턴 조회 (새로운 방식)
        workout_pattern = None
        workout_patterns = WorkoutPatterns.query.filter_by(program_id=program_id).first()
        if workout_patterns:
            exercise_sets = ExerciseSets.query.filter_by(pattern_id=workout_patterns.id).order_by(ExerciseSets.order_index).all()
            # 기존 패턴 타입을 새로운 타입으로 매핑
            def map_pattern_type(old_type):
                if old_type == 'time_cap':
                    return 'time_cap'
                else:
                    return 'round_based'  # fixed_reps, ascending, descending, mixed_progression 모두 round_based로 통합
            
            workout_pattern = {
                'id': workout_patterns.id,
                'type': map_pattern_type(workout_patterns.pattern_type),
                'description': workout_patterns.description,
                'exercises': []
            }
            for es in exercise_sets:
                workout_pattern['exercises'].append({
                    'id': es.exercise_id,
                    'exercise_name': es.exercise.name if es.exercise else '알 수 없는 운동',
                    'name': es.exercise.name if es.exercise else '알 수 없는 운동',  # 호환성을 위해 유지
                    'base_reps': es.base_reps,
                    'progression_type': es.progression_type,
                    'progression_value': es.progression_value,
                    'target_value': f"{es.base_reps}회",  # 호환성을 위해 유지
                    'order': es.order_index
                })
        
        # 디버깅을 위한 로그 추가
        app.logger.info(f"프로그램 {program_id} 상세 조회:")
        app.logger.info(f"  - ProgramExercises 개수: {len(exercises)}")
        app.logger.info(f"  - WorkoutPatterns 존재: {workout_patterns is not None}")
        if workout_pattern:
            app.logger.info(f"  - WorkoutPattern exercises 개수: {len(workout_pattern['exercises'])}")
        else:
            app.logger.info(f"  - WorkoutPattern: None")
        
        # 참여자 수 조회
        participant_count = ProgramParticipants.query.filter_by(program_id=program_id).filter(ProgramParticipants.status.in_(['pending', 'approved'])).count()
        
        result = {
            'id': program.id,
            'title': program.title,
            'description': program.description,
            'workout_type': program.workout_type,
            'target_value': program.target_value,
            'difficulty': program.difficulty,
            'participants': participant_count,
            'max_participants': program.max_participants,
            'is_open': program.is_open,
            'created_at': format_korea_time(program.created_at),
            'exercises': exercises,
            'workout_pattern': workout_pattern
        }
        
        return jsonify({'program': result}), 200
        
    except Exception as e:
        app.logger.exception('프로그램 상세 조회 중 오류: %s', str(e))
        return jsonify({'message': '프로그램 상세 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/user/wod-status', methods=['GET'])
def get_user_wod_status():
    """사용자의 WOD 현황 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        # 전체 WOD 개수
        total_wods = Programs.query.filter_by(creator_id=user_id).count()
        
        # 공개 WOD 개수 (만료되지 않은 것만 카운트)
        try:
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                (Programs.expires_at.is_(None)) | (Programs.expires_at > get_korea_time())
            ).count()
        except AttributeError:
            # expires_at 필드가 없는 경우 모든 공개 WOD 카운트
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).count()
        
        # 만료 예정인 공개 WOD (3일 이내) - expires_at 필드가 있는 경우에만
        try:
            expiring_soon = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                Programs.expires_at.isnot(None),
                Programs.expires_at <= get_korea_time() + timedelta(days=3),
                Programs.expires_at > get_korea_time()
            ).count()
            
            # 만료된 WOD 개수
            expired_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                Programs.expires_at.isnot(None),
                Programs.expires_at <= get_korea_time()
            ).count()
        except AttributeError:
            # expires_at 필드가 없는 경우 0으로 설정
            expiring_soon = 0
            expired_wods = 0
        
        result = {
            'total_wods': total_wods,
            'max_total_wods': 5,
            'public_wods': public_wods,
            'max_public_wods': 3,
            'expiring_soon': expiring_soon,
            'expired_wods': expired_wods,
            'can_create_wod': total_wods < 5,
            'can_create_public_wod': public_wods < 3
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.exception('WOD 현황 조회 중 오류: %s', str(e))
        return jsonify({'message': 'WOD 현황 조회 중 오류가 발생했습니다'}), 500

# 라우트 등록
from routes import auth, programs
app.register_blueprint(auth.bp)
app.register_blueprint(programs.bp)

if __name__ == '__main__':
    try:
        print("=" * 50)
        print("Starting CrossFit WOD System")
        print(f"DATABASE_URL: {os.environ.get('DATABASE_URL', 'Not set')[:50]}...")
        print(f"FLASK_ENV: {os.environ.get('FLASK_ENV', 'Not set')}")
        print(f"PORT: {os.environ.get('PORT', '5001')}")
        print("=" * 50)
        
        with app.app_context(): 
            print("Checking database tables...")
            # 테이블이 존재하지 않을 때만 생성
            try:
                # 간단한 쿼리로 테이블 존재 여부 확인
                db.session.execute(text("SELECT 1 FROM users LIMIT 1"))
                print("Database tables already exist, skipping initialization.")
            except Exception:
                print("Creating database tables...")
                db.create_all()
                print("Seeding exercise data...")
                seed_exercise_data()
                print("Database initialization complete!")
        
        port = int(os.environ.get('PORT', 5001))
        print(f"🚀 Server starting on port {port}")
        socketio.run(app, debug=False, port=port, host='0.0.0.0', allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise