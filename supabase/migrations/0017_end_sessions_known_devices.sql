-- Stage 1b review fixes, part 4: an authenticator reset also forgets her known devices, and code
-- attempts are capped across all of an account's known devices. 0000 to 0016 are applied and
-- never edited.
--
-- 1. ops.end_sessions now also deletes the account's known_device rows. Otherwise the lost phone's
--    mauri_device cookie would still put its attempts in a known-device bucket of their own, apart
--    from the unknown-device limits. Its audit event records both counts. It keeps its owner (the
--    migration role), security definer, the empty search path, and execute for platform_admin only.
--
-- 2. auth_attempt_begin: a code attempt (kind mfa) from a known device is also refused when the
--    account's known-device code failures in the last 15 minutes, since its last code success,
--    total 20 or more. Each known device has its own five, and an account keeps up to 20 devices,
--    so without this a set of device tokens could try up to 100 codes in 15 minutes. Password
--    attempts keep the per-device buckets of 0014 unchanged.

-- ---------------------------------------------------------------------------
-- 1. End sessions and forget known devices.
create or replace function ops.end_sessions(p_user_id uuid, p_reason text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_sessions integer;
  v_devices integer;
begin
  if p_user_id is null then
    raise exception 'the account is required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_sessions = row_count;
  delete from public.known_device where auth_user_id = p_user_id;
  get diagnostics v_devices = row_count;
  insert into public.audit_event (action, table_name, row_id, detail)
  values ('end_sessions', 'auth.users', p_user_id,
          jsonb_build_object('reason', left(trim(p_reason), 500), 'sessions_ended', v_sessions,
                             'known_devices_removed', v_devices, 'operator', session_user::text));
  return v_sessions;
end $$;
revoke all on function ops.end_sessions(uuid, text) from public, anon, authenticated;
grant execute on function ops.end_sessions(uuid, text) to platform_admin;

-- ---------------------------------------------------------------------------
-- 2. Begin an attempt, with the cross-device cap for codes. Otherwise as in 0014.
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
  v_all_devices bigint;
begin
  perform public.auth_attempt_lock(p_kind, v_key);
  v_device := public.auth_attempt_device(p_kind, p_email, p_device_token);
  delete from public.auth_attempt where at < now() - interval '7 days';

  select coalesce(max(a.id), 0) into v_last_success
  from public.auth_attempt a
  where a.kind = p_kind and a.key_hash = v_key and a.succeeded;

  if v_device is not null then
    select count(*) filter (where a.device_hash = v_device), count(*) into v_on_device, v_all_devices
    from public.auth_attempt a
    where a.kind = p_kind and a.key_hash = v_key and not a.succeeded
      and a.id > v_last_success and a.at > now() - interval '15 minutes'
      and a.device_hash is not null;
    if v_on_device >= 5 or (p_kind = 'mfa' and v_all_devices >= 20) then
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

-- Password sign-in begins before there is a session, so begin stays reachable by anon (the
-- reviewed exception in scripts/db/public-execute-allowlist.ts).
revoke all on function public.auth_attempt_begin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.auth_attempt_begin(text, text, text, text) to anon, authenticated;
