-- Documents the hole on the pre-PR schema: anon reads every room + updates participants.
SET ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM participants) = 3, 'baseline: anon should see all participants';
  ASSERT (SELECT count(*) FROM submissions WHERE device_secret_hash IS NOT NULL) = 2, 'baseline: anon sees device_secret_hash';
  ASSERT (SELECT count(*) FROM weekly_logs) = 2, 'baseline: anon sees all weekly logs';
  ASSERT (SELECT count(*) FROM challenges_public) = 2, 'baseline: anon can enumerate room codes';
  ASSERT (SELECT count(*) FROM storage.objects WHERE bucket_id = 'inbody') = 2, 'baseline: anon lists bucket';
  UPDATE participants SET age = age WHERE nickname = 'bob';
  ASSERT FOUND, 'baseline: anon can update any participant';
  RAISE NOTICE 'baseline exposure reproduced';
END $$;
RESET ROLE;
