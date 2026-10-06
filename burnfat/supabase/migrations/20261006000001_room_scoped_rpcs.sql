-- BurnFat RLS lockdown — Migration A (ADDITIVE, safe to apply any time)
--
-- Problem
--   participants / submissions / weekly_logs are readable by the `public` role with
--   USING (true), and participants is also UPDATE-able the same way. Anyone holding the
--   anon/publishable key (it ships in the JS bundle) can read every room's health data.
--   challenges_public also lets anon enumerate every room code.
--
-- Model (BurnFat has no user login)
--   * The room code (/c/:code) is the room's shared secret.
--   * Reads go through SECURITY DEFINER RPCs scoped to ONE room, keyed by the code.
--     They return only the columns the UI needs and never device_secret_hash /
--     admin_pin_hash.
--   * Writes go through SECURITY DEFINER RPCs that require the room code (and the
--     existing device-secret RPCs update_submission / update_weekly_log stay as-is).
--
-- This migration only ADDS functions (+ drops two legacy storage policy names that are
-- already gone in production). Existing direct-table access keeps working, so the
-- currently deployed frontend is unaffected. Migration B (20261006000002) removes the
-- direct access after the new frontend is deployed.
--
-- Conventions follow 20260514000001 / 20260820000001: SECURITY DEFINER,
-- search_path = public, extensions, pg_temp, REVOKE FROM PUBLIC then explicit GRANT.
-- Idempotent: CREATE OR REPLACE + DROP POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- 0) Internal helper: room code -> challenge id. NOT callable by anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._challenge_id_for_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT c.id FROM public.challenges c WHERE c.code = upper(btrim(p_code)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._challenge_id_for_code(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Reads
-- ---------------------------------------------------------------------------

-- 1-1) Challenge by code (replaces direct SELECT on challenges_public).
CREATE OR REPLACE FUNCTION public.get_challenge_by_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  title TEXT,
  start_date DATE,
  end_date DATE,
  stake_amount INTEGER,
  ranking_unlocked BOOLEAN,
  has_admin_pin BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT c.id, c.code, c.title, c.start_date, c.end_date, c.stake_amount,
         c.ranking_unlocked, c.has_admin_pin, c.created_at
    FROM public.challenges c
   WHERE c.code = upper(btrim(p_code))
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_challenge_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_challenge_by_code(TEXT) TO anon, authenticated;

-- 1-2) Participants of one room with their submissions embedded
--      (replaces `participants?select=*,submissions(*)`).
CREATE OR REPLACE FUNCTION public.get_room_participants(p_code TEXT)
RETURNS TABLE (
  id UUID,
  challenge_id UUID,
  nickname TEXT,
  age INTEGER,
  gender TEXT,
  height_cm NUMERIC,
  target_body_fat NUMERIC,
  created_at TIMESTAMPTZ,
  submissions JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT p.id, p.challenge_id, p.nickname, p.age, p.gender, p.height_cm,
         p.target_body_fat, p.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'id', s.id,
                    'participant_id', s.participant_id,
                    'type', s.type,
                    'body_fat_rate', s.body_fat_rate,
                    'image_url', s.image_url,
                    'created_at', s.created_at
                  ) ORDER BY s.created_at)
             FROM public.submissions s
            WHERE s.participant_id = p.id
         ), '[]'::jsonb)
    FROM public.participants p
   WHERE p.challenge_id = public._challenge_id_for_code(p_code)
   ORDER BY p.created_at, p.id;
$$;

REVOKE ALL ON FUNCTION public.get_room_participants(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_room_participants(TEXT) TO anon, authenticated;

-- 1-3) Weekly logs of one room (optionally one participant of that room).
CREATE OR REPLACE FUNCTION public.get_room_weekly_logs(
  p_code TEXT,
  p_participant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  participant_id UUID,
  week_no INTEGER,
  recorded_at DATE,
  age INTEGER,
  gender TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  body_fat_rate NUMERIC,
  exercise_count INTEGER,
  sleep_hours NUMERIC,
  diet_quality TEXT,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT w.id, w.participant_id, w.week_no, w.recorded_at, w.age, w.gender,
         w.weight_kg, w.height_cm, w.body_fat_rate, w.exercise_count,
         w.sleep_hours, w.diet_quality, w.note, w.created_at, w.updated_at
    FROM public.weekly_logs w
    JOIN public.participants p ON p.id = w.participant_id
   WHERE p.challenge_id = public._challenge_id_for_code(p_code)
     AND (p_participant_id IS NULL OR w.participant_id = p_participant_id)
   ORDER BY w.week_no, w.participant_id;
$$;

REVOKE ALL ON FUNCTION public.get_room_weekly_logs(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_room_weekly_logs(TEXT, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Writes (all require the room code)
-- ---------------------------------------------------------------------------

-- 2-1) Join a room (replaces direct INSERT into participants).
--      Duplicate nickname surfaces as the normal unique_violation (23505), whose
--      message contains "unique" — the UI already keys off that.
CREATE OR REPLACE FUNCTION public.join_challenge(p_code TEXT, p_nickname TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_challenge_id UUID;
  v_nickname TEXT := btrim(COALESCE(p_nickname, ''));
  v_row public.participants;
BEGIN
  v_challenge_id := public._challenge_id_for_code(p_code);
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_nickname = '' OR char_length(v_nickname) > 50 THEN
    RAISE EXCEPTION 'nickname_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.participants (challenge_id, nickname)
  VALUES (v_challenge_id, v_nickname)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'challenge_id', v_row.challenge_id,
    'nickname', v_row.nickname,
    'age', v_row.age,
    'gender', v_row.gender,
    'height_cm', v_row.height_cm,
    'target_body_fat', v_row.target_body_fat,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_challenge(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_challenge(TEXT, TEXT) TO anon, authenticated;

-- 2-2) Basic info (replaces anon UPDATE on participants).
--      Same trust model the UI already advertises ("대결방 참가자 누구나 입력·수정"),
--      but now scoped to members who know the room code. NULL clears a field, exactly
--      like the previous `.update({...})` call.
CREATE OR REPLACE FUNCTION public.update_participant_basic_info(
  p_code TEXT,
  p_participant_id UUID,
  p_age INTEGER,
  p_gender TEXT,
  p_height_cm NUMERIC,
  p_target_body_fat NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_challenge_id UUID;
  v_row public.participants;
BEGIN
  v_challenge_id := public._challenge_id_for_code(p_code);
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.participants
     SET age = p_age,
         gender = p_gender,
         height_cm = p_height_cm,
         target_body_fat = p_target_body_fat
   WHERE id = p_participant_id
     AND challenge_id = v_challenge_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participant_not_in_room' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'challenge_id', v_row.challenge_id,
    'nickname', v_row.nickname,
    'age', v_row.age,
    'gender', v_row.gender,
    'height_cm', v_row.height_cm,
    'target_body_fat', v_row.target_body_fat,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_participant_basic_info(TEXT, UUID, INTEGER, TEXT, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_participant_basic_info(TEXT, UUID, INTEGER, TEXT, NUMERIC, NUMERIC) TO anon, authenticated;

-- 2-3) Start/end proof submission (replaces direct INSERT into submissions).
--      image path must live under the participant's own folder: "<participant_id>/<file>".
CREATE OR REPLACE FUNCTION public.create_submission(
  p_code TEXT,
  p_participant_id UUID,
  p_type TEXT,
  p_body_fat_rate NUMERIC,
  p_image_path TEXT,
  p_device_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_challenge_id UUID;
  v_row public.submissions;
BEGIN
  v_challenge_id := public._challenge_id_for_code(p_code);
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.participants p
     WHERE p.id = p_participant_id AND p.challenge_id = v_challenge_id
  ) THEN
    RAISE EXCEPTION 'participant_not_in_room' USING ERRCODE = '42501';
  END IF;
  IF p_body_fat_rate IS NULL OR p_body_fat_rate < 0 OR p_body_fat_rate > 100 THEN
    RAISE EXCEPTION 'body_fat_rate_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_image_path IS NOT NULL AND (
       p_image_path NOT LIKE p_participant_id::text || '/%'
       OR p_image_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,128}$'
       OR p_image_path LIKE '%..%'
     ) THEN
    RAISE EXCEPTION 'image_path_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_device_secret_hash IS NOT NULL AND p_device_secret_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'device_secret_hash_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.submissions (participant_id, type, body_fat_rate, image_url, device_secret_hash)
  VALUES (p_participant_id, p_type, p_body_fat_rate, p_image_path, p_device_secret_hash)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'participant_id', v_row.participant_id,
    'type', v_row.type,
    'body_fat_rate', v_row.body_fat_rate,
    'image_url', v_row.image_url,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_submission(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_submission(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;

-- 2-4) Weekly log (replaces direct INSERT into weekly_logs). Fields come as a JSONB
--      object, mirroring update_weekly_log(p_patch).
CREATE OR REPLACE FUNCTION public.create_weekly_log(
  p_code TEXT,
  p_participant_id UUID,
  p_log JSONB,
  p_device_secret_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_challenge_id UUID;
  v_row public.weekly_logs;
BEGIN
  v_challenge_id := public._challenge_id_for_code(p_code);
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.participants p
     WHERE p.id = p_participant_id AND p.challenge_id = v_challenge_id
  ) THEN
    RAISE EXCEPTION 'participant_not_in_room' USING ERRCODE = '42501';
  END IF;
  IF p_device_secret_hash IS NOT NULL AND p_device_secret_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'device_secret_hash_invalid' USING ERRCODE = '22023';
  END IF;
  p_log := COALESCE(p_log, '{}'::jsonb);

  INSERT INTO public.weekly_logs (
    participant_id, week_no, recorded_at, age, gender, weight_kg, height_cm,
    body_fat_rate, exercise_count, sleep_hours, diet_quality, note, device_secret_hash
  ) VALUES (
    p_participant_id,
    (p_log->>'week_no')::INTEGER,
    (p_log->>'recorded_at')::DATE,
    (p_log->>'age')::INTEGER,
    p_log->>'gender',
    (p_log->>'weight_kg')::NUMERIC,
    (p_log->>'height_cm')::NUMERIC,
    (p_log->>'body_fat_rate')::NUMERIC,
    (p_log->>'exercise_count')::INTEGER,
    (p_log->>'sleep_hours')::NUMERIC,
    p_log->>'diet_quality',
    p_log->>'note',
    p_device_secret_hash
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'device_secret_hash';
END;
$$;

REVOKE ALL ON FUNCTION public.create_weekly_log(TEXT, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_weekly_log(TEXT, UUID, JSONB, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Self-consistency cleanup (no-op in production — already dropped 2026-10-06)
--    20260514000003's ILIKE patterns did not match the legacy names created by
--    docs/supabase-setup.sql ("Allow anonymous read inbody" / "Allow anonymous upload
--    inbody"), so a fresh environment built from setup + migrations kept them.
--    Both are bucket-wide duplicates of burnfat_inbody_anon_select/insert, so dropping
--    them changes nothing functionally.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous read inbody"   ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload inbody" ON storage.objects;
