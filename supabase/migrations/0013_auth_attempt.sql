-- Stage 1b fixes, part 2: failed sign-in and MFA code attempts are limited by the app.
-- Every auth call reaches the auth service from the app server's address, so the auth service's
-- own address-based limits cannot tell midwives apart. The app checks and records each attempt here.

create table public.auth_attempt (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('password', 'mfa')),
  key_hash text not null,
  ip text not null,
  succeeded boolean not null,
  at timestamptz not null default now()
);
comment on table public.auth_attempt is 'Sign-in and MFA code attempts, keyed by a hash of the email or auth user id. Written only by auth_attempt_record().';
create index auth_attempt_key_idx on public.auth_attempt (kind, key_hash, id);
create index auth_attempt_at_idx on public.auth_attempt (at);

-- RLS on with no policies, and no privileges: only the security definer functions below touch it.
alter table public.auth_attempt enable row level security;
revoke all on public.auth_attempt from public, anon, authenticated;

-- The key an attempt is counted against: for mfa the caller's auth user id, for password the
-- trimmed, lower-cased email. Stored as a sha256 hex digest, never in the clear.
-- Internal: called only from the security definer functions below, so it is granted to nobody.
create or replace function public.auth_attempt_key(p_kind text, p_email text) returns text
language plpgsql stable set search_path = public as $$
declare
  v_key text;
begin
  if p_kind = 'mfa' then
    if auth.uid() is null then
      raise exception 'an MFA attempt needs a signed-in session' using errcode = '42501';
    end if;
    v_key := auth.uid()::text;
  elsif p_kind = 'password' then
    v_key := lower(trim(coalesce(p_email, '')));
    if v_key = '' then
      raise exception 'email is required' using errcode = '22023';
    end if;
  else
    raise exception 'unknown attempt kind %', p_kind using errcode = '22023';
  end if;
  return encode(sha256(convert_to(v_key, 'UTF8')), 'hex');
end $$;
revoke all on function public.auth_attempt_key(text, text) from public, anon, authenticated;

-- May this attempt go ahead? False when, since the last success for the key, there have been
-- 5 or more failures from this address, or 20 or more from any address, in the last 15 minutes.
create or replace function public.auth_attempt_allowed(p_kind text, p_email text, p_ip text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_key text := public.auth_attempt_key(p_kind, p_email);
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  v_last_success bigint;
  v_here bigint;
  v_all bigint;
begin
  select coalesce(max(a.id), 0) into v_last_success
  from public.auth_attempt a
  where a.kind = p_kind and a.key_hash = v_key and a.succeeded;

  select count(*) filter (where a.ip = v_ip), count(*) into v_here, v_all
  from public.auth_attempt a
  where a.kind = p_kind and a.key_hash = v_key and not a.succeeded
    and a.id > v_last_success
    and a.at > now() - interval '15 minutes';

  return v_here < 5 and v_all < 20;
end $$;

-- Record an attempt and delete attempts older than 7 days.
-- A success resets the count, so only the session that actually authenticated may record one:
-- a password success needs a session for that email, a code success needs an aal2 session.
-- Without this, anyone holding the public key could clear a midwife's count between guesses.
create or replace function public.auth_attempt_record(p_kind text, p_email text, p_ip text, p_succeeded boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_key text := public.auth_attempt_key(p_kind, p_email);
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
begin
  if p_succeeded is null then
    raise exception 'succeeded is required' using errcode = '22023';
  end if;
  if p_succeeded and p_kind = 'password' and not exists (
       select 1 from auth.users u
       where u.id = auth.uid() and lower(u.email) = lower(trim(p_email))) then
    raise exception 'a sign-in success can only be recorded by that account' using errcode = '42501';
  end if;
  if p_succeeded and p_kind = 'mfa' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'a code success can only be recorded with MFA' using errcode = '42501';
  end if;

  insert into public.auth_attempt (kind, key_hash, ip, succeeded) values (p_kind, v_key, v_ip, p_succeeded);
  delete from public.auth_attempt where at < now() - interval '7 days';
end $$;

-- Password sign-in happens before there is a session, so both are reachable by anon.
-- Reviewed exceptions in scripts/db/public-execute-allowlist.ts.
revoke all on function public.auth_attempt_allowed(text, text, text) from public, anon, authenticated;
revoke all on function public.auth_attempt_record(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.auth_attempt_allowed(text, text, text) to anon, authenticated;
grant execute on function public.auth_attempt_record(text, text, text, boolean) to anon, authenticated;
