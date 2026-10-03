-- Stage 1b fixes, part 1: the practitioner row needs MFA, and audit events for writes carry the
-- app's request id. 0000 to 0011 are applied on staging and are never edited.

-- ---------------------------------------------------------------------------
-- 1. A midwife's own practitioner row is behind the second factor, like every clinical table.
--    Server actions run before any layout gate, so the database is the boundary.
drop policy practitioner_select_self on public.practitioner;
create policy practitioner_select_self on public.practitioner
  for select to authenticated
  using (auth_user_id = auth.uid() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

drop policy practitioner_update_self on public.practitioner;
create policy practitioner_update_self on public.practitioner
  for update to authenticated
  using (auth_user_id = auth.uid() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  with check (auth_user_id = auth.uid() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

-- ---------------------------------------------------------------------------
-- 2. The request id an audit event records: the session setting when a function sets one,
--    otherwise the x-mauri-request-id header the app sends (PostgREST exposes headers as
--    request.headers). The header arrives from outside the database, so it is capped.
--    Internal: called only from security definer functions, so it is granted to nobody.
create or replace function public.audit_request_id() returns text
language sql stable set search_path = public as $$
  select left(coalesce(
    nullif(current_setting('mauri.request_id', true), ''),
    nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-mauri-request-id', '')), 64);
$$;
revoke all on function public.audit_request_id() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. accept_invite: the profile step comes after MFA, so it requires aal2. Otherwise as in 0010,
--    and its audit event now carries the request id.
create or replace function public.accept_invite(
  p_full_name text, p_phone text, p_midwifery_council_number text, p_hpi_cpn text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite_id uuid;
  v_practitioner_id uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not signed in with MFA' using errcode = '42501';
  end if;
  -- The accepted invite is no longer pending, so without this check a second call would be
  -- refused as "no invite" rather than as "already registered".
  if exists (select 1 from public.practitioner where auth_user_id = v_uid) then
    raise exception 'this account already has a practitioner' using errcode = '23505';
  end if;
  select email into v_email from auth.users where id = v_uid;
  select id into v_invite_id from public.invite
  where lower(email) = lower(v_email) and accepted_at is null and expires_at > now()
  order by created_at desc limit 1;
  if v_invite_id is null then
    raise exception 'no pending invite for this account' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'full name is required' using errcode = '23514';
  end if;
  insert into public.practitioner (auth_user_id, full_name, email, phone, midwifery_council_number, hpi_cpn)
  values (v_uid, trim(p_full_name), v_email, nullif(trim(p_phone), ''), nullif(trim(p_midwifery_council_number), ''), nullif(trim(p_hpi_cpn), ''))
  returning id into v_practitioner_id;
  update public.invite set accepted_at = now(), accepted_practitioner_id = v_practitioner_id where id = v_invite_id;
  insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, request_id, detail)
  values (v_practitioner_id, v_uid, 'insert', 'practitioner', v_practitioner_id, public.audit_request_id(),
          jsonb_build_object('invite_id', v_invite_id));
  return v_practitioner_id;
end $$;
revoke all on function public.accept_invite(text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_invite(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Clinical writes: as in 0008, with the request id from audit_request_id().
create or replace function public.clinical_row_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
  v_action text;
  v_me uuid := public.current_practitioner_id();
  v_grant uuid;
begin
  if tg_table_name = 'client' then
    v_client_id := coalesce(new.id, old.id);
  else
    v_client_id := coalesce(new.client_id, old.client_id);
  end if;
  v_grant := public.relied_on_grant(v_client_id, 'cover');

  if tg_op = 'INSERT' then
    v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then v_action := 'soft_delete';
    elsif old.deleted_at is not null and new.deleted_at is null then v_action := 'restore';
    else v_action := 'update';
    end if;
    insert into public.record_version (table_name, row_id, client_id, previous_row, changed_by, grant_id)
    values (tg_table_name, old.id, v_client_id, to_jsonb(old), v_me, v_grant);
  end if;

  insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id, request_id)
  values (v_me, auth.uid(), v_action, tg_table_name, coalesce(new.id, old.id), v_client_id, v_grant,
          public.audit_request_id());
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Grants and revocations: as in 0005, with the request id.
create or replace function public.grant_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id, request_id, detail)
    values (public.current_practitioner_id(), auth.uid(), 'grant', 'access_grant', new.id, new.client_id, new.id,
            public.audit_request_id(),
            jsonb_build_object('grantee_type', new.grantee_type, 'grantee_id', new.grantee_id, 'level', new.level, 'kind', new.kind, 'ends_at', new.ends_at));
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id, request_id)
    values (public.current_practitioner_id(), auth.uid(), 'revoke', 'access_grant', new.id, new.client_id, new.id,
            public.audit_request_id());
  end if;
  return new;
end $$;

-- create or replace keeps existing privileges, but restate them so this file stands on its own.
revoke all on function public.clinical_row_changed() from public, anon, authenticated;
revoke all on function public.grant_changed() from public, anon, authenticated;
