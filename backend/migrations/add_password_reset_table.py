"""
비밀번호 재설정 테이블 생성 마이그레이션
실행: python -m migrations.add_password_reset_table
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from flask import Flask
from config.database import db
from models.password_reset import PasswordReset
from sqlalchemy import text

def migrate():
    """비밀번호 재설정 테이블 생성"""
    app = Flask(__name__)
    
    # 환경 변수 설정
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///crossfit.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # 테이블 존재 여부 확인
            inspector = db.inspect(db.engine)
            if 'password_resets' in inspector.get_table_names():
                print("✅ password_resets 테이블이 이미 존재합니다.")
                return
            
            # 테이블 생성
            PasswordReset.__table__.create(db.engine)
            print("✅ password_resets 테이블이 생성되었습니다.")
            
            # 생성된 테이블 구조 확인 (SQLite 호환)
            db_uri = app.config['SQLALCHEMY_DATABASE_URI']
            if db_uri.startswith('sqlite'):
                # SQLite는 information_schema를 지원하지 않음
                result = db.session.execute(text("PRAGMA table_info(password_resets)"))
                print("\n📋 테이블 구조:")
                for row in result:
                    print(f"  - {row[1]} ({row[2]})")
            else:
                # PostgreSQL
                result = db.session.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'password_resets'
                    ORDER BY ordinal_position
                """))
                print("\n📋 테이블 구조:")
                for row in result:
                    print(f"  - {row[0]}: {row[1]}")
                
        except Exception as e:
            print(f"❌ 마이그레이션 실패: {e}")
            raise

if __name__ == '__main__':
    migrate()

