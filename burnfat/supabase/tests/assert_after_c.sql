-- After Migration C: inbody bucket — no listing/signing, no overwrite, scoped upload.
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                       AND policyname IN ('Allow anonymous read inbody', 'Allow anonymous upload inbody',
                                          'burnfat_inbody_anon_select', 'burnfat_inbody_anon_update')), 'C: legacy/broad storage policies survive';
  ASSERT (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'burnfat_inbody_anon_insert') = 1, 'C: insert policy missing';
END $$;

SET ROLE anon;
DO $$
DECLARE
  n INT;
BEGIN
  ASSERT (SELECT count(*) FROM storage.objects WHERE bucket_id = 'inbody') = 0, 'C: anon can still list/select inbody objects';

  -- Same statement storage-api runs for upsert:false uploads (CreateObject: plain INSERT,
  -- no RETURNING) — must pass for an existing participant folder.
  INSERT INTO storage.objects (bucket_id, name, version)
  VALUES ('inbody', 'aaaaaaaa-1111-0000-0000-000000000002/start-' || (extract(epoch FROM clock_timestamp()) * 1000000)::bigint || '.jpg', '1');

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, version)
    VALUES ('inbody', '00000000-0000-0000-0000-000000000000/start-1.jpg', '1');
    RAISE EXCEPTION 'C: upload into non-participant folder accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;  -- RLS violation = 42501
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, version) VALUES ('inbody', 'evil.html', '1');
    RAISE EXCEPTION 'C: upload to bucket root accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, version)
    VALUES ('inbody', 'aaaaaaaa-1111-0000-0000-000000000002/../x.jpg', '1');
    RAISE EXCEPTION 'C: traversal-ish name accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE storage.objects SET version = '2' WHERE bucket_id = 'inbody';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'C: anon can still overwrite objects';
  DELETE FROM storage.objects WHERE bucket_id = 'inbody';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'C: anon can delete objects';
  RAISE NOTICE 'after C: storage narrowed (no select/update/delete, scoped insert)';
END $$;
RESET ROLE;
