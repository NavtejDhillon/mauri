#!/usr/bin/env bash
# Removes the throwaway test database container, locally or on the SSH host.
# Only removes a container carrying the label test.sh puts on the ones it creates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env.db-test" ]; then set -a; . "$ROOT/.env.db-test"; set +a; fi
CONTAINER="${DB_TEST_CONTAINER:-mauri-db-test}"
LABEL_KEY="mauri.role"
LABEL_VALUE="db-test"

if [ -n "${DB_TEST_SSH:-}" ]; then
  dk() { ssh "$DB_TEST_SSH" "$(printf '%q ' docker "$@")"; }
else
  dk() { docker "$@"; }
fi

if ! dk ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "no container named $CONTAINER"
  exit 0
fi
if [ "$(dk inspect -f "{{index .Config.Labels \"$LABEL_KEY\"}}" "$CONTAINER" 2>/dev/null)" != "$LABEL_VALUE" ]; then
  echo "refusing: container $CONTAINER is not labelled $LABEL_KEY=$LABEL_VALUE, so it was not created by test.sh." >&2
  echo "If it really is a test container, remove it by name: docker rm -f $CONTAINER" >&2
  exit 1
fi
dk rm -f "$CONTAINER"
