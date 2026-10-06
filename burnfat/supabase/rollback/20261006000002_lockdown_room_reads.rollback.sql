-- Rollback for 20261006000002_lockdown_room_reads.sql (Migration B)
--
-- Restores EXACTLY the pre-lockdown policies and grants captured from production
-- (project nvmwkyedangfdeggawdm) on 2026-10-06 KST via pg_policies /
-- information_schema.role_table_grants / information_schema.column_privileges.
-- ⚠️ This RE-OPENS the data exposure (anon can read every room again). Use only to
--    recover from an outage, then re-apply B once fixed.
--
-- Captured policies (all PERMISSIVE, roles={public}):
--   challenges   "Allow anonymous read challenges"     SELECT USING (true)
--   challenges   "Allow anonymous insert challenges"   INSERT WITH CHECK (true)
--   participants "Allow anonymous read participants"   SELECT USING (true)
--   participants "Allow anonymous insert participants" INSERT WITH CHECK (true)
--   participants "Allow anonymous update"              UPDATE USING (true) WITH CHECK (true)
--   submissions  "Allow anonymous read submissions"    SELECT USING (true)
--   submissions  "Allow anonymous insert submissions"  INSERT WITH CHECK (true)
--   weekly_logs  "Allow anonymous read weekly_logs"    SELECT USING (true)
--   weekly_logs  "Allow anonymous insert weekly_logs"  INSERT WITH CHECK (true)
-- Captured grants:
--   participants, submissions, weekly_logs, challenges_public:
--     anon & authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--   challenges (column-level only, no table-level grant):
--     anon & authenticated SELECT (id, code, title, start_date, end_date, stake_amount,
--                                  ranking_unlocked, has_admin_pin, created_at)
--     anon & authenticated INSERT (id, code, title, start_date, end_date, stake_amount,
--                                  ranking_unlocked)

BEGIN;

DROP POLICY IF EXISTS "Allow anonymous read challenges"     ON public.challenges;
DROP POLICY IF EXISTS "Allow anonymous insert challenges"   ON public.challenges;
DROP POLICY IF EXISTS "Allow anonymous read participants"   ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous insert participants" ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous update"              ON public.participants;
DROP POLICY IF EXISTS "Allow anonymous read submissions"    ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous insert submissions"  ON public.submissions;
DROP POLICY IF EXISTS "Allow anonymous read weekly_logs"    ON public.weekly_logs;
DROP POLICY IF EXISTS "Allow anonymous insert weekly_logs"  ON public.weekly_logs;

CREATE POLICY "Allow anonymous read challenges"     ON public.challenges   AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow anonymous insert challenges"   ON public.challenges   AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anonymous read participants"   ON public.participants AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow anonymous insert participants" ON public.participants AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anonymous update"              ON public.participants AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read submissions"    ON public.submissions  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow anonymous insert submissions"  ON public.submissions  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anonymous read weekly_logs"    ON public.weekly_logs  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow anonymous insert weekly_logs"  ON public.weekly_logs  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.participants, public.submissions, public.weekly_logs, public.challenges_public
  TO anon, authenticated;

GRANT SELECT (id, code, title, start_date, end_date, stake_amount, ranking_unlocked, has_admin_pin, created_at)
  ON TABLE public.challenges TO anon, authenticated;
GRANT INSERT (id, code, title, start_date, end_date, stake_amount, ranking_unlocked)
  ON TABLE public.challenges TO anon, authenticated;

COMMIT;
