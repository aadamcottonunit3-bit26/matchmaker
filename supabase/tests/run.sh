#!/usr/bin/env bash
# Repeatable database security tests (LOCAL only, never against production).
# Needs a local PostgreSQL (13+) and a superuser connection URL, for example:
#   ./supabase/tests/run.sh postgresql://postgres:postgres@localhost:5432/postgres
# It creates a throw-away database "sectest", imitates the Supabase pieces (roles, auth.uid(), storage),
# applies migrations 0001..0009 in order and runs the before/after tests with synthetic accounts.
set -u
ADMIN_URL="${1:?usage: run.sh <postgres superuser url>}"
HERE="$(cd "$(dirname "$0")" && pwd)"; M="$HERE/../migrations"
TEST_URL="${ADMIN_URL%/*}/sectest"
q() { psql -X -q -v ON_ERROR_STOP=1 "$TEST_URL" -f "$1" 2>&1 | grep -v '^$'; }
psql -X -q "$ADMIN_URL" -c 'drop database if exists sectest' -c 'create database sectest' >/dev/null
for f in "$HERE/shim.sql" "$M/0001_schema.sql" "$M/0002_upgrade.sql" "$M/0003_personal_details.sql" \
         "$M/0004_income_range_and_gallery.sql" "$HERE/harness.sql" "$HERE/seed.sql"; do q "$f" | grep -E "ERROR" ; done
echo "== BEFORE the fixes (PASS here means the weakness was reproduced) =="; q "$HERE/t_before.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== apply 0005 =="; q "$M/0005_security_hardening.sql" | grep ERROR
echo "== AFTER 0005 =="; q "$HERE/t_after5.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== apply 0006 =="; q "$M/0006_private_birthdate.sql" | grep ERROR
echo "== AFTER 0006 =="; q "$HERE/t_after6.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== trigger checks =="; q "$HERE/t_extra_triggers.sql" | grep NOTICE | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== apply 0008 =="; q "$M/0008_rate_limits_and_server_matching.sql" | grep ERROR
echo "== AFTER 0008 =="; q "$HERE/t_after8.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== rate limiter =="; q "$HERE/t_rate_limit.sql" | grep NOTICE | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== apply 0007 (after the new code is deployed) =="; q "$M/0007_drop_profiles_dob.sql" | grep ERROR
echo "== AFTER 0007 =="; q "$HERE/t_after7.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "== apply 0009 (after the new code is deployed) =="; q "$M/0009_restrict_member_profile_reads.sql" | grep ERROR
echo "== AFTER 0009 =="; q "$HERE/t_after9.sql" | grep -E "PASS|FAIL|passed" | sed 's/^psql:[^ ]* NOTICE:  //'
