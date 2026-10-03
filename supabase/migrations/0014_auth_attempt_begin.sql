-- Stage 1b review fixes, part 1: the attempt limit is taken atomically, known devices get their
-- own bucket, and a key over its cap gains no more rows. 0000 to 0013 are applied and never edited.
--
-- How the limit works now. Every sign-in or code attempt first calls auth_attempt_begin, which
-- holds a lock on the account's key, counts, and (when allowed) records the attempt as a failure
-- before the auth service is asked. Parallel requests therefore queue on the lock and each sees
-- the ones before it. Only auth_attempt_succeeded turns that around: it records a success, and
-- failures before the latest success no longer count. An attempt the auth service never answered
-- (a service error) stays a failure; that is accepted.
--
-- Buckets, each over the last 15 minutes and since the last success for the account:
--   unknown device: 5 failures from one address, and 20 from all addresses together;
--   known device:   5 failures from that device, and the address limits do not apply.
-- A known device is one where she completed MFA before: the app keeps a random token in an
-- httpOnly cookie and the database keeps only its sha256 (known_device). Someone who knows her
-- email can still use up the unknown-device buckets from many addresses, but that no longer
-- locks her out of a phone or computer she has signed in on before.
-- A refused attempt records nothing, so a key never holds more than its caps allow.

-- ---------------------------------------------------------------------------
-- 1. Known devices.
create table public.known_device (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days'
);
comment on table public.known_device is 'Devices where an account completed MFA, as the sha256 of a random token held in the device''s mauri_device cookie. Written only by known_device_register().';
create index known_device_user_idx on public.known_device (auth_user_id, created_at desc);

alter table public.known_device enable row level security;
revoke all on public.known_device from public, anon, authenticated;

-- Registers this device for the signed-in account, which must have passed MFA. p_previous_token
-- is the device's earlier token, if it had one; it is removed when it belongs to the same account,
-- so a device holds one row. Expired rows go, and an account keeps at most its 20 newest devices.
create or replace function public.known_device_register(p_token text, p_previous_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'a device can only be registered after MFA' using errcode = '42501';
  end if;
  if length(coalesce(p_token, '')) < 32 or length(p_token) > 128 then
    raise exception 'the device token must be 32 to 128 characters' using errcode = '22023';
  end if;
  if p_previous_token is not null then
    delete from public.known_device
    where auth_user_id = v_uid and token_hash = encode(sha256(convert_to(p_previous_token, 'UTF8')), 'hex');
  end if;
  insert into public.known_device (auth_user_id, token_hash)
  values (v_uid, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))
  on conflict (token_hash) do nothing;
  delete from public.known_device where expires_at <= now();
  delete from public.known_device
  where auth_user_id = v_uid
    and id not in (select id from public.known_device where auth_user_id = v_uid order by created_at desc, id desc limit 20);
end $$;
revoke all on function public.known_device_register(text, text) from public, anon, authenticated;
grant execute on function public.known_device_register(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The attempt table records which known device an attempt came from, if any.
alter table public.auth_attempt add column device_hash text;
comment on table public.auth_attempt is 'Sign-in and MFA code attempts, keyed by a hash of the email or auth user id. Written only by auth_attempt_begin() and auth_attempt_succeeded().';
comment on column public.auth_attempt.device_hash is 'The known_device token hash the attempt came from; null for an unknown device.';

-- The known device an attempt comes from: the token's hash when it is an unexpired device of the
-- account the attempt is for (for a password, the account with that email; for a code, the
-- signed-in account), otherwise null. Internal: granted to nobody.
create or replace function public.auth_attempt_device(p_kind text, p_email text, p_device_token text) returns text
language plpgsql stable set search_path = public as $$
declare
  v_hash text;
  v_uid uuid;
begin
  if length(coalesce(p_device_token, '')) not between 32 and 128 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_device_token, 'UTF8')), 'hex');
  if p_kind = 'mfa' then
    v_uid := auth.uid();
  else
    select u.id into v_uid from auth.users u where lower(u.email) = lower(trim(coalesce(p_email, ''))) limit 1;
  end if;
  if v_uid is null then
    return null;
  end if;
  if exists (select 1 from public.known_device d
             where d.token_hash = v_hash and d.auth_user_id = v_uid and d.expires_at > now()) then
    return v_hash;
  end if;
  return null;
end $$;
revoke all on function public.auth_attempt_device(text, text, text) from public, anon, authenticated;

-- The lock both functions below hold while they read and write a key's attempts. Internal.
create or replace function public.auth_attempt_lock(p_kind text, p_key text) returns void
language sql volatile set search_path = public as $$
  select pg_advisory_xact_lock(hashtextextended('auth_attempt:' || p_kind || ':' || p_key, 0));
$$;
revoke all on function public.auth_attempt_lock(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Begin an attempt: true when it may go ahead (and it is now recorded as a failure), false when
--    a bucket is full (and nothing is recorded). Volatile, so each statement after the lock sees
--    every attempt committed before it.
create or replace function public.auth_attempt_begin(p_kind text, p_email text, p_ip text, p_device_token text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_key text := public.auth_attempt_key(p_kind, p_email);
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  v_device text;
  v_last_success bigint;
  v_here bigint;
  v_all bigint;
  v_on_device bigint;
begin
  perform public.auth_attempt_lock(p_kind, v_key);
  v_device := public.auth_attempt_device(p_kind, p_email, p_device_token);
  delete from public.auth_attempt where at < now() - interval '7 days';

  select coalesce(max(a.id), 0) into v_last_success
  from public.auth_attempt a
  where a.kind = p_kind and a.key_hash = v_key and a.succeeded;

  if v_device is not null then
    select count(*) into v_on_device
    from public.auth_attempt a
    where a.kind = p_kind and a.key_hash = v_key and not a.succeeded
      and a.id > v_last_success and a.at > now() - interval '15 minutes'
      and a.device_hash = v_device;
    if v_on_device >= 5 then
      return false;
    end if;
  else
    select count(*) filter (where a.ip = v_ip), count(*) into v_here, v_all
    from public.auth_attempt a
    where a.kind = p_kind and a.key_hash = v_key and not a.succeeded
      and a.id > v_last_success and a.at > now() - interval '15 minutes'
      and a.device_hash is null;
    if v_here >= 5 or v_all >= 20 then
      return false;
    end if;
  end if;

  insert into public.auth_attempt (kind, key_hash, ip, device_hash, succeeded) values (p_kind, v_key, v_ip, v_device, false);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Record a success, which resets every bucket for the key. Only the session that actually
--    authenticated may: a password success needs a session for that email, a code success needs
--    an aal2 session. Without this, anyone could clear a midwife's count between guesses.
create or replace function public.auth_attempt_succeeded(p_kind text, p_email text, p_ip text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_key text := public.auth_attempt_key(p_kind, p_email);
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
begin
  if p_kind = 'password' and not exists (
       select 1 from auth.users u
       where u.id = auth.uid() and lower(u.email) = lower(trim(p_email))) then
    raise exception 'a sign-in success can only be recorded by that account' using errcode = '42501';
  end if;
  if p_kind = 'mfa' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'a code success can only be recorded with MFA' using errcode = '42501';
  end if;
  perform public.auth_attempt_lock(p_kind, v_key);
  insert into public.auth_attempt (kind, key_hash, ip, succeeded) values (p_kind, v_key, v_ip, true);
end $$;

-- Password sign-in begins before there is a session, so begin is reachable by anon (a reviewed
-- exception in scripts/db/public-execute-allowlist.ts). A success always has a session.
revoke all on function public.auth_attempt_begin(text, text, text, text) from public, anon, authenticated;
revoke all on function public.auth_attempt_succeeded(text, text, text) from public, anon, authenticated;
grant execute on function public.auth_attempt_begin(text, text, text, text) to anon, authenticated;
grant execute on function public.auth_attempt_succeeded(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The check-then-record pair from 0013 let parallel requests all pass the check.
drop function public.auth_attempt_allowed(text, text, text);
drop function public.auth_attempt_record(text, text, text, boolean);
