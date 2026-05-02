"""프로그램 관련 라우트"""

import os

from flask import Blueprint, request, jsonify, session, current_app
from config.database import db
from models.program import Programs, Registrations, ProgramParticipants
from models.exercise import ProgramExercises, WorkoutPatterns, ExerciseSets
from models.notification import Notifications
from models.user import Users
from utils.validators import validate_program
from utils.timezone import format_korea_time
from datetime import datetime, timedelta

# 블루프린트 생성
bp = Blueprint('programs', __name__, url_prefix='/api')


# ==================================================================
# 마켓플레이스 기능 플래그 (PT 모델로 전환되며 deprecate)
# ==================================================================
# 환경변수 MARKETPLACE_ENABLED=true 면 기존 마켓플레이스 라우트가 부활.
# 기본값 false: /open, /join, /leave, /participants(...), /results, /approve 는 410 Gone.
MARKETPLACE_ENABLED = os.environ.get('MARKETPLACE_ENABLED', 'false').lower() == 'true'


def _gone_if_marketplace_disabled():
    """마켓플레이스가 비활성화된 경우 410 Gone 응답을 반환. 활성화면 None."""
    if not MARKETPLACE_ENABLED:
        return jsonify({
            'error': 'gone',
            'message': '공개 마켓플레이스 기능은 PT 모델로 전환되어 종료되었습니다.',
            'replacement': '/api/today'
        }), 410
    return None

@bp.route('/programs', methods=['GET'])
def get_programs():
    """프로그램 목록 조회"""
    try:
        programs = Programs.query.filter_by(is_open=True).order_by(Programs.created_at.desc()).all()
        # 비로그인도 허용하지만, 로그인한 경우 참여 상태 확인
        current_user_id = get_user_id_from_session_or_cookies()  # Authorization 헤더에서도 가져옴
        result = []
        
        for p in programs:
            # Creator 정보 조회 (예외 처리 추가)
            try:
                creator = Users.query.get(p.creator_id)
                creator_name = creator.name if creator else 'Unknown'
            except Exception as e:
                current_app.logger.warning(f'Creator 조회 실패 (program_id={p.id}, creator_id={p.creator_id}): {e}')
                creator_name = 'Unknown'
            
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
                'creator_name': creator_name,
                'workout_type': p.workout_type,
                'target_value': p.target_value,
                'difficulty': p.difficulty,
                'participants': participant_count,
                'max_participants': p.max_participants,
                'created_at': format_korea_time(p.created_at),
                'expires_at': p.expires_at.isoformat() if p.expires_at else None,
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

@bp.route('/programs/<int:program_id>', methods=['GET'])
def get_program_detail(program_id):
    """프로그램 상세 조회 (공개 프로그램 또는 본인이 만든 프로그램)"""
    try:
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        # 로그인 사용자 확인
        current_user_id = get_user_id_from_session_or_cookies()
        
        # 권한 체크: 공개 프로그램이 아니면 creator만 조회 가능
        if not program.is_open:
            if not current_user_id or current_user_id != program.creator_id:
                return jsonify({'message': '프로그램을 조회할 권한이 없습니다'}), 403
        
        # Creator 정보 조회
        try:
            creator = Users.query.get(program.creator_id)
            creator_name = creator.name if creator else 'Unknown'
        except Exception as e:
            current_app.logger.warning(f'Creator 조회 실패 (program_id={program.id}, creator_id={program.creator_id}): {e}')
            creator_name = 'Unknown'
        
        # 참여자 수 및 참여 상태 확인
        participant_count = ProgramParticipants.query.filter_by(program_id=program.id, status='approved').count()
        is_registered = False
        participation_status = None
        
        if current_user_id:
            participation = ProgramParticipants.query.filter_by(program_id=program.id, user_id=current_user_id).first()
            if participation:
                is_registered = participation.status in ['pending', 'approved']
                participation_status = participation.status
        
        # 프로그램에 포함된 운동들 조회 (기존 방식)
        program_exercises = ProgramExercises.query.filter_by(program_id=program.id).order_by(ProgramExercises.order_index).all()
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
        workout_patterns = WorkoutPatterns.query.filter_by(program_id=program.id).first()
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
                    return 'round_based'
            
            workout_pattern = {
                'type': map_pattern_type(workout_patterns.pattern_type),
                'total_rounds': workout_patterns.total_rounds,
                'time_cap_per_round': workout_patterns.time_cap_per_round,
                'description': workout_patterns.description,
                'exercises': pattern_exercises
            }
        
        result = {
            'id': program.id,
            'title': program.title,
            'description': program.description,
            'creator_name': creator_name,
            'creator_id': program.creator_id,
            'workout_type': program.workout_type,
            'target_value': program.target_value,
            'difficulty': program.difficulty,
            'participants': participant_count,
            'max_participants': program.max_participants,
            'created_at': format_korea_time(program.created_at),
            'expires_at': program.expires_at.isoformat() if program.expires_at else None,
            'is_open': program.is_open,
            'is_registered': is_registered,
            'participation_status': participation_status,
            'exercises': exercises,
            'workout_pattern': workout_pattern
        }
        
        return jsonify({'program': result}), 200
        
    except Exception as e:
        current_app.logger.exception('get_program_detail error: %s', str(e))
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

@bp.route('/programs/<int:program_id>/open', methods=['POST'])
def open_program(program_id):
    """[DEPRECATED] 프로그램 공개 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        p = Programs.query.get(program_id)
        if not p:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        if p.creator_id != user_id:
            return jsonify({'message': '프로그램을 공개할 권한이 없습니다'}), 403
        
        # 공개 WOD 개수 제한 확인
        from sqlalchemy import text
        from utils.timezone import get_korea_time
        current_time = get_korea_time()
        if hasattr(current_time, 'replace'):
            current_time = current_time.replace(tzinfo=None)
        
        try:
            count_result = db.session.execute(
                text("""
                    SELECT COUNT(*) FROM programs 
                    WHERE creator_id = :user_id 
                    AND is_open = TRUE 
                    AND (expires_at IS NULL OR expires_at > :current_time)
                """),
                {"user_id": user_id, "current_time": current_time}
            ).fetchone()
            public_wods = count_result[0] if count_result else 0
        except Exception as e:
            current_app.logger.warning(f"공개 WOD 개수 확인 실패: {e}")
            db.session.rollback()  # 트랜잭션 롤백 필수!
            try:
                public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).count()
            except Exception:
                public_wods = 0
        
        if public_wods >= 3:
            return jsonify({'message': '공개 WOD 개수 제한에 도달했습니다. (최대 3개)'}), 400
        
        p.is_open = True
        db.session.commit()
        
        # 만료 시간 설정 (별도 트랜잭션으로 처리)
        try:
            from utils.timezone import get_korea_time
            expires_at = get_korea_time() + timedelta(days=7)
            if hasattr(expires_at, 'replace'):
                expires_at = expires_at.replace(tzinfo=None)
            
            db.session.execute(
                text("UPDATE programs SET expires_at = :expires_at WHERE id = :program_id"),
                {"expires_at": expires_at, "program_id": program_id}
            )
            db.session.commit()
            current_app.logger.info(f"만료 시간 설정 완료: {expires_at}")
        except Exception as e:
            current_app.logger.error(f"expires_at 설정 실패: {e}")
            db.session.rollback()
            # 만료 시간 설정 실패해도 공개는 성공으로 처리
        
        # 브로드캐스트 알림
        try:
            broadcast_program_notification(
                program_id=p.id,
                notification_type='program_opened',
                title='새로운 프로그램이 공개되었습니다',
                message=f'새로운 "{p.title}" 프로그램이 공개되었습니다.'
            )
        except Exception:
            pass
        
        return jsonify({'message': '프로그램이 공개되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('open_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '프로그램 공개 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/join', methods=['POST'])
def join_program(program_id):
    """[DEPRECATED] 프로그램 참여 신청 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program or not program.is_open:
            return jsonify({'message': '참여할 수 없는 프로그램입니다'}), 400
        
        # 기존 참여 확인
        existing = ProgramParticipants.query.filter_by(
            program_id=program_id, user_id=user_id
        ).first()
        
        if existing:
            if existing.status == 'left':
                existing.status = 'pending'
                existing.joined_at = datetime.utcnow()
                db.session.commit()
                return jsonify({'message': '프로그램 참여가 재신청되었습니다'}), 200
            return jsonify({'message': '이미 신청한 프로그램입니다'}), 400
        
        # 새 참여 생성
        participant = ProgramParticipants(
            program_id=program_id,
            user_id=user_id,
            status='pending'
        )
        db.session.add(participant)
        db.session.commit()
        
        # 크리에이터에게 알림
        try:
            user = Users.query.get(user_id)
            create_notification(
                user_id=program.creator_id,
                notification_type='join_request',
                title='새로운 참여 신청',
                message=f'{user.name if user else "사용자"}님이 "{program.title}" 프로그램에 참여 신청했습니다.',
                program_id=program_id
            )
        except Exception:
            pass
        
        return jsonify({'message': '프로그램 참여 신청이 완료되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('join_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '참여 신청 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/leave', methods=['DELETE'])
def leave_program(program_id):
    """[DEPRECATED] 프로그램 참여 취소 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        participant = ProgramParticipants.query.filter_by(
            program_id=program_id, user_id=user_id
        ).first()
        
        if not participant:
            return jsonify({'message': '참여 내역이 없습니다'}), 400
        
        participant.status = 'left'
        db.session.commit()
        
        return jsonify({'message': '프로그램 참여가 취소되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('leave_program error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '참여 취소 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/participants', methods=['GET'])
def get_program_participants(program_id):
    """[DEPRECATED] 프로그램 참여자 목록 조회 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        if program.creator_id != user_id:
            return jsonify({'message': '권한이 없습니다'}), 403
        
        participants = ProgramParticipants.query.filter_by(program_id=program_id).all()
        approved_count = ProgramParticipants.query.filter_by(
            program_id=program_id, status='approved'
        ).count()
        
        result = []
        for p in participants:
            user = Users.query.get(p.user_id)
            result.append({
                'id': p.id,
                'user_id': p.user_id,
                'user_name': user.name if user else 'Unknown',
                'status': p.status,
                'joined_at': p.joined_at.isoformat()
            })
        
        return jsonify({
            'participants': result,
            'approved_count': approved_count
        }), 200
    except Exception as e:
        current_app.logger.exception('get_program_participants error: %s', str(e))
        return jsonify({'message': '참여자 조회 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/participants/<int:user_id>/approve', methods=['PUT'])
def approve_participant(program_id, user_id):
    """[DEPRECATED] 참여자 승인/거부 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        creator_id = get_user_id_from_session_or_cookies()
        if not creator_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program or program.creator_id != creator_id:
            return jsonify({'message': '권한이 없습니다'}), 403
        
        data = request.get_json() or {}
        action = data.get('action')
        
        if action not in ['approve', 'reject']:
            return jsonify({'message': '유효하지 않은 액션입니다'}), 400
        
        participant = ProgramParticipants.query.filter_by(
            program_id=program_id, user_id=user_id
        ).first()
        
        if not participant:
            return jsonify({'message': '참여자를 찾을 수 없습니다'}), 404
        
        if action == 'approve':
            # 정원 확인
            approved_count = ProgramParticipants.query.filter_by(
                program_id=program_id, status='approved'
            ).count()
            
            if approved_count >= program.max_participants:
                return jsonify({'message': '정원이 가득 찼습니다'}), 400
            
            participant.status = 'approved'
        else:
            participant.status = 'rejected'
        
        db.session.commit()
        
        # 알림 전송
        try:
            user = Users.query.get(user_id)
            create_notification(
                user_id=user_id,
                notification_type='participation_' + action + 'd',
                title='참여 신청 ' + ('승인' if action == 'approve' else '거부'),
                message=f'"{program.title}" 프로그램 참여가 ' + ('승인되었습니다' if action == 'approve' else '거부되었습니다'),
                program_id=program_id
            )
        except Exception:
            pass
        
        return jsonify({'message': f'참여자가 {action}되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('approve_participant error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '처리 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/results', methods=['GET'])
def program_results(program_id):
    """[DEPRECATED] 프로그램 결과 조회 — 마켓플레이스 deprecate."""
    gone = _gone_if_marketplace_disabled()
    if gone is not None:
        return gone
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program or program.creator_id != user_id:
            return jsonify({'message': '권한이 없습니다'}), 403
        
        participants = ProgramParticipants.query.filter_by(program_id=program_id).all()
        
        out = []
        for participant in participants:
            u = Users.query.get(participant.user_id)
            out.append({
                'user_name': u.name if u else 'Unknown',
                'result': '',
                'completed': participant.status == 'approved',
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
        current_app.logger.exception('program_results error: %s', str(e))
        return jsonify({'message': '결과 조회 중 오류가 발생했습니다'}), 500


@bp.route('/user/programs', methods=['GET'])
def my_programs():
    """내 프로그램 목록 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        mine = Programs.query.filter_by(creator_id=user_id).order_by(Programs.created_at.desc()).all()
        
        # expires_at 일괄 조회
        from sqlalchemy import text
        expires_dict = {}
        try:
            expires_result = db.session.execute(
                text("SELECT id, expires_at FROM programs WHERE creator_id = :user_id"),
                {"user_id": user_id}
            )
            for row in expires_result:
                if row[1]:
                    expires_dict[row[0]] = row[1]
        except Exception:
            pass
        
        out = []
        for p in mine:
            # 새로운 참여 시스템 사용
            cnt = ProgramParticipants.query.filter_by(program_id=p.id).filter(
                ProgramParticipants.status.in_(['pending', 'approved'])
            ).count()
            
            # 운동 목록
            program_exercises = ProgramExercises.query.filter_by(
                program_id=p.id
            ).order_by(ProgramExercises.order_index).all()
            exercises = []
            for pe in program_exercises:
                exercises.append({
                    'id': pe.exercise_id,
                    'name': pe.exercise.name if pe.exercise else '알 수 없는 운동',
                    'target_value': pe.target_value,
                    'order': pe.order_index
                })
            
            # WOD 패턴
            workout_pattern = None
            workout_patterns = WorkoutPatterns.query.filter_by(program_id=p.id).first()
            if workout_patterns:
                exercise_sets = ExerciseSets.query.filter_by(
                    pattern_id=workout_patterns.id
                ).order_by(ExerciseSets.order_index).all()
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
            
            # expires_at 처리
            expires_at_obj = expires_dict.get(p.id)
            expires_at_value = None
            if expires_at_obj:
                try:
                    expires_at_value = expires_at_obj.isoformat() if hasattr(expires_at_obj, 'isoformat') else str(expires_at_obj)
                except:
                    expires_at_value = str(expires_at_obj) if expires_at_obj else None
            
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
                'expires_at': expires_at_value,
                'exercises': exercises,
                'workout_pattern': workout_pattern
            })
        
        return jsonify({'programs': out}), 200
        
    except Exception as e:
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

def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수"""
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


@bp.route('/programs/<int:program_id>', methods=['PUT'])
def update_program(program_id):
    """프로그램 수정 (공개 전에만 가능)"""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        if program.creator_id != user_id:
            return jsonify({'message': '프로그램을 수정할 권한이 없습니다'}), 403
        
        if program.is_open:
            return jsonify({'message': '공개된 프로그램은 수정할 수 없습니다'}), 400
        
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'message': '요청 데이터가 없습니다'}), 400
        
        if 'title' not in data or not data['title'].strip():
            return jsonify({'message': '프로그램 제목은 필수입니다'}), 400
        
        # 프로그램 정보 업데이트
        program.title = data['title'].strip()
        program.description = (data.get('description') or '').strip()
        program.target_value = (data.get('target_value') or '').strip()
        try:
            program.max_participants = int(data.get('max_participants') or 20)
        except (ValueError, TypeError):
            program.max_participants = 20
        
        # WOD 패턴 업데이트
        workout_pattern = data.get('workout_pattern')
        if workout_pattern:
            existing_pattern = WorkoutPatterns.query.filter_by(program_id=program_id).first()
            if existing_pattern:
                ExerciseSets.query.filter_by(pattern_id=existing_pattern.id).delete()
                db.session.delete(existing_pattern)
            
            pattern_type = workout_pattern.get('type', 'round_based')
            db_pattern_type = 'time_cap' if pattern_type == 'time_cap' else 'fixed_reps'
            
            new_pattern = WorkoutPatterns(
                program_id=program.id,
                pattern_type=db_pattern_type,
                total_rounds=workout_pattern.get('total_rounds', 1),
                time_cap_per_round=workout_pattern.get('time_cap_per_round'),
                description=workout_pattern.get('description', '')
            )
            db.session.add(new_pattern)
            db.session.flush()
            
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
            
            ProgramExercises.query.filter_by(program_id=program_id).delete()
        else:
            ProgramExercises.query.filter_by(program_id=program_id).delete()
            
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
            
            existing_pattern = WorkoutPatterns.query.filter_by(program_id=program_id).first()
            if existing_pattern:
                ExerciseSets.query.filter_by(pattern_id=existing_pattern.id).delete()
                db.session.delete(existing_pattern)
        
        db.session.commit()
        return jsonify({'message': '프로그램이 성공적으로 수정되었습니다'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('프로그램 수정 중 오류: %s', str(e))
        return jsonify({'message': '프로그램 수정 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>', methods=['DELETE'])
def delete_program(program_id):
    """프로그램 삭제"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'message': '로그인이 필요합니다'}), 401
        
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'message': '프로그램을 찾을 수 없습니다'}), 404
        
        if program.creator_id != user_id:
            return jsonify({'message': '프로그램을 삭제할 권한이 없습니다'}), 403
        
        # 알림용 정보 미리 저장
        program_title = program.title
        
        # 관련 데이터 삭제 (SQL로 직접 처리)
        from sqlalchemy import text
        
        try:
            # WorkoutPattern 조회 및 삭제
            pattern_ids = db.session.execute(
                text("SELECT id FROM workout_patterns WHERE program_id = :pid"),
                {"pid": program_id}
            ).fetchall()
            
            if pattern_ids:
                pattern_id_list = [row[0] for row in pattern_ids]
                if len(pattern_id_list) == 1:
                    db.session.execute(
                        text("DELETE FROM exercise_sets WHERE pattern_id = :pid"),
                        {"pid": pattern_id_list[0]}
                    )
                else:
                    db.session.execute(
                        text("DELETE FROM exercise_sets WHERE pattern_id IN :pids"),
                        {"pids": tuple(pattern_id_list)}
                    )
            
            db.session.execute(text("DELETE FROM workout_patterns WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM program_exercises WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM registrations WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM program_participants WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM workout_records WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM notifications WHERE program_id = :pid"), {"pid": program_id})
            db.session.execute(text("DELETE FROM programs WHERE id = :pid"), {"pid": program_id})
            
            db.session.commit()
            current_app.logger.info(f"프로그램 {program_id} 삭제 완료")
            
            # 삭제 알림 생성
            try:
                create_notification(
                    user_id=user_id,
                    notification_type='program_deleted',
                    title='WOD가 삭제되었습니다',
                    message=f'"{program_title}" WOD가 삭제되었습니다.'
                )
            except Exception as notif_error:
                current_app.logger.warning(f'삭제 알림 생성 실패: {notif_error}')
            
            return jsonify({'message': 'WOD가 삭제되었습니다'}), 200
            
        except Exception as delete_error:
            db.session.rollback()
            current_app.logger.exception(f'프로그램 삭제 중 DB 오류: {delete_error}')
            return jsonify({'message': '프로그램 삭제 중 오류가 발생했습니다'}), 500
            
    except Exception as e:
        current_app.logger.exception('delete_program error: %s', str(e))
        return jsonify({'message': '프로그램 삭제 처리 중 오류가 발생했습니다'}), 500


@bp.route('/user/wod-status', methods=['GET'])
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
            from utils.timezone import get_korea_time
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).filter(
                (Programs.expires_at.is_(None)) | (Programs.expires_at > get_korea_time())
            ).count()
        except AttributeError:
            # expires_at 필드가 없는 경우 모든 공개 WOD 카운트
            public_wods = Programs.query.filter_by(creator_id=user_id, is_open=True).count()
        
        # 만료 예정인 공개 WOD (3일 이내)
        try:
            from utils.timezone import get_korea_time
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
        current_app.logger.exception('WOD 현황 조회 중 오류: %s', str(e))
        return jsonify({'message': 'WOD 현황 조회 중 오류가 발생했습니다'}), 500
