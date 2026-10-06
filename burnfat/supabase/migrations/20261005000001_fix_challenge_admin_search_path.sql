-- Hotfix: update_challenge_admin needs extensions on search_path for pgcrypto (crypt).
-- Same root cause as 20260515000002_fix_pgcrypto_search_path.sql.
-- Safe if 20260820000001 was already applied with public, pg_temp only.

ALTER FUNCTION public.update_challenge_admin(UUID, TEXT, TEXT, DATE, DATE, INTEGER, BOOLEAN)
  SET search_path = public, extensions, pg_temp;
