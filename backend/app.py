from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets, logging, os
from logging.handlers import RotatingFileHandler

app = Flask(__name__)

# SocketIO 초기화
socketio = SocketIO(app, 
    cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    cors_credentials=True,
    logger=True,
    engineio_logger=True
)

# Logs
os.makedirs('logs', exist_ok=True)
fh = RotatingFileHandler('logs/crossfit.log', maxBytes=1024*1024, backupCount=5, encoding='utf-8')
fh.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
fh.setLevel(logging.INFO)
app.logger.addHandler(fh)
app.logger.setLevel(logging.INFO)

# Config
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///crossfit.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = secrets.token_hex(32)
# 개발 환경 쿠키
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # 동일 출처 탭 내 요청에는 쿠키 허용[16]
app.config['SESSION_COOKIE_SECURE'] = False     # localhost 개발환경은 False[6]
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# CORS (정확한 Origin 지정 + Credentials 허용)[6]
CORS(app,
     resources={r"/api/*": {
         "origins": ["http://localhost:3000"],
         "supports_credentials": True,
         "allow_headers": ["Content-Type", "Authorization"],
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

@app.route('/api/user/profile', methods=['GET'])
def profile():
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
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        pw = data.get('password') or ''
        if not email or not pw:
            return jsonify({'message':'이메일과 비밀번호가 필요합니다'}), 400
        u = Users.query.filter_by(email=email).first()
        if u and u.check_password(pw):
            session['user_id'] = u.id
            return jsonify({'message':'로그인 성공','user_id':u.id,'name':u.name}), 200
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
        
        # 프로그램 생성
        p = Programs(
            creator_id=session['user_id'],
            title=data['title'].strip(),
            description=(data.get('description') or '').strip(),
            workout_type=data.get('workout_type') or 'time_based',
            target_value=(data.get('target_value') or '').strip(),  # 기존 호환성을 위해 유지
            difficulty=data.get('difficulty') or 'beginner',
            max_participants=int(data.get('max_participants') or 20)
        )
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
        programs = Programs.query.filter_by(is_open=True).order_by(Programs.created_at.desc()).all()
        current_user_id = session.get('user_id')  # 비로그인 시 None
        result = []
        for p in programs:
            creator = Users.query.get(p.creator_id)
            # 새로운 참여 시스템 사용
            participant_count = ProgramParticipants.query.filter_by(program_id=p.id, status='approved').count()
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
                'created_at': p.created_at.strftime('%Y-%m-%d %H:%M'),
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
        p.is_open = True
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
            cnt = Registrations.query.filter_by(program_id=p.id).count()
            out.append({
                'id':p.id,'title':p.title,'description':p.description,'is_open':p.is_open,
                'participants':cnt,'max_participants':p.max_participants,'created_at':p.created_at.strftime('%Y-%m-%d %H:%M')
            })
        return jsonify({'programs':out}), 200
    except Exception as e:
        app.logger.exception('my_programs error: %s', str(e))
        return jsonify({'message':'프로그램 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/programs/<int:program_id>/results', methods=['GET'])
def program_results(program_id):
    try:
        if 'user_id' not in session:
            return jsonify({'message': '로그인이 필요합니다'}), 401

        program = Programs.query.get(program_id)
        if not program or program.creator_id != session['user_id']:  # 소유자만 조회
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
        if 'user_id' not in session: return jsonify({'message':'로그인이 필요합니다'}), 401
        reg = Registrations.query.get(registration_id)
        if not reg or reg.user_id != session['user_id']:
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
        
        # 5. 프로그램 삭제 전에 알림 전송
        create_notification(
            user_id=program.creator_id,
            notification_type='program_deleted',
            title='프로그램이 삭제되었습니다',
            message=f'"{program.title}" 프로그램이 삭제되었습니다.',
            program_id=program.id
        )
        
        # 6. 프로그램 삭제
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
            # 최대 참여자 수 확인
            current_participants = ProgramParticipants.query.filter_by(
                program_id=program_id, 
                status='approved'
            ).count()
            
            if current_participants >= program.max_participants:
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
    app.logger.info(f'클라이언트 연결됨: {request.sid}')
    print(f'🔌 WebSocket 클라이언트 연결됨: {request.sid}')

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

if __name__ == '__main__':
    with app.app_context(): 
        db.create_all()
        seed_exercise_data()
    print("🚀 http://localhost:5001"); socketio.run(app, debug=True, port=5001, host='0.0.0.0')