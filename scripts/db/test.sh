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
# Where the container's port is published. Local Docker stays on loopback; over SSH the
# audit script connects across the LAN, so the port must be reachable from outside the host.
if [ -n "${DB_TEST_SSH:-}" ]; then BIND="${DB_TEST_BIND:-0.0.0.0}"; else BIND="${DB_TEST_BIND:-127.0.0.1}"; fi
DB="mauri_test"
TEMPLATE="mauri_template"
# Every container this script creates carries this label, and nothing destructive
# happens to a container without it.
LABEL_KEY="mauri.role"
LABEL_VALUE="db-test"

if [ -n "${DB_TEST_SSH:-}" ]; then
  # Quote each argument so the remote shell does not re-parse it.
  dk() { ssh "$DB_TEST_SSH" "$(printf '%q ' docker "$@")"; }
else
  dk() { docker "$@"; }
fi

container_exists() { dk ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; }
container_running() { dk ps --format '{{.Names}}' | grep -qx "$CONTAINER"; }
is_test_container() {
  [ "$(dk inspect -f "{{index .Config.Labels \"$LABEL_KEY\"}}" "$CONTAINER" 2>/dev/null)" = "$LABEL_VALUE" ]
}
require_test_container() {
  if ! is_test_container; then
    echo "refusing: container $CONTAINER is not labelled $LABEL_KEY=$LABEL_VALUE" >&2
    exit 1
  fi
}

# The image requires a password for supabase_admin even over the local socket.
psql_admin() { dk exec -i -e PGPASSWORD=postgres "$CONTAINER" psql -U supabase_admin -v ON_ERROR_STOP=1 -q "$@"; }

if container_exists && ! is_test_container; then
  if [ "$CONTAINER" = "mauri-db-test" ]; then
    # The default name is only ever used by this script; containers created before the
    # label existed are recreated.
    echo "container $CONTAINER predates the $LABEL_KEY label; recreating it"
    dk rm -f "$CONTAINER" >/dev/null
  else
    echo "container $CONTAINER exists but is not labelled $LABEL_KEY=$LABEL_VALUE; refusing to touch it." >&2
    echo "If it really is a test container, remove it by name: docker rm -f $CONTAINER" >&2
    exit 1
  fi
fi

if ! container_running; then
  if container_exists; then require_test_container; dk rm -f "$CONTAINER" >/dev/null; fi
  dk run -d --name "$CONTAINER" --label "$LABEL_KEY=$LABEL_VALUE" \
    -e POSTGRES_PASSWORD=postgres -p "$BIND:$PORT:5432" "$IMAGE" >/dev/null
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
  require_test_container
  for i in $(seq 1 10); do
    out="$(psql_admin -d postgres \
      -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'postgres' and pid <> pg_backend_pid()" \
      -c "create database $TEMPLATE template postgres" 2>&1)" && break
    sleep 1
    if [ "$i" = 10 ]; then echo "$out"; echo "could not create template database"; exit 1; fi
  done
fi

require_test_container
psql_admin -d postgres -c "drop database if exists $DB" >/dev/null
# A freshly created template can briefly have an autovacuum worker on it, which blocks cloning.
for i in $(seq 1 10); do
  out="$(psql_admin -d postgres -c "create database $DB template $TEMPLATE" 2>&1)" && break
  sleep 1
  if [ "$i" = 10 ]; then echo "$out"; echo "could not create test database"; exit 1; fi
done

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
