-- BurnFat RLS lockdown — Migration C (STORAGE, inbody bucket)
--
-- ⚠️ Prerequisites (do NOT apply before all are true)
--   1. Railway backend with POST /api/burnfat/images/sign is deployed
--      (backend/routes/burnfat_images.py; uses the existing SUPABASE_URL +
--       SUPABASE_SERVICE_ROLE_KEY Railway variables — no new secret).
--   2. Frontend that (a) asks the backend for signed URLs and (b) uploads with
--      upsert:false is deployed to burnfat.wodybody.com and www.wodybody.com/burnfat.
--   3. Smoke test passed: opening a proof image ("보기") in production works and the
--      network tab shows /api/burnfat/images/sign returning 200.
--   Migration B is independent of this one; A → (frontend+backend deploy) → B → C.
--
-- Before (production 2026-10-06)
--   burnfat_inbody_anon_select  SELECT  anon,authenticated  bucket_id='inbody'
--   burnfat_inbody_anon_insert  INSERT  anon,authenticated  bucket_id='inbody'
--   burnfat_inbody_anon_update  UPDATE  anon,authenticated  bucket_id='inbody'
--   → anon could list the whole bucket, sign a URL for any image, overwrite any object.
--
-- After
--   * No anon SELECT  → no listing, no client-side createSignedUrl. Display URLs are
--     signed server-side by the Railway backend after it checks the image folder
--     belongs to a participant of the room whose code the caller presented.
--   * No anon UPDATE (and no DELETE, as before) → no overwrite. Upload uses upsert:false.
--   * Anon INSERT only for "<existing participant uuid>/<safe file name>.<jpg|jpeg|png|webp>".
--     Participant ids are only discoverable through the room-code RPCs after Migration B.
--
-- Idempotent. Rollback: burnfat/supabase/rollback/20261006000003_inbody_storage_narrowing.rollback.sql

-- Helper for the INSERT policy. SECURITY DEFINER because after Migration B anon
-- cannot SELECT participants (policy expressions run as the calling role).
CREATE OR REPLACE FUNCTION public.inbody_upload_path_allowed(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,96}\.(jpg|jpeg|png|webp)$'
     AND EXISTS (
       SELECT 1 FROM public.participants p
        WHERE p.id::text = split_part(p_name, '/', 1)
     );
$$;

REVOKE ALL ON FUNCTION public.inbody_upload_path_allowed(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inbody_upload_path_allowed(TEXT) TO anon, authenticated;

-- Legacy names (already gone in production; see 20261006000001 §3).
DROP POLICY IF EXISTS "Allow anonymous read inbody"   ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload inbody" ON storage.objects;

-- Bucket-wide anon read/overwrite → removed.
DROP POLICY IF EXISTS "burnfat_inbody_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "burnfat_inbody_anon_update" ON storage.objects;

-- Anon upload → scoped to an existing participant's folder.
DROP POLICY IF EXISTS "burnfat_inbody_anon_insert" ON storage.objects;
CREATE POLICY "burnfat_inbody_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'inbody'
    AND public.inbody_upload_path_allowed(name)
  );

-- The bucket must stay private (it is in production; toggle lives in the dashboard).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'inbody' AND public) THEN
    RAISE WARNING 'storage bucket "inbody" is PUBLIC — turn "Public bucket" OFF in the Supabase dashboard; RLS does not protect public-bucket URLs';
  END IF;
END $$;
