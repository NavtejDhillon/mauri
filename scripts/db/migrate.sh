#!/usr/bin/env bash
# Applies pending migrations to the staging database over SSH, in file-name order,
# recording each in public.schema_migration. Idempotent. Each migration and its
# ledger row are applied in one transaction, so a failing migration leaves nothing behind.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${MAURI_DB_HOST:-root@192.168.86.23}"
CONTAINER="${MAURI_DB_CONTAINER:-mauri-db}"

# Quote each argument so the remote shell does not re-parse it.
remote_psql() {
  ssh "$HOST" "$(printf '%q ' docker exec -i "$CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -At -1 "$@")"
}

# Bootstrap the ledger so the applied-list query works on an empty database.
remote_psql -f - < "$ROOT/supabase/migrations/0000_schema_migration.sql"
applied="$(remote_psql -c 'select version from public.schema_migration' < /dev/null)"

for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  if echo "$applied" | grep -qx "$v"; then
    echo "already applied: $v"
    continue
  fi
  echo "applying: $v"
  { cat "$f"; echo; echo "insert into public.schema_migration (version) values ('$v');"; } | remote_psql -f -
done
echo "migrations complete"
