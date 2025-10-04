"""프로그램 관련 라우트"""

from flask import Blueprint, request, jsonify, session, current_app
from models.program import Programs, Registrations, ProgramParticipants
from models.exercise import ProgramExercises, WorkoutPatterns, ExerciseSets
from models.notification import Notifications
from models.user import Users
from utils.validators import validate_program
from utils.timezone import format_korea_time
from datetime import datetime

# 블루프린트 생성
bp = Blueprint('programs', __name__, url_prefix='/api')

@bp.route('/programs', methods=['GET'])
def get_programs():
    """프로그램 목록 조회"""
    try:
        programs = Programs.query.filter_by(is_open=True).order_by(Programs.created_at.desc()).all()
        current_user_id = session.get('user_id')  # 비로그인 시 None
        result = []
        
        for p in programs:
            creator = db.session.query(db.Model).get(p.creator_id)  # 임시로 수정 필요
            # 새로운 참여 시스템 사용
            participant_count = ProgramParticipants.query.filter_by(program_id=p.id, status='approved').count()
            is_registered = False
            participation_status = None
            
            if current_user_id:
                participation = ProgramParticipants.query.filter_by(program_id=p.id, user_id=current_user_id).first()
                if participation:
                    is_registered = participation.status in ['pending', 'approved']
                    participation_status = participation.status
            
            # 프로그램에 포함된 운동들 조회 (기존 방식) - 운동명 포함
            program_exercises = ProgramExercises.query.filter_by(program_id=p.id).order_by(ProgramExercises.order_index).all()
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
                
                # 기존 패턴 타입을 새로운 타입으로 매핑
                def map_pattern_type(old_type):
                    if old_type == 'time_cap':
                        return 'time_cap'
                    else:
                        return 'round_based'  # fixed_reps, ascending, descending, mixed_progression 모두 round_based로 통합
                
                workout_pattern = {
                    'type': map_pattern_type(workout_patterns.pattern_type),
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
                'target_value': p.target_value,
                'difficulty': p.difficulty,
                'participants': participant_count,
                'max_participants': p.max_participants,
                'created_at': format_korea_time(p.created_at),
                'is_registered': is_registered,
                'participation_status': participation_status,
                'exercises': exercises,
                'workout_pattern': workout_pattern
            })
        
        return jsonify({'programs': result}), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('get_programs error: %s', str(e))
        return jsonify({'message': '프로그램 조회 중 오류가 발생했습니다'}), 500

@bp.route('/programs', methods=['POST'])
def create_program():
    """프로그램 생성"""
    try:
        # Safari 호환 인증 방식을 위해 app.py의 함수 사용
        from app import get_user_id_from_session_or_cookies
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        data = request.get_json(silent=True)
        error = validate_program(data)
        if error:
            return jsonify({'message': error}), 400
        
        # 프로그램 생성
        program = Programs(
            creator_id=user_id,
            title=data['title'].strip(),
            description=(data.get('description') or '').strip(),
            workout_type=data.get('workout_type') or 'time_based',
            target_value=(data.get('target_value') or '').strip(),
            difficulty=data.get('difficulty') or 'beginner',
            max_participants=int(data.get('max_participants') or 20)
        )
        
        db.session.add(program)
        db.session.flush()  # ID를 얻기 위해 flush
        
        # 프로그램 생성 알림 전송
        create_notification(
            user_id=user_id,
            notification_type='program_created',
            title='새 프로그램이 등록되었습니다',
            message=f'"{data["title"].strip()}" 프로그램이 성공적으로 등록되었습니다.',
            program_id=program.id
        )
        
        # 선택된 운동들을 ProgramExercises에 저장 (기존 방식)
        selected_exercises = data.get('selected_exercises', [])
        if selected_exercises:
            for idx, exercise_data in enumerate(selected_exercises):
                pe = ProgramExercises(
                    program_id=program.id,
                    exercise_id=exercise_data['exercise_id'],
                    target_value=exercise_data.get('target_value', ''),
                    order_index=exercise_data.get('order', idx)
                )
                db.session.add(pe)
        
        # WOD 패턴 저장 (새로운 방식)
        workout_pattern = data.get('workout_pattern')
        if workout_pattern:
            wp = WorkoutPatterns(
                program_id=program.id,
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
        return jsonify({'message': '프로그램이 생성되었습니다', 'program_id': program.id}), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('create_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '프로그램 생성 중 오류가 발생했습니다'}), 500

@bp.route('/user/programs', methods=['GET'])
def my_programs():
    """내 프로그램 목록 조회"""
    try:
        if 'user_id' not in session:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        mine = Programs.query.filter_by(creator_id=session['user_id']).order_by(Programs.created_at.desc()).all()
        out = []
        
        for p in mine:
            cnt = Registrations.query.filter_by(program_id=p.id).count()
            out.append({
                'id': p.id,
                'title': p.title,
                'description': p.description,
                'is_open': p.is_open,
                'participants': cnt,
                'max_participants': p.max_participants,
                'created_at': p.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({'programs': out}), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('my_programs error: %s', str(e))
        return jsonify({'message': '프로그램 조회 중 오류가 발생했습니다'}), 500

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
        
        # 실시간 알림 전송 (SocketIO는 별도로 처리 필요)
        # socketio.emit('notification', notification_data, room=f'user_{user_id}')
        
        return notification
        
    except Exception as e:
        from flask import current_app
        current_app.logger.exception('알림 생성 중 오류: %s', str(e))
        print(f'❌ 알림 생성 오류: {str(e)}')
        db.session.rollback()
        return None

# 프로그램 수정 API는 app.py에 직접 구현됨 (SQLAlchemy 인스턴스 문제 해결)

# 프로그램 상세 조회 API는 app.py에 직접 구현됨 (SQLAlchemy 인스턴스 문제 해결)
