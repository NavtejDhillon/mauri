# Database

- `migrations/`: numbered SQL files applied in order. Source of truth for the schema. Never edit an applied migration; add a new one.
- `tests/`: pgTAP tests. `gotrue_auth_functions.sql` is applied before the migrations and installs `auth.jwt()` and `auth.uid()` exactly as the auth service does in a running stack (the test container has no auth service). `00_helpers.sql` is applied after the migrations and provides `tests.create_user`, `tests.login_user`, `tests.login`, `tests.anon`, `tests.admin`.

Function privileges: the Supabase image's default privileges grant execute on every new function in `public` to `anon`, `authenticated` and `service_role`, so `revoke all on function ... from public` alone leaves anon able to call it. Every migration that creates a function must `revoke all on function ... from public, anon, authenticated` and then grant execute to `authenticated` only if the app calls it. The security audit fails on any function anon can execute.

Run locally:

    pnpm db:test

The runner creates a throwaway `supabase/postgres` container, applies every migration to a fresh database, then runs every test file. Each test file wraps itself in `begin ... rollback`.

Docker can run locally or on another machine over SSH. A git-ignored `.env.db-test` file in the repo root sets `DB_TEST_SSH=user@host` (where Docker runs) and `DB_TEST_HOST=host` (how the test database is reached by the audit script). Without the file, Docker is used locally, as in CI. The container's port is published on `127.0.0.1` locally and on `0.0.0.0` over SSH (the audit connects across the LAN); `DB_TEST_BIND` overrides this.

The runner labels the container it creates `mauri.role=db-test` and refuses to drop databases in, or remove, a container without that label. `pnpm db:test:down` removes the container.

Apply to staging: `pnpm db:migrate` (scripts/db/migrate.sh). Each pending migration and its `schema_migration` row are applied in one transaction, so a failing migration leaves nothing behind. Running it again is a no-op.
