-- BurnFat RLS lockdown — Migration B (LOCKDOWN)
--
-- ⚠️ Apply ONLY after the frontend that uses the room-scoped RPCs from
--    20261006000001_room_scoped_rpcs.sql is deployed to BOTH
--    burnfat.wodybody.com and www.wodybody.com/burnfat. Older bundles read the tables
--    directly and will show empty rooms once this runs.
--
-- What it does
--   1. Drops EVERY RLS policy on participants / submissions / weekly_logs (all of them
--      are the legacy anon "USING (true)" policies, whatever their name), plus the
--      anon SELECT/INSERT policies on challenges.
--   2. Revokes all direct table privileges on those tables (and challenges_public)
--      from anon / authenticated / PUBLIC. RLS stays ENABLED, so even a future
--      accidental GRANT exposes nothing without a matching policy.
--   3. service_role (Railway backend burnfat_ai.py / burnfat_coach.py, Edge Function
--      ai-advice) bypasses RLS and keeps its own grants — untouched.
--
-- After this, anon can only reach these tables through the SECURITY DEFINER RPCs:
--   get_challenge_by_code, get_room_participants, get_room_weekly_logs,
--   join_challenge, update_participant_basic_info, create_submission,
--   create_weekly_log, update_submission, update_weekly_log,
--   create_challenge_with_pin, verify_admin_pin, set_admin_pin, update_challenge_admin.
--
-- Idempotent. Rollback: burnfat/supabase/rollback/20261006000002_lockdown_room_reads.rollback.sql

-- 1) Policies -----------------------------------------------------------------

-- Known names (documented for grep-ability) ...
DROP POLICY IF EXISTS "Allow anonymous read participants"   ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous insert participants" ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous update"              ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous update participants" ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous read submissions"    ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous insert submissions"  ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous update"              ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous update submissions"  ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous read weekly_logs"    ON public.weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous insert weekly_logs"  ON public.weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous update"              ON public.weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous update weekly_logs"  ON public.weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous read challenges"     ON public.challenges;
DROP POLICY IF EXISTS "Allow anonymous insert challenges"   ON public.challenges;

-- ... and anything else on the three data tables, whatever it was called in a given
-- environment (the cleanup-pattern miss in 20260514000003 showed names drift).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('participants', 'submissions', 'weekly_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  -- challenges: drop policies that apply to anon/authenticated/public
  -- (challenge writes already go through RPCs; reads now go through get_challenge_by_code).
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'challenges'
       AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.challenges', pol.policyname);
  END LOOP;
END $$;

-- 2) RLS stays on ---------------------------------------------------------------
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges   ENABLE ROW LEVEL SECURITY;

-- 3) Privileges -------------------------------------------------------------------
-- (REVOKE on a table also removes the matching column-level grants, e.g. the
--  challenges column grants from 20260514000001.)
REVOKE ALL ON TABLE public.participants      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.submissions       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.weekly_logs       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.challenges        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.challenges_public FROM PUBLIC, anon, authenticated;

-- Make sure the backend role keeps full access (no-op where already granted).
GRANT ALL ON TABLE public.participants, public.submissions, public.weekly_logs,
                   public.challenges, public.challenges_public
  TO service_role;
