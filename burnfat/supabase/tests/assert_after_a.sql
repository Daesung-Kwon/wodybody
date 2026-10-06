-- After Migration A only: old direct access still works (zero downtime for the old
-- bundle) AND the new RPCs work.
SET ROLE anon;
DO $$
DECLARE
  v JSONB;
BEGIN
  -- old path still works
  ASSERT (SELECT count(*) FROM participants WHERE challenge_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 2, 'A: legacy direct read must still work';
  -- new RPCs
  ASSERT (SELECT count(*) FROM get_challenge_by_code('rooma1')) = 1, 'A: get_challenge_by_code (case-insensitive)';
  ASSERT (SELECT count(*) FROM get_room_participants('ROOMA1')) = 2, 'A: get_room_participants scoped to room';
  ASSERT (SELECT count(*) FROM get_room_weekly_logs('ROOMA1')) = 1, 'A: get_room_weekly_logs scoped to room';
  RAISE NOTICE 'after A: legacy + RPC paths both OK';
END $$;
RESET ROLE;
