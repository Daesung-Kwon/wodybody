-- BurnFat Sprint 0.2: submissions / weekly_logs UPDATE 잠금 + device_secret 도입
-- 보안 응급 처치
--
-- 변경 사항
--   1. submissions.device_secret_hash, weekly_logs.device_secret_hash 컬럼 추가
--      (SHA-256 hex digest 저장. 클라이언트는 plain device_secret만 localStorage에 보관.)
--   2. submissions / weekly_logs의 익명 UPDATE 정책 모두 제거
--   3. update_submission / update_weekly_log RPC
--      - INSERT 후 24h 이내
--      - device_secret 일치(SHA-256 hex 비교)
--      두 조건 모두 충족 시에만 수정 허용
--   4. DELETE 정책은 처음부터 없음 → 기본 deny 유지

-- 1) device_secret_hash 컬럼
ALTER TABLE submissions   ADD COLUMN IF NOT EXISTS device_secret_hash TEXT;
ALTER TABLE weekly_logs   ADD COLUMN IF NOT EXISTS device_secret_hash TEXT;

-- 2) 기존 익명 UPDATE 정책 제거 (이름이 환경마다 다를 수 있어 알려진 이름 모두 시도)
DROP POLICY IF EXISTS "Allow anonymous update"               ON submissions;
DROP POLICY IF EXISTS "Allow anonymous update submissions"   ON submissions;
DROP POLICY IF EXISTS "Allow anonymous update"               ON weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous update weekly_logs"   ON weekly_logs;

-- (참고: SELECT/INSERT 정책은 그대로 유지 — 공개형·신뢰 기반 INSERT는 허용)

-- 3-1) 헬퍼: 클라이언트 plain device_secret을 SHA-256 hex로 환산
CREATE OR REPLACE FUNCTION public._sha256_hex(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_text, 'sha256'), 'hex');
$$;

-- 3-2) update_submission RPC
CREATE OR REPLACE FUNCTION public.update_submission(
  p_id UUID,
  p_device_secret TEXT,
  p_body_fat_rate DECIMAL DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row submissions;
BEGIN
  SELECT * INTO v_row FROM submissions WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.created_at < NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'edit_window_expired' USING ERRCODE = '42501';
  END IF;
  IF v_row.device_secret_hash IS NULL OR p_device_secret IS NULL THEN
    RAISE EXCEPTION 'device_not_bound' USING ERRCODE = '42501';
  END IF;
  IF v_row.device_secret_hash <> public._sha256_hex(p_device_secret) THEN
    RAISE EXCEPTION 'device_mismatch' USING ERRCODE = '42501';
  END IF;

  UPDATE submissions
     SET body_fat_rate = COALESCE(p_body_fat_rate, body_fat_rate),
         image_url     = COALESCE(p_image_url, image_url)
   WHERE id = p_id
   RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_submission(UUID, TEXT, DECIMAL, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_submission(UUID, TEXT, DECIMAL, TEXT) TO anon, authenticated;

-- 3-3) update_weekly_log RPC (필드는 JSONB 패치)
CREATE OR REPLACE FUNCTION public.update_weekly_log(
  p_id UUID,
  p_device_secret TEXT,
  p_patch JSONB
)
RETURNS weekly_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row weekly_logs;
BEGIN
  SELECT * INTO v_row FROM weekly_logs WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'weekly_log_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.created_at < NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'edit_window_expired' USING ERRCODE = '42501';
  END IF;
  IF v_row.device_secret_hash IS NULL OR p_device_secret IS NULL THEN
    RAISE EXCEPTION 'device_not_bound' USING ERRCODE = '42501';
  END IF;
  IF v_row.device_secret_hash <> public._sha256_hex(p_device_secret) THEN
    RAISE EXCEPTION 'device_mismatch' USING ERRCODE = '42501';
  END IF;

  UPDATE weekly_logs
     SET recorded_at    = COALESCE((p_patch->>'recorded_at')::DATE,        recorded_at),
         age            = COALESCE((p_patch->>'age')::INTEGER,             age),
         gender         = COALESCE( p_patch->>'gender',                    gender),
         weight_kg      = COALESCE((p_patch->>'weight_kg')::DECIMAL,       weight_kg),
         height_cm      = COALESCE((p_patch->>'height_cm')::DECIMAL,       height_cm),
         body_fat_rate  = COALESCE((p_patch->>'body_fat_rate')::DECIMAL,   body_fat_rate),
         exercise_count = COALESCE((p_patch->>'exercise_count')::INTEGER,  exercise_count),
         sleep_hours    = COALESCE((p_patch->>'sleep_hours')::DECIMAL,     sleep_hours),
         diet_quality   = COALESCE( p_patch->>'diet_quality',              diet_quality),
         note           = COALESCE( p_patch->>'note',                      note)
   WHERE id = p_id
   RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_weekly_log(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_weekly_log(UUID, TEXT, JSONB) TO anon, authenticated;
