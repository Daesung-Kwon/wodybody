"""WebSocket 이벤트 핸들러"""

from flask import request, current_app
from flask_socketio import emit, join_room, leave_room


def register_socketio_events(socketio):
    """SocketIO 이벤트 핸들러 등록
    
    Args:
        socketio: Flask-SocketIO 인스턴스
    """
    
    @socketio.on('connect')
    def handle_connect():
        """클라이언트 연결 시 호출"""
        user_agent = request.headers.get('User-Agent', '').lower()
        is_mobile_safari = 'safari' in user_agent and 'chrome' not in user_agent and ('iphone' in user_agent or 'ipad' in user_agent or 'mobile' in user_agent)
        
        current_app.logger.info(f'클라이언트 연결됨: {request.sid} | User-Agent: {user_agent[:100]} | Mobile Safari: {is_mobile_safari}')
        print(f'🔌 WebSocket 클라이언트 연결됨: {request.sid} {"(모바일 Safari)" if is_mobile_safari else ""}')
        
        # 모바일 Safari를 위한 추가 정보 응답
        if is_mobile_safari:
            # request.transport는 초기 연결 시점에 없을 수 있으므로 안전하게 처리
            emit('mobile_safari_info', {
                'message': '모바일 Safari에서 연결됨',
                'transport': getattr(request, 'transport', 'unknown'),
                'recommended_transport': 'polling'
            })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """클라이언트 연결 해제 시 호출"""
        current_app.logger.info(f'클라이언트 연결 해제됨: {request.sid}')
        print(f'🔌 WebSocket 클라이언트 연결 해제됨: {request.sid}')
    
    @socketio.on('join_user_room')
    def handle_join_user_room(data):
        """사용자별 방에 참여"""
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
            current_app.logger.info(f'사용자 {user_id}가 방에 참여했습니다.')
            print(f'👤 사용자 {user_id}가 방에 참여했습니다.')
        else:
            print('❌ 사용자 ID가 없습니다.')
    
    @socketio.on('leave_user_room')
    def handle_leave_user_room(data):
        """사용자별 방에서 나가기"""
        user_id = data.get('user_id')
        if user_id:
            leave_room(f'user_{user_id}')
            current_app.logger.info(f'사용자 {user_id}가 방에서 나갔습니다.')
            print(f'👤 사용자 {user_id}가 방에서 나갔습니다.')

