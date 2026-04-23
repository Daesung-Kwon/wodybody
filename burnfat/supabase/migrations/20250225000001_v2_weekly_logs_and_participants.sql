-- BurnFat V2: weekly_logs 테이블 + participants 확장
-- PRODUCT_PLAN_V2, TECH_ARCHITECTURE_V2 기반

-- 1. participants 확장 (참가 시 1회 입력)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS target_body_fat DECIMAL(5,2);

-- gender 체크 제약 (기존 컬럼이 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participants_gender_check'
  ) THEN
    ALTER TABLE participants ADD CONSTRAINT participants_gender_check
      CHECK (gender IS NULL OR gender IN ('M', 'F'));
  END IF;
END $$;

-- 2. weekly_logs 테이블
CREATE TABLE IF NOT EXISTS weekly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_no INTEGER NOT NULL,
  recorded_at DATE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('M', 'F')),
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  body_fat_rate DECIMAL(5,2),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, week_no)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_weekly_logs_participant ON weekly_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_weekly_logs_participant_week ON weekly_logs(participant_id, week_no);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_weekly_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_weekly_logs_updated_at ON weekly_logs;
CREATE TRIGGER trigger_weekly_logs_updated_at
  BEFORE UPDATE ON weekly_logs
  FOR EACH ROW EXECUTE PROCEDURE update_weekly_logs_updated_at();

-- RLS (공개형·신뢰 기반: 익명 읽기/쓰기)
ALTER TABLE weekly_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read weekly_logs" ON weekly_logs;
CREATE POLICY "Allow anonymous read weekly_logs" ON weekly_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert weekly_logs" ON weekly_logs;
CREATE POLICY "Allow anonymous insert weekly_logs" ON weekly_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update weekly_logs" ON weekly_logs;
CREATE POLICY "Allow anonymous update weekly_logs" ON weekly_logs FOR UPDATE USING (true);
