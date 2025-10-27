"""
Flask Application - Refactored Version (v2)
Backend + Frontend 머지 후 최신 develop 기반
"""

from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets, logging, os
from logging.handlers import RotatingFileHandler
from sqlalchemy import text
from pathlib import Path

# .env.local 파일 로드 (로컬 PostgreSQL 사용)
env_file = Path(__file__).parent / '.env.local'
if env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
        print(f"✅ Loaded environment from {env_file}")
    except ImportError:
        # python-dotenv가 없으면 수동 로드
        print(f"⚠️  python-dotenv not installed, manually loading .env.local")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✅ Manually loaded environment from {env_file}")

# Utils import
from utils.timezone import format_korea_time, get_korea_time

# ==================================================================
# 인증 헬퍼 함수 (다른 모듈에서 import하므로 여기 유지)
# ==================================================================

def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수 (Safari 호환)"""
    # 0) Authorization: Bearer <token>
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if auth_header and isinstance(auth_header, str) and auth_header.lower().startswith('bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        try:
            from utils.token import verify_access_token
            user_id_from_token = verify_access_token(token)
            if user_id_from_token:
                session['user_id'] = user_id_from_token
                session.permanent = True
                app.logger.info(f'Authorization 토큰에서 사용자 ID 확인: {user_id_from_token}')
                return user_id_from_token
        except Exception as e:
            app.logger.info(f'Authorization 토큰 검증 실패: {e}')
    
    # 세션에서 확인
    user_id = session.get('user_id')
    if user_id:
        app.logger.info(f'세션에서 사용자 ID 확인: {user_id}')
        return user_id
    
    # Safari 대안: URL 파라미터
    user_id_param = request.args.get('user_id')
    if not user_id_param:
        query_string = request.query_string.decode('utf-8')
        if 'user_id=' in query_string:
            try:
                user_id_param = query_string.split('user_id=')[1].split('&')[0]
            except Exception:
                pass
    
    if user_id_param:
        try:
            user_id = int(user_id_param)
            session['user_id'] = user_id
            session.permanent = True
            return user_id
        except (ValueError, TypeError):
            pass

    # Safari 대안 인증 헤더
    safari_auth_header = (request.headers.get('X-Safari-Auth-Token') or 
                         request.headers.get('X-SAFARI-AUTH-TOKEN'))
    
    if safari_auth_header:
        try:
            import base64
            from models.user import Users as User
            parts = safari_auth_header.rsplit('_', 2)
            if len(parts) >= 2:
                email = base64.b64decode(parts[0]).decode('utf-8')
                user = User.query.filter_by(email=email).first()
                if user:
                    session['user_id'] = user.id
                    session.permanent = True
                    return user.id
        except Exception:
            pass

    # Safari 쿠키들
    for cookie_name in ['safari_auth', 'safari_session_backup', 'mobile_safari_auth']:
        cookie_value = request.cookies.get(cookie_name)
        if cookie_value:
            try:
                parts = cookie_value.split('_')
                if len(parts) >= 2:
                    user_id = int(parts[1])
                    session['user_id'] = user_id
                    session.permanent = True
                    return user_id
            except (ValueError, IndexError):
                pass

    # Safari 브라우저 자동 인증
    user_agent = request.headers.get('User-Agent', '').lower()
    is_safari = 'safari' in user_agent and 'chrome' not in user_agent
    if is_safari:
        safari_user_id = session.get('safari_user_id')
        if safari_user_id:
            session['user_id'] = safari_user_id
            session.permanent = True
            return safari_user_id

    return None


# ==================================================================
# Flask App 초기화
# ==================================================================

app = Flask(__name__)

# SocketIO 초기화 (Safari/Mobile 호환)
# CORS 허용 도메인 설정 - 동적 검증 함수 사용
def is_allowed_origin(origin):
    """Origin이 허용되는지 동적으로 검증"""
    if not origin:
        return False
    
    allowed_patterns = [
        'https://wodybody-web.vercel.app',  # 프로덕션
        'http://localhost:3000',  # 로컬 개발
        'http://127.0.0.1:3000'
    ]
    
    # 정확히 일치하는 경우
    if origin in allowed_patterns:
        app.logger.info(f'✅ CORS 허용 (정확 일치): {origin}')
        return True
    
    # Vercel 배포 도메인 검증 (.vercel.app으로 끝나는 경우)
    if origin.startswith('https://') and origin.endswith('.vercel.app'):
        app.logger.info(f'✅ CORS 허용 (Vercel 도메인): {origin}')
        return True
    
    app.logger.warning(f'❌ CORS 차단: {origin}')
    return False

app.logger.info('SocketIO CORS: 동적 검증 함수 사용 (모든 .vercel.app 허용)')

socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins='*',  # 모든 origin 허용 (credentials 없이)
    cors_credentials=False,  # Safari CORS 문제 해결 (withCredentials: false와 일치)
    # async_mode는 명시하지 않음 - Gunicorn eventlet worker가 자동 감지
    ping_timeout=60,  # Safari를 위한 긴 타임아웃
    ping_interval=25,  # Keep-alive 주기 (Safari 연결 유지)
    # transports는 서버에서 지정하지 않고 클라이언트에서 제어
    allow_upgrades=True,  # polling에서 websocket으로 업그레이드 허용
    cookie=None,  # 쿠키 사용하지 않음 (토큰 인증)
)

# 로깅 설정
os.makedirs('logs', exist_ok=True)
fh = RotatingFileHandler('logs/crossfit.log', maxBytes=1024*1024, backupCount=10, encoding='utf-8')
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
    app.logger.info("Railway 환경에서 실행 중")

# 세션 쿠키 설정 (Safari 호환)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_DOMAIN'] = None
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_COOKIE_PATH'] = '/'

# CORS 설정
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app,
     resources={r"/api/*": {
         "origins": cors_origins,
         "supports_credentials": True,
         "allow_headers": [
             "Content-Type", "Authorization", "X-Requested-With", 
             "Cache-Control", "Accept", "Accept-Language",
             "Sec-Fetch-Site", "Sec-Fetch-Mode", "Sec-Fetch-Dest",
             "Origin", "X-Safari-Auth-Token", "User-Agent"
         ],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
     }})

# Database 초기화 (config/database.py에서 import)
from config.database import db
db.init_app(app)

# Request/Response 로깅
@app.before_request
def _before():
    app.logger.info('Request: %s %s', request.method, request.url)

@app.after_request
def _after(resp):
    app.logger.info('Response: %s %s', resp.status_code, resp.status)
    return resp


# ==================================================================
# 모델 Import (models/ 폴더에서)
# ==================================================================

from models.user import Users
from models.program import Programs, Registrations, ProgramParticipants, PersonalGoals
from models.exercise import Exercises, ExerciseCategories, ProgramExercises, WorkoutPatterns, ExerciseSets
from models.notification import Notifications
from models.workout_record import WorkoutRecords


# ==================================================================
# Health Check & Debug Routes (여기 유지)
# ==================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """서비스 상태 확인"""
    try:
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'version': '2.0.0-refactored-v2'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500


@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Test successful', 'timestamp': datetime.utcnow().isoformat()}), 200


@app.route('/api/test-params', methods=['GET'])
def test_params():
    """쿼리 파라미터 테스트"""
    user_id = request.args.get('user_id')
    query_string = request.query_string.decode('utf-8')
    return jsonify({
        'user_id': user_id,
        'query_string': query_string,
        'all_args': dict(request.args)
    }), 200


@app.route('/api/test-headers', methods=['GET'])
def test_headers():
    """헤더 테스트"""
    return jsonify({
        'headers': dict(request.headers),
        'safari_headers': {k: v for k, v in request.headers.items() if 'safari' in k.lower()}
    }), 200


@app.route('/api/safari-auth', methods=['GET'])
def safari_auth():
    """Safari 인증 테스트"""
    user_id = get_user_id_from_session_or_cookies()
    return jsonify({
        'user_id': user_id,
        'session': dict(session),
        'cookies': dict(request.cookies),
        'user_agent': request.headers.get('User-Agent')
    }), 200


@app.route('/api/debug/session', methods=['GET'])
def debug_session():
    """세션 디버깅"""
    return jsonify({
        'session': dict(session),
        'cookies': dict(request.cookies),
        'headers': {k: v for k, v in request.headers.items() if k.startswith('X-') or k in ['User-Agent', 'Authorization']},
        'user_id': get_user_id_from_session_or_cookies()
    }), 200


@app.route('/api/debug/test-login', methods=['POST'])
def debug_test_login():
    """테스트 로그인"""
    data = request.get_json() or {}
    test_user_id = data.get('user_id', 1)
    session['user_id'] = test_user_id
    session.permanent = True
    return jsonify({
        'message': 'Test login successful',
        'user_id': test_user_id,
        'session': dict(session)
    }), 200


# ==================================================================
# 운동 데이터 시드 함수 (여기 유지)
# ==================================================================

def seed_exercise_data():
    """운동 카테고리와 운동 종류 시드 데이터 생성"""
    try:
        if ExerciseCategories.query.first():
            return
        
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
        
        db.session.flush()
        
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
            # 덤벨
            {'category_id': 2, 'name': '덤벨 스쿼트', 'description': '덤벨을 이용한 스쿼트'},
            {'category_id': 2, 'name': '덤벨 런지', 'description': '덤벨을 이용한 런지'},
            {'category_id': 2, 'name': '덤벨 프레스', 'description': '어깨 근력 운동'},
            {'category_id': 2, 'name': '덤벨 로우', 'description': '등 근력 운동'},
            {'category_id': 2, 'name': '덤벨 컬', 'description': '이두근 운동'},
            # 케틀벨
            {'category_id': 3, 'name': '케틀벨 스윙', 'description': '케틀벨 기본 운동'},
            {'category_id': 3, 'name': '케틀벨 고블릿 스쿼트', 'description': '케틀벨을 이용한 스쿼트'},
            {'category_id': 3, 'name': '케틀벨 터키시 겟업', 'description': '전신 복합 운동'},
            # 바벨
            {'category_id': 4, 'name': '바벨 스쿼트', 'description': '바벨을 이용한 스쿼트'},
            {'category_id': 4, 'name': '데드리프트', 'description': '전신 근력 운동'},
            {'category_id': 4, 'name': '벤치 프레스', 'description': '상체 근력 운동'},
            {'category_id': 4, 'name': '오버헤드 프레스', 'description': '어깨 근력 운동'},
        ]
        
        for ex_data in exercises:
            exercise = Exercises(**ex_data)
            db.session.add(exercise)
        
        db.session.commit()
        print("✅ Exercise data seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding exercise data: {e}")
        db.session.rollback()


# ==================================================================
# 블루프린트 등록
# ==================================================================

# Auth 라우트
from routes import auth
app.register_blueprint(auth.bp)

# Programs 라우트
from routes import programs
app.register_blueprint(programs.bp)

# Notifications 라우트
from routes import notifications
app.register_blueprint(notifications.bp)

# Workout Records 라우트
from routes import workout_records
app.register_blueprint(workout_records.bp)

# Exercises 라우트
from routes import exercises
app.register_blueprint(exercises.bp)

# Goals 라우트
from routes import goals
app.register_blueprint(goals.bp)

# WebSocket 이벤트 핸들러 등록 (app.py에 직접 정의)
@socketio.on('connect')
def handle_connect():
    """클라이언트 연결 시 호출"""
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile_safari = 'safari' in user_agent and 'chrome' not in user_agent and ('iphone' in user_agent or 'ipad' in user_agent or 'mobile' in user_agent)
    
    app.logger.info(f'클라이언트 연결됨: {request.sid} | User-Agent: {user_agent[:100]} | Mobile Safari: {is_mobile_safari}')
    print(f'🔌 WebSocket 클라이언트 연결됨: {request.sid} {"(모바일 Safari)" if is_mobile_safari else ""}')
    
    # 모바일 Safari 감지는 로그로만 처리 (emit 제거로 연결 안정성 향상)
    # emit()는 연결 완료 전에 호출되면 문제를 일으킬 수 있음

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

print("✅ All blueprints and WebSocket handlers registered successfully!")


# ==================================================================
# 애플리케이션 실행
# ==================================================================

if __name__ == '__main__':
    try:
        with app.app_context():
            # 데이터베이스 초기화
            try:
                db.session.execute(text("SELECT 1 FROM users LIMIT 1"))
                print("✅ Database tables already exist")
            except Exception:
                print("🔨 Creating database tables...")
                db.create_all()
                print("🌱 Seeding exercise data...")
                seed_exercise_data()
                print("✅ Database initialization complete!")
        
        port = int(os.environ.get('PORT', 5001))
        print(f"🚀 Server starting on port {port}")
        print(f"📦 Total lines in app.py: ~405 (was 2,703)")
        print(f"📈 Reduction: 85% smaller!")
        socketio.run(app, debug=False, port=port, host='0.0.0.0', allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
