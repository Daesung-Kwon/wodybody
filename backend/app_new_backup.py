import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_cors import CORS

# 설정 및 데이터베이스 임포트
from config.settings import config
from config.database import init_database

# 모델 임포트 (테이블 생성을 위해)
from models import *

def create_app(config_name=None):
    """Flask 애플리케이션 팩토리"""
    
    # 설정 이름 결정
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    # Flask 앱 생성
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # CORS 설정
    CORS(app,
         resources={r"/api/*": {
             "origins": app.config['CORS_ORIGINS'],
             "supports_credentials": app.config['CORS_SUPPORTS_CREDENTIALS'],
             "allow_headers": app.config['CORS_ALLOW_HEADERS'],
             "methods": app.config['CORS_METHODS']
         }})
    
    # 로깅 설정
    setup_logging(app)
    
    # 데이터베이스 초기화
    db, socketio = init_database(app)
    
    # 라우트 등록
    register_routes(app)
    
    # 미들웨어 등록
    register_middleware(app)
    
    return app, db, socketio

def setup_logging(app):
    """로깅 설정"""
    if not app.debug and not app.testing:
        # 로그 디렉토리 생성
        os.makedirs('logs', exist_ok=True)
        
        # 파일 핸들러 설정
        file_handler = RotatingFileHandler(
            app.config['LOG_FILE'],
            maxBytes=app.config['LOG_MAX_BYTES'],
            backupCount=app.config['LOG_BACKUP_COUNT'],
            encoding='utf-8'
        )
        
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        
        file_handler.setLevel(getattr(logging, app.config['LOG_LEVEL']))
        app.logger.addHandler(file_handler)
        app.logger.setLevel(getattr(logging, app.config['LOG_LEVEL']))
        app.logger.info('CrossFit System startup')

def register_routes(app):
    """라우트 등록"""
    # 기본 테스트 라우트
    @app.route('/api/test', methods=['GET'])
    def test():
        from datetime import datetime
        from flask import jsonify
        return jsonify({
            'message': '서버 연결 정상',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    
    # 라우트 모듈들 등록
    from routes import auth, programs
    app.register_blueprint(auth.bp)
    app.register_blueprint(programs.bp)
    
    # 향후 추가할 라우트들
    # from routes import exercises, admin
    # app.register_blueprint(exercises.bp)
    # app.register_blueprint(admin.bp)

def register_middleware(app):
    """미들웨어 등록"""
    from flask import request
    
    @app.before_request
    def log_request_info():
        app.logger.info('Request: %s %s', request.method, request.url)
    
    @app.after_request
    def log_response_info(response):
        app.logger.info('Response: %s %s', response.status_code, response.status)
        return response

if __name__ == '__main__':
    app, db, socketio = create_app()
    
    # 운동 데이터 시드
    from utils.seed_data import seed_exercise_data
    with app.app_context():
        seed_exercise_data()
    
    print("🚀 http://localhost:5001")
    socketio.run(app, debug=True, port=5001, host='0.0.0.0')
