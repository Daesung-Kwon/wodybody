-- BurnFat: 주간 기록에 라이프스타일 데이터 추가 (AI 개인화 조언용)
-- Supabase SQL Editor 또는 CLI(supabase db push)에서 실행하세요.

ALTER TABLE weekly_logs
  ADD COLUMN IF NOT EXISTS exercise_count  INTEGER,        -- 이번 주 운동 횟수 (0~7)
  ADD COLUMN IF NOT EXISTS sleep_hours     DECIMAL(3,1),   -- 평균 수면 시간 (시간)
  ADD COLUMN IF NOT EXISTS diet_quality    TEXT;           -- 식단 패턴: normal | overeat | undereat

-- diet_quality 허용값 제약 (선택: 이미 값이 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_logs_diet_quality_check'
  ) THEN
    ALTER TABLE weekly_logs ADD CONSTRAINT weekly_logs_diet_quality_check
      CHECK (diet_quality IS NULL OR diet_quality IN ('normal', 'overeat', 'undereat'));
  END IF;
END $$;
