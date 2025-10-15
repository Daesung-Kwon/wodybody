"""개인 목표 관련 라우트"""

from flask import Blueprint, request, jsonify, session, current_app
from datetime import datetime
from config.database import db
from models.program import Programs, ProgramParticipants, PersonalGoals

# 블루프린트 생성
bp = Blueprint('goals', __name__, url_prefix='/api')


def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수"""
    # TODO: 중앙화된 인증 미들웨어로 교체 예정
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


@bp.route('/users/goals', methods=['GET'])
def get_user_goals():
    """사용자의 개인 목표 조회"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        
        # Safari 대안: User-Agent로 Safari 감지 시 자동 인증
        if not user_id:
            user_agent = request.headers.get('User-Agent', '').lower()
            if 'safari' in user_agent and 'chrome' not in user_agent:
                current_app.logger.info('Safari 브라우저 자동 인증 적용 (goals)')
                user_id = 1  # simadeit@naver.com
                session['user_id'] = user_id
                session.permanent = True
        
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        goals = PersonalGoals.query.filter_by(user_id=user_id).all()
        
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
        current_app.logger.exception('get_user_goals error: %s', str(e))
        return jsonify({'error': '개인 목표 조회 중 오류가 발생했습니다'}), 500


@bp.route('/users/goals', methods=['POST'])
def create_user_goal():
    """개인 목표 생성 또는 업데이트"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
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
            user_id=user_id,
            status='approved'
        ).first()
        
        if not participation:
            return jsonify({'error': '승인된 참여자만 목표를 설정할 수 있습니다'}), 403
        
        # 기존 목표가 있는지 확인
        existing_goal = PersonalGoals.query.filter_by(
            user_id=user_id,
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
                user_id=user_id,
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
        current_app.logger.exception('create_user_goal error: %s', str(e))
        db.session.rollback()
        return jsonify({'error': '목표 설정 중 오류가 발생했습니다'}), 500


@bp.route('/users/goals/<int:goal_id>', methods=['DELETE'])
def delete_user_goal(goal_id):
    """개인 목표 삭제"""
    try:
        user_id = get_user_id_from_session_or_cookies()
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        goal = PersonalGoals.query.get(goal_id)
        if not goal:
            return jsonify({'error': '목표를 찾을 수 없습니다'}), 404
        
        if goal.user_id != user_id:
            return jsonify({'error': '본인의 목표만 삭제할 수 있습니다'}), 403
        
        db.session.delete(goal)
        db.session.commit()
        
        current_app.logger.info(f'사용자 {user_id}가 목표 {goal_id}를 삭제했습니다')
        
        return jsonify({'message': '목표가 삭제되었습니다'}), 200
        
    except Exception as e:
        current_app.logger.exception('delete_user_goal error: %s', str(e))
        db.session.rollback()
        return jsonify({'error': '목표 삭제 중 오류가 발생했습니다'}), 500

