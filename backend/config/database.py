from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

# 전역 객체들
db = SQLAlchemy()
socketio = SocketIO()

def init_database(app):
    """데이터베이스 초기화"""
    db.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
        cors_credentials=app.config['SOCKETIO_CORS_CREDENTIALS'],
        logger=app.config['SOCKETIO_LOGGER'],
        engineio_logger=app.config['SOCKETIO_ENGINEIO_LOGGER']
    )
    
    # 테이블 생성
    with app.app_context():
        db.create_all()
    
    return db, socketio
