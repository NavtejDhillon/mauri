#!/usr/bin/env bash
# Applies pending migrations to the staging database over SSH, in file-name order,
# recording each in public.schema_migration. Idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${MAURI_DB_HOST:-root@192.168.86.23}"
CONTAINER="${MAURI_DB_CONTAINER:-mauri-db}"

remote_psql() {
  ssh "$HOST" "docker exec -i $CONTAINER psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -At $*"
}

# Bootstrap the ledger so the applied-list query works on an empty database.
remote_psql < "$ROOT/supabase/migrations/0000_schema_migration.sql"
applied="$(remote_psql -c '"select version from public.schema_migration"')"

for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  if echo "$applied" | grep -qx "$v"; then
    echo "already applied: $v"
    continue
  fi
  echo "applying: $v"
  { cat "$f"; echo; echo "insert into public.schema_migration (version) values ('$v');"; } | remote_psql
done
echo "migrations complete"
