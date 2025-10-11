"""알림 관련 라우트"""

from flask import Blueprint, request, jsonify, session, current_app
from datetime import datetime
from config.database import db
from models.notification import Notifications

# 블루프린트 생성
bp = Blueprint('notifications', __name__, url_prefix='/api')


def get_user_id_from_session_or_cookies():
    """세션 또는 쿠키에서 사용자 ID를 가져오는 함수"""
    # TODO: 중앙화된 인증 미들웨어로 교체 예정
    from app import get_user_id_from_session_or_cookies as get_user_id
    return get_user_id()


@bp.route('/notifications', methods=['GET'])
def get_notifications():
    """사용자의 알림 목록 조회"""
    user_id = get_user_id_from_session_or_cookies()
    
    # Safari 대안: User-Agent로 Safari 감지 시 자동 인증 (개선된 버전)
    if not user_id:
        user_agent = request.headers.get('User-Agent', '').lower()
        if 'safari' in user_agent and 'chrome' not in user_agent:
            # Safari 전용 세션 확인
            safari_user_id = session.get('safari_user_id')
            if safari_user_id:
                current_app.logger.info(f'Safari 전용 세션에서 사용자 ID 확인: {safari_user_id}')
                user_id = safari_user_id
                session['user_id'] = user_id  # 일반 세션에도 복사
            else:
                current_app.logger.warning('Safari 브라우저이지만 전용 세션이 없음 - 인증 필요')
    
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        notifications = Notifications.query.filter_by(user_id=user_id)\
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
        current_app.logger.exception('get_notifications error: %s', str(e))
        return jsonify({'message': '알림 조회 중 오류가 발생했습니다'}), 500


@bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """알림을 읽음으로 표시"""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        notification = Notifications.query.filter_by(
            id=notification_id, 
            user_id=user_id
        ).first()
        
        if not notification:
            return jsonify({'message': '알림을 찾을 수 없습니다'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({'message': '알림이 읽음으로 표시되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('mark_notification_read error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '알림 읽음 처리 중 오류가 발생했습니다'}), 500


@bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    """모든 알림을 읽음으로 표시"""
    user_id = get_user_id_from_session_or_cookies()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    
    try:
        Notifications.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({'message': '모든 알림이 읽음으로 표시되었습니다'}), 200
    except Exception as e:
        current_app.logger.exception('mark_all_notifications_read error: %s', str(e))
        db.session.rollback()
        return jsonify({'message': '알림 읽음 처리 중 오류가 발생했습니다'}), 500


def create_notification(user_id, notification_type, title, message, program_id=None):
    """알림 생성 및 실시간 전송
    
    Note: SocketIO 전송은 app.py에서 import하여 사용
    """
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
        
        # 실시간 알림 전송 (SocketIO)
        # Note: circular import 방지를 위해 app.py에서 socketio import
        try:
            from app import socketio
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
        except ImportError:
            current_app.logger.warning('SocketIO를 import할 수 없어 실시간 알림을 전송하지 못했습니다')
        
        return notification
    except Exception as e:
        current_app.logger.exception('알림 생성 중 오류: %s', str(e))
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
        
        # 실시간 알림 전송 (SocketIO)
        try:
            from app import socketio
            socketio.emit('program_notification', notification_data)
        except ImportError:
            current_app.logger.warning('SocketIO를 import할 수 없어 브로드캐스트 알림을 전송하지 못했습니다')
        
    except Exception as e:
        current_app.logger.exception('프로그램 알림 브로드캐스트 중 오류: %s', str(e))
        print(f'❌ 브로드캐스트 오류: {str(e)}')

