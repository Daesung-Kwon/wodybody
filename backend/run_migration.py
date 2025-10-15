"""Railway PostgreSQL 마이그레이션 실행 스크립트"""

import os
import sys

def run_migration():
    """신규 운동 추가 마이그레이션"""
    
    # Flask 앱 컨텍스트 필요
    from app import app, db
    from sqlalchemy import text
    
    with app.app_context():
        print("🚀 신규 운동 추가 시작...")
        print("")
        
        try:
            # 1. 중복 제거: '버핏' 삭제
            result = db.session.execute(
                text("DELETE FROM exercises WHERE name = '버핏' AND category_id = 1")
            )
            deleted_count = result.rowcount
            if deleted_count > 0:
                print(f"🗑️  삭제: 버핏 (중복) - {deleted_count}개")
            
            # 2. 신규 운동 추가
            new_exercises = [
                # 맨몸운동
                (1, '풀업', '턱걸이 - 상체 당기기 운동'),
                (1, '딥스', '평행봉 내리기 - 상체 밀기 운동'),
                (1, '시트업', '복근 강화 운동'),
                (1, '레그레이즈', '하복부 강화 운동'),
                (1, '박스 점프', '상자 위로 점프하기'),
                (1, '월 볼', '벽에 공 던지기 운동'),
                
                # 덤벨
                (2, '덤벨 데드리프트', '덤벨로 하는 데드리프트'),
                (2, '덤벨 플라이', '가슴 운동'),
                (2, '덤벨 숄더 프레스', '어깨 운동'),
                (2, '덤벨 스러스터', '스쿼트 + 숄더프레스 복합 운동'),
                (2, '덤벨 런지 워크', '걸으며 하는 런지'),
                (2, '덤벨 스내치', '폭발적인 전신 운동'),
                
                # 케틀벨
                (3, '케틀벨 데드리프트', '케틀벨로 하는 데드리프트'),
                (3, '케틀벨 프레스', '어깨 운동'),
                (3, '케틀벨 로우', '등 운동'),
                (3, '케틀벨 런지', '하체 운동'),
                
                # 바벨
                (4, '바벨 프론트 스쿼트', '앞에서 바벨을 잡고 하는 스쿼트'),
                (4, '바벨 클린', '폭발적으로 바벨을 들어올리는 운동'),
                (4, '바벨 스내치', '바벨을 머리 위로 들어올리는 운동'),
                (4, '바벨 런지', '바벨을 메고 하는 런지'),
                (4, '바벨 스러스터', '프론트 스쿼트 + 푸시프레스'),
                
                # 기타
                (5, '로잉 머신', '조정 운동 - 전신 유산소'),
                (5, '에어 바이크', '전신 자전거 운동'),
                (5, '로프 클라이밍', '로프 타기'),
                (5, '더블 언더', '줄넘기 2회전'),
                (5, '싱글 언더', '줄넘기 1회전'),
                (5, '러닝', '달리기'),
                (5, '배틀 로프', '로프 흔들기 - 상체 유산소'),
            ]
            
            added_count = 0
            skipped_count = 0
            
            for category_id, name, description in new_exercises:
                # 중복 체크
                existing = db.session.execute(
                    text("SELECT id FROM exercises WHERE name = :name AND category_id = :cat_id"),
                    {"name": name, "cat_id": category_id}
                ).fetchone()
                
                if existing:
                    skipped_count += 1
                    print(f"⏭️  스킵: {name} (이미 존재)")
                else:
                    db.session.execute(
                        text("INSERT INTO exercises (category_id, name, description, is_active) VALUES (:cat_id, :name, :desc, true)"),
                        {"cat_id": category_id, "name": name, "desc": description}
                    )
                    added_count += 1
                    print(f"✅ 추가: {name}")
            
            # 커밋
            db.session.commit()
            
            print("")
            print("=" * 50)
            print(f"📊 결과: {added_count}개 추가, {skipped_count}개 스킵")
            
            # 최종 확인
            total = db.session.execute(
                text("SELECT COUNT(*) FROM exercises WHERE is_active = true")
            ).scalar()
            
            print(f"📊 전체 활성 운동: {total}개")
            print("=" * 50)
            print("")
            print("✅ 완료!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 오류 발생: {e}")
            sys.exit(1)

if __name__ == '__main__':
    run_migration()
