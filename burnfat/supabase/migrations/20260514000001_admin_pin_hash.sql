-- BurnFat Sprint 0.1: admin_pin 평문 저장 → bcrypt 해시 + RPC 검증
-- 보안 응급 처치
--
-- 변경 사항
--   1. pgcrypto 확장 활성화
--   2. challenges.admin_pin_hash + has_admin_pin (GENERATED) 컬럼 추가
--   3. 기존 평문 admin_pin → bcrypt 해시로 이전
--   4. 평문 admin_pin 컬럼 DROP
--   5. challenges 컬럼 레벨 GRANT (admin_pin_hash는 anon 비노출)
--   6. RPC: verify_admin_pin, create_challenge_with_pin, set_admin_pin

-- 0) pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1) 해시 컬럼 추가
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;

-- 2) 기존 평문 값을 해시로 이전 (admin_pin 컬럼이 아직 남아 있을 때만)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'challenges'
      AND column_name = 'admin_pin'
  ) THEN
    EXECUTE $u$
      UPDATE challenges
      SET admin_pin_hash = crypt(admin_pin, gen_salt('bf', 10))
      WHERE admin_pin IS NOT NULL
        AND admin_pin <> ''
        AND admin_pin_hash IS NULL
    $u$;
  END IF;
END $$;

-- 3) has_admin_pin (편의 컬럼)
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS has_admin_pin BOOLEAN
  GENERATED ALWAYS AS (admin_pin_hash IS NOT NULL) STORED;

-- 4) 평문 컬럼 DROP (idempotent)
ALTER TABLE challenges DROP COLUMN IF EXISTS admin_pin;

-- 5) 컬럼 레벨 GRANT
--    anon/authenticated가 admin_pin_hash를 SELECT/INSERT/UPDATE 할 수 없도록 제한
REVOKE ALL ON TABLE challenges FROM anon, authenticated;

GRANT SELECT (
  id, code, title, start_date, end_date, stake_amount,
  ranking_unlocked, has_admin_pin, created_at
) ON TABLE challenges TO anon, authenticated;

GRANT INSERT (
  id, code, title, start_date, end_date, stake_amount, ranking_unlocked
) ON TABLE challenges TO anon, authenticated;

GRANT UPDATE (
  title, start_date, end_date, stake_amount, ranking_unlocked
) ON TABLE challenges TO anon, authenticated;
-- admin_pin_hash 직접 UPDATE는 차단 → set_admin_pin RPC 통해서만

-- 6-1) PIN 검증 RPC
CREATE OR REPLACE FUNCTION public.verify_admin_pin(
  p_challenge_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_pin IS NULL OR p_pin = '' THEN
    RETURN FALSE;
  END IF;
  IF p_pin !~ '^[0-9]{4}$' THEN
    RETURN FALSE;
  END IF;
  SELECT admin_pin_hash INTO v_hash FROM challenges WHERE id = p_challenge_id;
  -- PIN 미설정 챌린지는 검증 통과로 처리 (보호 비활성화)
  IF v_hash IS NULL THEN
    RETURN TRUE;
  END IF;
  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(UUID, TEXT) TO anon, authenticated;

-- 6-2) 챌린지 생성 RPC (서버에서 PIN을 해시)
CREATE OR REPLACE FUNCTION public.create_challenge_with_pin(
  p_code TEXT,
  p_title TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_stake_amount INTEGER,
  p_admin_pin TEXT
)
RETURNS challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash TEXT;
  v_row challenges;
BEGIN
  IF p_admin_pin IS NOT NULL AND p_admin_pin <> '' THEN
    IF p_admin_pin !~ '^[0-9]{4}$' THEN
      RAISE EXCEPTION 'admin_pin_format' USING ERRCODE = '22023';
    END IF;
    v_hash := crypt(p_admin_pin, gen_salt('bf', 10));
  END IF;

  INSERT INTO challenges (code, title, start_date, end_date, stake_amount, admin_pin_hash)
  VALUES (p_code, p_title, p_start_date, p_end_date, p_stake_amount, v_hash)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_challenge_with_pin(TEXT, TEXT, DATE, DATE, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_challenge_with_pin(TEXT, TEXT, DATE, DATE, INTEGER, TEXT) TO anon, authenticated;

-- 6-3) PIN 재설정/해제 RPC (옵션, 향후 활용)
CREATE OR REPLACE FUNCTION public.set_admin_pin(
  p_challenge_id UUID,
  p_current_pin TEXT,
  p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash TEXT;
  v_new_hash TEXT;
BEGIN
  SELECT admin_pin_hash INTO v_hash FROM challenges WHERE id = p_challenge_id;

  -- 기존 PIN이 있다면 현재 PIN 검증 필수
  IF v_hash IS NOT NULL THEN
    IF p_current_pin IS NULL OR v_hash <> crypt(p_current_pin, v_hash) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- 새 PIN이 비어있으면 해제
  IF p_new_pin IS NULL OR p_new_pin = '' THEN
    UPDATE challenges SET admin_pin_hash = NULL WHERE id = p_challenge_id;
    RETURN TRUE;
  END IF;

  IF p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'admin_pin_format' USING ERRCODE = '22023';
  END IF;

  v_new_hash := crypt(p_new_pin, gen_salt('bf', 10));
  UPDATE challenges SET admin_pin_hash = v_new_hash WHERE id = p_challenge_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_pin(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_pin(UUID, TEXT, TEXT) TO anon, authenticated;
