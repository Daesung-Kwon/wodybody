# BurnFat SQL migration tests

| File | Purpose |
|------|---------|
| `run_local.sh` | Full local validation on a throwaway PostgreSQL (≥15): shim → `docs/supabase-setup.sql` → all migrations → seed → baseline exposure reproduced → **A** → **B** → **C** → re-apply (idempotency) → rollback C/B/A → re-apply. Fails on the first broken assertion. |
| `local_supabase_shim.sql` | Minimal Supabase emulation: `anon` / `authenticated` / `service_role` (BYPASSRLS), Supabase default privileges, `extensions.pgcrypto`, a small `storage` schema with RLS. |
| `seed.sql` | Two rooms (`ROOMA1`, `ROOMB2` with PIN) + participants / submissions / weekly logs / objects. |
| `assert_*.sql` | Assertions per phase (run as `anon` / `service_role`). |
| `prod_checks.sql` + `make_prod_dry_run.sh` | Builds a single `BEGIN; A; B; C; checks; ROLLBACK;` script for a no-commit dry run against a real Supabase project. Outputs counts/booleans only. |

```bash
# local (needs a scratch superuser connection; never point this at production)
sudo -u postgres PGHOST=/var/run/postgresql burnfat/supabase/tests/run_local.sh
```
