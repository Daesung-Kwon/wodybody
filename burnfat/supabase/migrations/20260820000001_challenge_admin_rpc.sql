-- Wave 1: PIN-gated challenge admin writes. Anon UPDATE on challenges is revoked.
-- Apply in the Supabase SQL Editor BEFORE deploying the matching frontend.

CREATE OR REPLACE FUNCTION public.update_challenge_admin(
  p_challenge_id UUID,
  p_pin TEXT,
  p_title TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_stake_amount INTEGER DEFAULT NULL,
  p_ranking_unlocked BOOLEAN DEFAULT NULL
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
  SELECT * INTO v_row FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_hash := v_row.admin_pin_hash;
  IF v_hash IS NOT NULL THEN
    IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' OR v_hash <> crypt(p_pin, v_hash) THEN
      RAISE EXCEPTION 'pin_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE challenges
     SET title = COALESCE(p_title, title),
         start_date = COALESCE(p_start_date, start_date),
         end_date = COALESCE(p_end_date, end_date),
         stake_amount = COALESCE(p_stake_amount, stake_amount),
         ranking_unlocked = COALESCE(p_ranking_unlocked, ranking_unlocked)
   WHERE id = p_challenge_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_challenge_admin(UUID, TEXT, TEXT, DATE, DATE, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_challenge_admin(UUID, TEXT, TEXT, DATE, DATE, INTEGER, BOOLEAN) TO anon, authenticated;

DROP POLICY IF EXISTS "Allow anonymous update" ON challenges;
DROP POLICY IF EXISTS "Allow anonymous update challenges" ON challenges;
DROP POLICY IF EXISTS "challenges_update_anon" ON challenges;

REVOKE UPDATE ON challenges FROM anon, authenticated;
