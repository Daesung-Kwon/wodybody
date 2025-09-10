"""시드 데이터 생성 유틸리티"""

from models.exercise import ExerciseCategories, Exercises
from config.database import db

def seed_exercise_data():
    """운동 카테고리와 운동 종류 시드 데이터 생성"""
    try:
        # 운동 카테고리가 이미 있는지 확인
        if ExerciseCategories.query.first():
            return  # 이미 데이터가 있으면 스킵
        
        # 운동 카테고리 생성
        categories = [
            {'name': '맨몸운동', 'description': '기구 없이 할 수 있는 운동'},
            {'name': '덤벨', 'description': '덤벨을 사용한 운동'},
            {'name': '케틀벨', 'description': '케틀벨을 사용한 운동'},
            {'name': '바벨', 'description': '바벨을 사용한 운동'},
            {'name': '기타', 'description': '기타 운동'}
        ]
        
        for cat_data in categories:
            category = ExerciseCategories(**cat_data)
            db.session.add(category)
        
        db.session.flush()  # 카테고리 ID를 얻기 위해
        
        # 운동 종류 생성
        exercises = [
            # 맨몸운동
            {'category_id': 1, 'name': '버핏', 'description': '버피 테스트 - 전신 운동'},
            {'category_id': 1, 'name': '스쿼트', 'description': '하체 근력 운동'},
            {'category_id': 1, 'name': '런지', 'description': '하체 균형 운동'},
            {'category_id': 1, 'name': '점프 스쿼트', 'description': '폭발적 하체 운동'},
            {'category_id': 1, 'name': '푸시업', 'description': '상체 근력 운동'},
            {'category_id': 1, 'name': '플랭크', 'description': '코어 안정성 운동'},
            {'category_id': 1, 'name': '마운틴 클라이머', 'description': '전신 유산소 운동'},
            {'category_id': 1, 'name': '점프 잭', 'description': '전신 유산소 운동'},
            {'category_id': 1, 'name': '하이 니즈', 'description': '하체 유산소 운동'},
            {'category_id': 1, 'name': '버피', 'description': '전신 복합 운동'},
            
            # 덤벨 운동
            {'category_id': 2, 'name': '덤벨 스쿼트', 'description': '덤벨을 이용한 스쿼트'},
            {'category_id': 2, 'name': '덤벨 런지', 'description': '덤벨을 이용한 런지'},
            {'category_id': 2, 'name': '덤벨 프레스', 'description': '어깨 근력 운동'},
            {'category_id': 2, 'name': '덤벨 로우', 'description': '등 근력 운동'},
            {'category_id': 2, 'name': '덤벨 컬', 'description': '이두근 운동'},
            {'category_id': 2, 'name': '덤벨 트라이셉스 익스텐션', 'description': '삼두근 운동'},
            
            # 케틀벨 운동
            {'category_id': 3, 'name': '케틀벨 스윙', 'description': '케틀벨 기본 운동'},
            {'category_id': 3, 'name': '케틀벨 고블릿 스쿼트', 'description': '케틀벨을 이용한 스쿼트'},
            {'category_id': 3, 'name': '케틀벨 터키시 겟업', 'description': '전신 복합 운동'},
            {'category_id': 3, 'name': '케틀벨 클린', 'description': '폭발적 상체 운동'},
            {'category_id': 3, 'name': '케틀벨 스내치', 'description': '고급 전신 운동'},
            
            # 바벨 운동
            {'category_id': 4, 'name': '바벨 스쿼트', 'description': '바벨을 이용한 스쿼트'},
            {'category_id': 4, 'name': '데드리프트', 'description': '전신 근력 운동'},
            {'category_id': 4, 'name': '벤치 프레스', 'description': '상체 근력 운동'},
            {'category_id': 4, 'name': '오버헤드 프레스', 'description': '어깨 근력 운동'},
            {'category_id': 4, 'name': '바벨 로우', 'description': '등 근력 운동'},
        ]
        
        for ex_data in exercises:
            exercise = Exercises(**ex_data)
            db.session.add(exercise)
        
        db.session.commit()
        print("✅ 운동 데이터 시드 완료")
        
    except Exception as e:
        print(f"❌ 시드 데이터 생성 오류: {str(e)}")
        db.session.rollback()
        raise
