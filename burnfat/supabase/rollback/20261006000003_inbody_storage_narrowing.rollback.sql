-- Rollback for 20261006000003_inbody_storage_narrowing.sql (Migration C)
--
-- Restores EXACTLY the pre-lockdown inbody policies captured from production
-- (project nvmwkyedangfdeggawdm) on 2026-10-06 KST:
--   burnfat_inbody_anon_insert  PERMISSIVE INSERT TO anon,authenticated WITH CHECK (bucket_id = 'inbody')
--   burnfat_inbody_anon_select  PERMISSIVE SELECT TO anon,authenticated USING (bucket_id = 'inbody')
--   burnfat_inbody_anon_update  PERMISSIVE UPDATE TO anon,authenticated USING (bucket_id = 'inbody') WITH CHECK (bucket_id = 'inbody')
-- ⚠️ Re-opens bucket listing / signing of any image / overwrite by anon.
--
-- The older legacy policies ("Allow anonymous read inbody" / "Allow anonymous upload
-- inbody", dropped 2026-10-06 before this PR) have their own rollback in
-- /workspace/sbbase/rollback_inbody_policies.sql — not needed for this rollback.

BEGIN;

DROP POLICY IF EXISTS "burnfat_inbody_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "burnfat_inbody_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "burnfat_inbody_anon_update" ON storage.objects;

CREATE POLICY "burnfat_inbody_anon_insert" ON storage.objects
  AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'inbody'::text);
CREATE POLICY "burnfat_inbody_anon_select" ON storage.objects
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (bucket_id = 'inbody'::text);
CREATE POLICY "burnfat_inbody_anon_update" ON storage.objects
  AS PERMISSIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'inbody'::text)
  WITH CHECK (bucket_id = 'inbody'::text);

DROP FUNCTION IF EXISTS public.inbody_upload_path_allowed(TEXT);

COMMIT;
