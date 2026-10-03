-- Test-only. Applied by scripts/db/test.sh BEFORE the migrations.
--
-- In a running Supabase stack the auth service (GoTrue) installs auth.jwt()
-- and the current auth.uid() when it starts. The test container runs only the
-- supabase/postgres image, so its auth schema stops at the bootstrap version
-- (auth.uid() reading request.jwt.claim.sub, and no auth.jwt() at all).
-- Migrations depend on these functions, so install them here exactly as
-- GoTrue defines them. Never part of a migration.

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
