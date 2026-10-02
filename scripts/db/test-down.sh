#!/usr/bin/env bash
# Removes the throwaway test database container, locally or on the SSH host.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$ROOT/.env.db-test" ]; then set -a; . "$ROOT/.env.db-test"; set +a; fi
CONTAINER="${DB_TEST_CONTAINER:-mauri-db-test}"
if [ -n "${DB_TEST_SSH:-}" ]; then ssh "$DB_TEST_SSH" docker rm -f "$CONTAINER"; else docker rm -f "$CONTAINER"; fi
