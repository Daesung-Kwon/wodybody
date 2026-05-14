-- BurnFat Sprint 0.3: inbody Storage 버킷 Private 화 + signed URL 전환 (Storage 정책 부분)
--
-- ⚠️ 운영 메모 (반드시 별도 수행)
--   1. Supabase Dashboard → Storage → 'inbody' 버킷
--      → "Public bucket" 토글을 OFF로 변경하세요.
--      (이 옵션은 SQL로 변경 불가합니다.)
--   2. 클라이언트는 createSignedUrl(path, 7일)로 표시용 URL을 생성합니다.
--
-- 본 마이그레이션은 storage.objects RLS 정책만 정리합니다.

-- 기존에 다양한 이름으로 만들어졌을 수 있는 public read 정책 제거
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND (
         policyname ILIKE '%inbody%public%'
         OR policyname ILIKE '%inbody%anon%read%'
         OR policyname ILIKE '%public%inbody%'
         OR policyname ILIKE '%inbody%select%'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 익명 INSERT (인증 사진 업로드) — 유지
DROP POLICY IF EXISTS "burnfat_inbody_anon_insert" ON storage.objects;
CREATE POLICY "burnfat_inbody_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'inbody');

-- 익명 SELECT — createSignedUrl 발급에 필요
DROP POLICY IF EXISTS "burnfat_inbody_anon_select" ON storage.objects;
CREATE POLICY "burnfat_inbody_anon_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'inbody');

-- UPDATE는 INSERT 후 upsert: true 옵션을 위해 일단 유지하되 동일 bucket으로 제한
DROP POLICY IF EXISTS "burnfat_inbody_anon_update" ON storage.objects;
CREATE POLICY "burnfat_inbody_anon_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'inbody')
  WITH CHECK (bucket_id = 'inbody');
