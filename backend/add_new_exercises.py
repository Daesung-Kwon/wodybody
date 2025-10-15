"""신규 운동 추가 마이그레이션 스크립트 (Railway용)"""

from app import app, db
from models.exercise import Exercises

def add_new_exercises():
    """기존 DB에 27개 신규 운동 추가 (중복 방지)"""
    
    new_exercises = [
        # 맨몸운동 추가
        {'category_id': 1, 'name': '풀업', 'description': '턱걸이 - 상체 당기기 운동'},
        {'category_id': 1, 'name': '딥스', 'description': '평행봉 내리기 - 상체 밀기 운동'},
        {'category_id': 1, 'name': '시트업', 'description': '복근 강화 운동'},
        {'category_id': 1, 'name': '레그레이즈', 'description': '하복부 강화 운동'},
        {'category_id': 1, 'name': '박스 점프', 'description': '상자 위로 점프하기'},
        {'category_id': 1, 'name': '월 볼', 'description': '벽에 공 던지기 운동'},
        
        # 덤벨 추가
        {'category_id': 2, 'name': '덤벨 데드리프트', 'description': '덤벨로 하는 데드리프트'},
        {'category_id': 2, 'name': '덤벨 플라이', 'description': '가슴 운동'},
        {'category_id': 2, 'name': '덤벨 숄더 프레스', 'description': '어깨 운동'},
        {'category_id': 2, 'name': '덤벨 스러스터', 'description': '스쿼트 + 숄더프레스 복합 운동'},
        {'category_id': 2, 'name': '덤벨 런지 워크', 'description': '걸으며 하는 런지'},
        {'category_id': 2, 'name': '덤벨 스내치', 'description': '폭발적인 전신 운동'},
        
        # 케틀벨 추가
        {'category_id': 3, 'name': '케틀벨 데드리프트', 'description': '케틀벨로 하는 데드리프트'},
        {'category_id': 3, 'name': '케틀벨 프레스', 'description': '어깨 운동'},
        {'category_id': 3, 'name': '케틀벨 로우', 'description': '등 운동'},
        {'category_id': 3, 'name': '케틀벨 런지', 'description': '하체 운동'},
        
        # 바벨 추가
        {'category_id': 4, 'name': '바벨 프론트 스쿼트', 'description': '앞에서 바벨을 잡고 하는 스쿼트'},
        {'category_id': 4, 'name': '바벨 클린', 'description': '폭발적으로 바벨을 들어올리는 운동'},
        {'category_id': 4, 'name': '바벨 스내치', 'description': '바벨을 머리 위로 들어올리는 운동'},
        {'category_id': 4, 'name': '바벨 런지', 'description': '바벨을 메고 하는 런지'},
        {'category_id': 4, 'name': '바벨 스러스터', 'description': '프론트 스쿼트 + 푸시프레스'},
        
        # 기타 (유산소 및 장비)
        {'category_id': 5, 'name': '로잉 머신', 'description': '조정 운동 - 전신 유산소'},
        {'category_id': 5, 'name': '에어 바이크', 'description': '전신 자전거 운동'},
        {'category_id': 5, 'name': '로프 클라이밍', 'description': '로프 타기'},
        {'category_id': 5, 'name': '더블 언더', 'description': '줄넘기 2회전'},
        {'category_id': 5, 'name': '싱글 언더', 'description': '줄넘기 1회전'},
        {'category_id': 5, 'name': '러닝', 'description': '달리기 운동'},
        {'category_id': 5, 'name': '배틀 로프', 'description': '전투 로프 운동'},
    ]
    
    with app.app_context():
        added = 0
        skipped = 0
        
        for ex_data in new_exercises:
            # 중복 체크
            existing = Exercises.query.filter_by(
                name=ex_data['name'],
                category_id=ex_data['category_id']
            ).first()
            
            if not existing:
                exercise = Exercises(**ex_data)
                db.session.add(exercise)
                added += 1
                print(f"✅ 추가: {ex_data['name']}")
            else:
                skipped += 1
                print(f"⏭️  스킵: {ex_data['name']} (이미 존재)")
        
        # 버핏 중복 제거
        burpits = Exercises.query.filter_by(name='버핏', category_id=1).all()
        if burpits:
            for burpit in burpits:
                db.session.delete(burpit)
                print(f"🗑️  삭제: 버핏 (중복)")
        
        db.session.commit()
        
        total = Exercises.query.filter_by(is_active=True).count()
        print(f"\n📊 결과: {added}개 추가, {skipped}개 스킵")
        print(f"📊 전체 활성 운동: {total}개")

if __name__ == '__main__':
    print("🚀 신규 운동 추가 시작...")
    add_new_exercises()
    print("✅ 완료!")

