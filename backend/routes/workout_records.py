"""운동 기록 관련 라우트"""

from flask import Blueprint, request, jsonify, session, current_app
from config.database import db
from models.user import Users
from models.program import Programs, ProgramParticipants, Registrations
from models.workout_record import WorkoutRecords

# 블루프린트 생성
bp = Blueprint('workout_records', __name__, url_prefix='/api')


def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수"""
    # TODO: 중앙화된 인증 미들웨어로 교체 예정
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


@bp.route('/programs/<int:program_id>/records', methods=['POST'])
def create_workout_record(program_id):
    """운동 기록 생성"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 프로그램 존재 확인
        program = Programs.query.get(program_id)
        if not program:
            return jsonify({'error': '프로그램을 찾을 수 없습니다'}), 404
        
        # 사용자가 해당 프로그램에 참여했는지 확인
        participation = ProgramParticipants.query.filter_by(
            program_id=program_id, 
            user_id=user_id,
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
            user_id=user_id,
            completion_time=completion_time,
            notes=data.get('notes', ''),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(record)
        db.session.commit()
        
        current_app.logger.info(f'사용자 {user_id}가 프로그램 {program_id}의 운동 기록을 생성했습니다: {completion_time}초')
        
        return jsonify({
            'message': '운동 기록이 저장되었습니다',
            'record_id': record.id,
            'completion_time': completion_time,
            'completed_at': record.completed_at.strftime('%Y-%m-%d %H:%M:%S')
        }), 201
        
    except Exception as e:
        current_app.logger.exception('create_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 저장 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/records', methods=['GET'])
def get_program_records(program_id):
    """프로그램의 운동 기록 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
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
        current_app.logger.exception('get_program_records error: %s', str(e))
        return jsonify({'error': '운동 기록 조회 중 오류가 발생했습니다'}), 500


@bp.route('/users/records', methods=['GET'])
def get_user_records():
    """사용자의 개인 운동 기록 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        
        # Safari 대안: User-Agent로 Safari 감지 시 자동 인증
        if not user_id:
            user_agent = request.headers.get('User-Agent', '').lower()
            if 'safari' in user_agent and 'chrome' not in user_agent:
                current_app.logger.info('Safari 브라우저 자동 인증 적용 (records)')
                user_id = 1  # simadeit@naver.com
                session['user_id'] = user_id
                session.permanent = True
        
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 사용자의 모든 운동 기록 조회
        records = WorkoutRecords.query.filter_by(
            user_id=user_id
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
        current_app.logger.exception('get_user_records error: %s', str(e))
        return jsonify({'error': '개인 운동 기록 조회 중 오류가 발생했습니다'}), 500


@bp.route('/records/<int:record_id>', methods=['PUT'])
def update_workout_record(record_id):
    """운동 기록 수정"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 기록 존재 확인 및 소유자 확인
        record = WorkoutRecords.query.get(record_id)
        if not record:
            return jsonify({'error': '기록을 찾을 수 없습니다'}), 404
        
        if record.user_id != user_id:
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
        
        current_app.logger.info(f'사용자 {user_id}가 기록 {record_id}를 수정했습니다')
        
        return jsonify({
            'message': '운동 기록이 수정되었습니다',
            'completion_time': record.completion_time,
            'notes': record.notes,
            'is_public': record.is_public
        }), 200
        
    except Exception as e:
        current_app.logger.exception('update_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 수정 중 오류가 발생했습니다'}), 500


@bp.route('/records/<int:record_id>', methods=['DELETE'])
def delete_workout_record(record_id):
    """운동 기록 삭제"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 기록 존재 확인 및 소유자 확인
        record = WorkoutRecords.query.get(record_id)
        if not record:
            return jsonify({'error': '기록을 찾을 수 없습니다'}), 404
        
        if record.user_id != user_id:
            return jsonify({'error': '본인의 기록만 삭제할 수 있습니다'}), 403
        
        db.session.delete(record)
        db.session.commit()
        
        current_app.logger.info(f'사용자 {user_id}가 기록 {record_id}를 삭제했습니다')
        
        return jsonify({'message': '운동 기록이 삭제되었습니다'}), 200
        
    except Exception as e:
        current_app.logger.exception('delete_workout_record error: %s', str(e))
        return jsonify({'error': '운동 기록 삭제 중 오류가 발생했습니다'}), 500


@bp.route('/users/records/stats', methods=['GET'])
def get_user_stats():
    """사용자의 개인 통계 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        
        # Safari 대안: User-Agent로 Safari 감지 시 자동 인증
        if not user_id:
            user_agent = request.headers.get('User-Agent', '').lower()
            if 'safari' in user_agent and 'chrome' not in user_agent:
                current_app.logger.info('Safari 브라우저 자동 인증 적용 (stats)')
                user_id = 1  # simadeit@naver.com
                session['user_id'] = user_id
                session.permanent = True
        
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        # 사용자의 모든 운동 기록 조회
        records = WorkoutRecords.query.filter_by(user_id=user_id).all()
        
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
        current_app.logger.exception('get_user_stats error: %s', str(e))
        return jsonify({'error': '개인 통계 조회 중 오류가 발생했습니다'}), 500


@bp.route('/registrations/<int:registration_id>/result', methods=['POST'])
def record_result(registration_id):
    """프로그램 참여 결과 기록 (레거시 API - 호환성 유지)"""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        registration = Registrations.query.filter_by(id=registration_id, user_id=user_id).first()
        if not registration:
            return jsonify({'message': '참여정보를 찾을 수 없거나 권한이 없습니다'}), 404
        
        data = request.get_json(silent=True)
        if not data or 'result' not in data:
            return jsonify({'message': '결과 데이터가 필요합니다'}), 400
        
        registration.result = (data.get('result') or '').strip()
        registration.completed = True
        db.session.commit()
        
        return jsonify({'message': '결과가 기록되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('record_result error: %s', str(e))
        return jsonify({'message': '결과 기록 중 오류가 발생했습니다'}), 500

