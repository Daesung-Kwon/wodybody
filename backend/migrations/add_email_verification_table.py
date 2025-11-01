"""이메일 인증 테이블 추가 (회원가입용)"""

import os
import sys

# 상위 디렉토리 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from sqlalchemy import text

def check_table_exists():
    """테이블 존재 여부 확인"""
    with app.app_context():
        try:
            # PostgreSQL용
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name = 'email_verifications'
                );
            """))
            return result.scalar()
        except Exception as e:
            # SQLite용
            try:
                result = db.session.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='email_verifications';
                """))
                return result.fetchone() is not None
            except Exception as e2:
                print(f"❌ 테이블 확인 실패: {e2}")
                return False

def create_table():
    """이메일 인증 테이블 생성"""
    with app.app_context():
        try:
            # 테이블 생성
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS email_verifications (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(150) NOT NULL,
                    verification_code VARCHAR(6) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    is_used BOOLEAN DEFAULT FALSE,
                    verified_at TIMESTAMP
                );
            """))
            
            # 인덱스 생성
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_email_verifications_email 
                ON email_verifications(email);
            """))
            
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_email_verifications_code 
                ON email_verifications(verification_code);
            """))
            
            db.session.commit()
            print("✅ email_verifications 테이블 및 인덱스 생성 완료!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 테이블 생성 실패: {e}")
            return False

def main():
    """메인 실행 함수"""
    print("=" * 50)
    print("이메일 인증 테이블 마이그레이션 시작")
    print("=" * 50)
    
    # 1. 테이블 존재 확인
    if check_table_exists():
        print("✅ email_verifications 테이블이 이미 존재합니다.")
        return
    
    # 2. 테이블 생성
    if create_table():
        print("\n" + "=" * 50)
        print("✅ 마이그레이션 완료!")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("❌ 마이그레이션 실패!")
        print("=" * 50)

if __name__ == '__main__':
    main()

