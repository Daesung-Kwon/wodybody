#!/usr/bin/env bash
# Validate the BurnFat RLS-lockdown migrations against a throwaway local PostgreSQL.
#
#   PGHOST/PGUSER/... must point at a superuser on a scratch server (never production).
#   Usage: burnfat/supabase/tests/run_local.sh [dbname]   (default: burnfat_rls_test)
#
# Flow: shim → docs/supabase-setup.sql → all existing migrations → seed →
#       baseline (hole reproduced) → A → assert → B → assert → C → assert →
#       re-apply A,B,C (idempotency) → assert → rollback C,B,A → assert → re-apply.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"          # burnfat/supabase
DB="${1:-burnfat_rls_test}"
PSQL=(psql -X -v ON_ERROR_STOP=1 -q -d "$DB")

A="$ROOT/migrations/20261006000001_room_scoped_rpcs.sql"
B="$ROOT/migrations/20261006000002_lockdown_room_reads.sql"
C="$ROOT/migrations/20261006000003_inbody_storage_narrowing.sql"

step() { printf '\n== %s\n' "$*"; }
run() { "${PSQL[@]}" -f "$1"; }

step "fresh database $DB"
dropdb --if-exists "$DB"
createdb "$DB"
run "$HERE/local_supabase_shim.sql"
run "$ROOT/../docs/supabase-setup.sql"

step "existing migrations (up to 20261005000001)"
for f in "$ROOT"/migrations/*.sql; do
  case "$(basename "$f")" in 20261006*) continue ;; esac
  echo "  $(basename "$f")"
  run "$f"
done

step "seed + baseline exposure"
run "$HERE/seed.sql"
run "$HERE/assert_baseline_exposed.sql"

step "Migration A";            run "$A"; run "$HERE/assert_after_a.sql"
step "Migration B";            run "$B"; run "$HERE/assert_after_b.sql"
step "Migration C";            run "$C"; run "$HERE/assert_after_c.sql"
step "re-apply A,B,C (idempotency)"
run "$A"; run "$B"; run "$C"
run "$HERE/assert_after_c.sql"

step "rollback C, B, A"
run "$ROOT/rollback/20261006000003_inbody_storage_narrowing.rollback.sql"
run "$ROOT/rollback/20261006000002_lockdown_room_reads.rollback.sql"
run "$ROOT/rollback/20261006000001_room_scoped_rpcs.rollback.sql"
run "$HERE/assert_rolled_back.sql"

step "re-apply after rollback"
run "$A"; run "$B"; run "$C"
run "$HERE/assert_after_c.sql"

printf '\nALL LOCAL MIGRATION CHECKS PASSED\n'
