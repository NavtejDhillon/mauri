# Database

- `migrations/`: numbered SQL files applied in order. Source of truth for the schema. Never edit an applied migration; add a new one.
- `tests/`: pgTAP tests. `gotrue_auth_functions.sql` is applied before the migrations and installs `auth.jwt()` and `auth.uid()` exactly as the auth service does in a running stack (the test container has no auth service). `00_helpers.sql` is applied after the migrations and provides `tests.create_user`, `tests.login_user`, `tests.anon`, `tests.admin`.

Run locally:

    pnpm db:test

The runner creates a throwaway `supabase/postgres` container, applies every migration to a fresh database, then runs every test file. Each test file wraps itself in `begin ... rollback`.

Docker can run locally or on another machine over SSH. A git-ignored `.env.db-test` file in the repo root sets `DB_TEST_SSH=user@host` (where Docker runs) and `DB_TEST_HOST=host` (how the test database is reached by the audit script). Without the file, Docker is used locally, as in CI.

Apply to staging: `pnpm db:migrate` (see scripts/db/migrate.sh, added later in stage 1).
