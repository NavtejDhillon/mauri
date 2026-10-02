-- Test-only helpers. Applied by scripts/db/test.sh after the migrations.
-- Never part of a migration.
create extension if not exists pgtap;
create schema if not exists tests;

-- Tests switch role with tests.login_user and then call helpers again while
-- still acting as that role, so the app roles need to reach the schema.
grant usage on schema tests to authenticated, anon;

create or replace function tests.create_user(p_email text) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '', now(), now());
  return v_id;
end $$;

-- Acts as the given auth user. aal2 means MFA passed; aal1 means it did not.
create or replace function tests.login_user(p_auth_user_id uuid, p_aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_auth_user_id, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_user_id::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;

create or replace function tests.admin() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'none', true);
end $$;
