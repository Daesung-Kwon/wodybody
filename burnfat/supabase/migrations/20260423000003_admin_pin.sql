-- BurnFat: 대결방 관리자 PIN (순위 공개/잠금 보호용)
-- Supabase SQL Editor 또는 CLI(supabase db push)에서 실행하세요.
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS admin_pin TEXT;
