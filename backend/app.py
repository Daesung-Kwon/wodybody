"""
Flask Application - Refactored Version (v2)
Backend + Frontend 머지 후 최신 develop 기반
"""

from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets, logging, os
from logging.handlers import RotatingFileHandler
from sqlalchemy import text
from pathlib import Path

# .env.local 파일 로드 (로컬 PostgreSQL 사용). Tests set FLASK_ENV=testing
# before import and must not pick up a developer DATABASE_URL.
env_file = Path(__file__).parent / '.env.local'
if env_file.exists() and os.environ.get('FLASK_ENV') != 'testing':
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
from utils.auth import get_current_user_id as get_user_id_from_session_or_cookies  # noqa: F401


# ==================================================================
# Flask App 초기화
# ==================================================================

app = Flask(__name__)

_cors_origins = [
    o.strip()
    for o in os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000',
    ).split(',')
    if o.strip()
]

socketio = SocketIO(
    app,
    logger=True,
    engineio_logger=True,
    cors_allowed_origins=_cors_origins,
    cors_credentials=False,
    ping_timeout=60,
    ping_interval=25,
    allow_upgrades=True,
    cookie=None,
)

# 로깅 설정
os.makedirs('logs', exist_ok=True)
fh = RotatingFileHandler('logs/crossfit.log', maxBytes=1024*1024, backupCount=10, encoding='utf-8')
fh.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
fh.setLevel(logging.INFO)
app.logger.addHandler(fh)
app.logger.setLevel(logging.INFO)

# Config
IS_RAILWAY = os.environ.get('RAILWAY_ENVIRONMENT') is not None
IS_PRODUCTION = IS_RAILWAY or os.environ.get('FLASK_ENV') == 'production'

_database_url = os.environ.get('DATABASE_URL', '')
if _database_url.startswith('postgres://'):
    _database_url = 'postgresql://' + _database_url[len('postgres://'):]
    os.environ['DATABASE_URL'] = _database_url

if IS_PRODUCTION:
    if not os.environ.get('SECRET_KEY'):
        raise RuntimeError('SECRET_KEY is required in production')
    if not _database_url.startswith('postgresql'):
        raise RuntimeError('DATABASE_URL must be postgresql in production')
    if os.environ.get('CORS_ORIGINS', '').strip() in ('', 'http://localhost:3000'):
        app.logger.warning('CORS_ORIGINS looks like a localhost default in production')

app.config['SQLALCHEMY_DATABASE_URI'] = _database_url or 'sqlite:///crossfit.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or (
    None if IS_PRODUCTION else secrets.token_hex(32)
)

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
cors_origins = _cors_origins
CORS(app,
     resources={r"/api/*": {
         "origins": cors_origins,
         "supports_credentials": True,
         "allow_headers": [
             "Content-Type", "Authorization", "X-Requested-With",
             "Cache-Control", "Accept", "Accept-Language",
             "Sec-Fetch-Site", "Sec-Fetch-Mode", "Sec-Fetch-Dest",
             "Origin", "User-Agent",
             # BurnFat 코치(Sprint 2.5): 세션 소유권 검증용 커스텀 헤더.
             # 누락 시 CORS preflight 가 막혀 코치 요청이 "Load failed" 로 실패.
             "X-Device-Secret"
         ],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
     }})

# Database 초기화 (config/database.py에서 import)
from config.database import db
db.init_app(app)

# Flask-Mail 초기화
from utils.email import init_mail
init_mail(app)
app.logger.info('Flask-Mail initialized')

# Request/Response 로깅
@app.before_request
def _before():
    app.logger.info('Request: %s %s', request.method, request.path)

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
from models.password_reset import PasswordReset
from models.email_verification import EmailVerification


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


# Development-only debug routes live in routes/debug.py and are registered below.
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

# Password Reset 라우트
from routes import password_reset
app.register_blueprint(password_reset.bp)

# Email Verification 라우트 (회원가입용)
from routes import email_verification
app.register_blueprint(email_verification.bp)

# BurnFat AI Advice 라우트 (Grok 프록시, /api/burnfat/*)
from routes import burnfat_ai
app.register_blueprint(burnfat_ai.bp)

# BurnFat 대화형 코치 라우트 (Sprint 2.5, SSE 스트리밍, /api/burnfat/coach/*)
from routes import burnfat_coach
app.register_blueprint(burnfat_coach.bp)

# WODYBODY PT — 사용자 선호 설정
from routes import preferences as pt_preferences
app.register_blueprint(pt_preferences.bp)

# WODYBODY PT — 오늘의 WOD
from routes import today as pt_today
app.register_blueprint(pt_today.bp)

# WODYBODY PT — Grok 추천 엔진(내부/디버그)
from routes import recommendations as pt_recommendations
app.register_blueprint(pt_recommendations.bp)

# WODYBODY PT — 푸시 토큰 등록
from routes import push as pt_push
app.register_blueprint(pt_push.bp)

if os.environ.get('FLASK_ENV') == 'development':
    from routes import debug as debug_routes
    app.register_blueprint(debug_routes.bp)

# sid -> verified user_id. Socket.IO cookies are off; do not trust client user_id.
_socket_users = {}


def _token_from_socket_connect(auth):
    if isinstance(auth, dict):
        token = auth.get('token')
        if token:
            return str(token).strip()
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization') or ''
    if auth_header.lower().startswith('bearer '):
        return auth_header.split(' ', 1)[1].strip()
    return None


@socketio.on('connect')
def handle_connect(auth=None):
    from utils.token import verify_access_token

    token = _token_from_socket_connect(auth)
    user_id = verify_access_token(token) if token else None
    if not user_id:
        app.logger.info('SocketIO connect rejected: missing or invalid token sid=%s', request.sid)
        return False
    _socket_users[request.sid] = int(user_id)
    join_room(f'user_{user_id}')
    app.logger.info('SocketIO connected user_id=%s sid=%s', user_id, request.sid)
    return True


@socketio.on('disconnect')
def handle_disconnect():
    user_id = _socket_users.pop(request.sid, None)
    app.logger.info('SocketIO disconnected user_id=%s sid=%s', user_id, request.sid)


@socketio.on('join_user_room')
def handle_join_user_room(data):
    user_id = _socket_users.get(request.sid)
    if not user_id:
        return
    join_room(f'user_{user_id}')
    app.logger.info('SocketIO join_user_room user_id=%s', user_id)


@socketio.on('leave_user_room')
def handle_leave_user_room(data):
    user_id = _socket_users.get(request.sid)
    if not user_id:
        return
    leave_room(f'user_{user_id}')
    app.logger.info('SocketIO leave_user_room user_id=%s', user_id)

print("✅ All blueprints and WebSocket handlers registered successfully!")


# ==================================================================
# WODYBODY PT — 일일 푸시 워커 (APScheduler 인-프로세스)
# ==================================================================
if os.environ.get('FLASK_ENV') != 'testing':
    try:
        from utils.scheduler import start_scheduler
        start_scheduler(app)
    except Exception as _scheduler_exc:  # pragma: no cover
        app.logger.warning('PT push scheduler start skipped: %s', _scheduler_exc)


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
