-- Railway PostgreSQL: expires_at 컬럼 추가
-- Railway 대시보드 > PostgreSQL > Query 탭에서 실행

-- 1. Programs 테이블에 expires_at 컬럼 추가 (이미 있으면 에러 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE programs ADD COLUMN expires_at TIMESTAMP;
        RAISE NOTICE 'expires_at 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'expires_at 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 2. 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'programs' AND column_name = 'expires_at';

-- 3. 기존 공개된 WOD에 만료 시간 설정 (생성일 기준 7일 후)
-- expires_at이 NULL인 공개 프로그램에만 적용
UPDATE programs 
SET expires_at = created_at + INTERVAL '7 days'
WHERE is_open = TRUE 
  AND expires_at IS NULL
  AND created_at IS NOT NULL;

-- 4. 업데이트된 프로그램 확인
SELECT id, title, is_open, created_at, expires_at
FROM programs 
WHERE is_open = TRUE
ORDER BY id;

-- 완료!
SELECT '✅ expires_at 컬럼 추가 및 데이터 설정 완료!' as result;

