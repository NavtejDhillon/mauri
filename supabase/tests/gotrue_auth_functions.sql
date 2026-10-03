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

-- auth.sessions is also created by the auth service's own migrations, so the bootstrap schema
-- lacks it. This is the part the database depends on, with the same delete cascades the auth
-- service declares (checked on staging: refresh_tokens and mfa_amr_claims both cascade from
-- sessions). ops.end_sessions deletes from it.
create table if not exists auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz,
  updated_at timestamptz,
  factor_id uuid,
  aal text,
  not_after timestamptz
);
alter table auth.refresh_tokens add column if not exists session_id uuid references auth.sessions (id) on delete cascade;
