-- Railway PostgreSQL에서 직접 실행할 SQL 스크립트
-- 신규 운동 27개 추가 (중복 방지 포함)

-- 1. 중복 제거: '버핏' 삭제 (버피와 중복)
DELETE FROM exercises WHERE name = '버핏' AND category_id = 1;

-- 2. 신규 운동 추가 (중복되지 않은 것만 추가)
INSERT INTO exercises (category_id, name, description, is_active) 
SELECT * FROM (VALUES
    -- 맨몸운동 추가
    (1, '풀업', '턱걸이 - 상체 당기기 운동', true),
    (1, '딥스', '평행봉 내리기 - 상체 밀기 운동', true),
    (1, '시트업', '복근 강화 운동', true),
    (1, '레그레이즈', '하복부 강화 운동', true),
    (1, '박스 점프', '상자 위로 점프하기', true),
    (1, '월 볼', '벽에 공 던지기 운동', true),
    
    -- 덤벨 추가
    (2, '덤벨 데드리프트', '덤벨로 하는 데드리프트', true),
    (2, '덤벨 플라이', '가슴 운동', true),
    (2, '덤벨 숄더 프레스', '어깨 운동', true),
    (2, '덤벨 스러스터', '스쿼트 + 숄더프레스 복합 운동', true),
    (2, '덤벨 런지 워크', '걸으며 하는 런지', true),
    (2, '덤벨 스내치', '폭발적인 전신 운동', true),
    
    -- 케틀벨 추가
    (3, '케틀벨 데드리프트', '케틀벨로 하는 데드리프트', true),
    (3, '케틀벨 프레스', '어깨 운동', true),
    (3, '케틀벨 로우', '등 운동', true),
    (3, '케틀벨 런지', '하체 운동', true),
    
    -- 바벨 추가
    (4, '바벨 프론트 스쿼트', '앞에서 바벨을 잡고 하는 스쿼트', true),
    (4, '바벨 클린', '폭발적으로 바벨을 들어올리는 운동', true),
    (4, '바벨 스내치', '바벨을 머리 위로 들어올리는 운동', true),
    (4, '바벨 런지', '바벨을 메고 하는 런지', true),
    (4, '바벨 스러스터', '프론트 스쿼트 + 푸시프레스', true),
    
    -- 기타 추가
    (5, '로잉 머신', '조정 운동 - 전신 유산소', true),
    (5, '에어 바이크', '전신 자전거 운동', true),
    (5, '로프 클라이밍', '로프 타기', true),
    (5, '더블 언더', '줄넘기 2회전', true),
    (5, '싱글 언더', '줄넘기 1회전', true),
    (5, '러닝', '달리기', true),
    (5, '배틀 로프', '로프 흔들기 - 상체 유산소', true)
) AS new_exercises(category_id, name, description, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM exercises e 
    WHERE e.name = new_exercises.name 
    AND e.category_id = new_exercises.category_id
);

-- 3. 결과 확인
SELECT 
    c.name as category,
    COUNT(e.id) as exercise_count
FROM exercise_categories c
LEFT JOIN exercises e ON c.id = e.category_id AND e.is_active = true
GROUP BY c.id, c.name
ORDER BY c.id;

-- 4. 전체 운동 수 확인
SELECT COUNT(*) as total_exercises FROM exercises WHERE is_active = true;
