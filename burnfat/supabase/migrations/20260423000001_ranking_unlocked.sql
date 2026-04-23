-- BurnFat: 중간 순위 공개 기능
-- Supabase SQL Editor 또는 CLI(supabase db push)에서 실행하세요.
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ranking_unlocked BOOLEAN DEFAULT FALSE;
