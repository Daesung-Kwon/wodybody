-- After running the three rollback files (C, B, A): pre-PR behaviour is back.
SET ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM participants) >= 3, 'rollback: anon read of participants not restored';
  ASSERT (SELECT count(*) FROM challenges_public) >= 2, 'rollback: challenges_public read not restored';
  ASSERT (SELECT count(*) FROM storage.objects WHERE bucket_id = 'inbody') >= 2, 'rollback: inbody select not restored';
  UPDATE participants SET age = age WHERE nickname = 'bob';
  ASSERT FOUND, 'rollback: participants update not restored';
  RAISE NOTICE 'rollback restores the captured pre-PR policies/grants';
END $$;
RESET ROLE;
DO $$ BEGIN
  ASSERT to_regprocedure('public.get_room_participants(text)') IS NULL, 'rollback A: function still present';
  ASSERT to_regprocedure('public.inbody_upload_path_allowed(text)') IS NULL, 'rollback C: function still present';
END $$;
