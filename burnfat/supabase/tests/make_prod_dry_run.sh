#!/usr/bin/env bash
# Print (stdout) a single SQL script that applies Migrations A+B+C and runs
# prod_checks.sql INSIDE ONE TRANSACTION THAT ENDS IN ROLLBACK — nothing is committed.
# Used once on 2026-10-06 against production via the Management API
# (POST /v1/projects/<ref>/database/query) to prove the migrations parse and behave
# on the real Supabase schema. Does NOT execute anything by itself.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
M="$HERE/../migrations"
echo "BEGIN;"
echo "SET LOCAL lock_timeout = '3s';"
echo "SET LOCAL statement_timeout = '30s';"
cat "$M/20261006000001_room_scoped_rpcs.sql" \
    "$M/20261006000002_lockdown_room_reads.sql" \
    "$M/20261006000003_inbody_storage_narrowing.sql" \
    "$HERE/prod_checks.sql"
echo "ROLLBACK;"
