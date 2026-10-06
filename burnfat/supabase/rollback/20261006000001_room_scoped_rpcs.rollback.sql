-- Rollback for 20261006000001_room_scoped_rpcs.sql (Migration A)
--
-- ⚠️ Only run this if Migration B is NOT applied (or has been rolled back first) AND the
--    frontend has been reverted to the pre-RPC version. The new frontend calls these
--    functions for every room page load; dropping them breaks it.
--
-- The two legacy storage policies dropped in §3 of Migration A were already absent in
-- production (dropped 2026-10-06 KST). To restore them anyway use
-- /workspace/sbbase/rollback_inbody_policies.sql (kept out of the repo on purpose:
-- they are bucket-wide anon read/upload policies).

BEGIN;
DROP FUNCTION IF EXISTS public.create_weekly_log(TEXT, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_submission(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_participant_basic_info(TEXT, UUID, INTEGER, TEXT, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.join_challenge(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_room_weekly_logs(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_room_participants(TEXT);
DROP FUNCTION IF EXISTS public.get_challenge_by_code(TEXT);
DROP FUNCTION IF EXISTS public._challenge_id_for_code(TEXT);
COMMIT;
