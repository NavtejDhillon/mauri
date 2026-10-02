#!/usr/bin/env bash
# Runs every migration, then every pgTAP test, against a throwaway database
# in a supabase/postgres container. Exit code 1 on any failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Optional local settings: DB_TEST_SSH=user@host runs Docker on that host over SSH.
if [ -f "$ROOT/.env.db-test" ]; then set -a; . "$ROOT/.env.db-test"; set +a; fi

CONTAINER="${DB_TEST_CONTAINER:-mauri-db-test}"
IMAGE="supabase/postgres:15.8.1.085"
PORT="${DB_TEST_PORT:-54329}"
DB="mauri_test"
TEMPLATE="mauri_template"

if [ -n "${DB_TEST_SSH:-}" ]; then
  # Quote each argument so the remote shell does not re-parse it.
  dk() { ssh "$DB_TEST_SSH" "$(printf '%q ' docker "$@")"; }
else
  dk() { docker "$@"; }
fi

# The image requires a password for supabase_admin even over the local socket.
psql_admin() { dk exec -i -e PGPASSWORD=postgres "$CONTAINER" psql -U supabase_admin -v ON_ERROR_STOP=1 -q "$@"; }

if ! dk ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  dk rm -f "$CONTAINER" >/dev/null 2>&1 || true
  dk run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -p "$PORT:5432" "$IMAGE" >/dev/null
fi

# Check over TCP: the entrypoint's temporary init-time server only listens on
# the Unix socket, and connecting to it would interrupt the image's own setup.
for i in $(seq 1 60); do
  if dk exec "$CONTAINER" pg_isready -h 127.0.0.1 -U supabase_admin -d postgres >/dev/null 2>&1; then break; fi
  sleep 1
  if [ "$i" = 60 ]; then echo "database did not become ready"; exit 1; fi
done

# The image builds the Supabase schemas (auth, storage, extensions) into the
# postgres database only, so clone that once per container into a template.
# Cloning needs no other sessions on the source; the pg_cron and pg_net
# workers hold one each and reconnect within seconds, hence the retry.
if [ "$(psql_admin -d postgres -Atc "select count(*) from pg_database where datname = '$TEMPLATE'")" != 1 ]; then
  for i in $(seq 1 10); do
    out="$(psql_admin -d postgres \
      -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'postgres' and pid <> pg_backend_pid()" \
      -c "create database $TEMPLATE template postgres" 2>&1)" && break
    sleep 1
    if [ "$i" = 10 ]; then echo "$out"; echo "could not create template database"; exit 1; fi
  done
fi

psql_admin -d postgres -c "drop database if exists $DB" >/dev/null
psql_admin -d postgres -c "create database $DB template $TEMPLATE" >/dev/null

# The auth service normally installs these; the test container has no auth service.
psql_admin -d "$DB" < "$ROOT/supabase/tests/gotrue_auth_functions.sql"

shopt -s nullglob
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migration: $(basename "$f")"
  psql_admin -d "$DB" < "$f"
done

psql_admin -d "$DB" < "$ROOT/supabase/tests/00_helpers.sql"

fail=0
for f in "$ROOT"/supabase/tests/[0-9][0-9]_*.sql; do
  [ "$(basename "$f")" = "00_helpers.sql" ] && continue
  echo "test: $(basename "$f")"
  out="$(psql_admin -d "$DB" -At < "$f" 2>&1)" || { echo "$out"; fail=1; continue; }
  echo "$out" | grep -E '^(not ok|# )' && fail=1 || true
  echo "$out" | { grep -cE '^ok' || true; } | sed 's/^/  passed: /'
done

if [ "$fail" != 0 ]; then echo "DB TESTS FAILED"; exit 1; fi
echo "DB TESTS PASSED"
