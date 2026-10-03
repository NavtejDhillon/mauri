-- Onboarding: an invited, signed-in user creates her own practitioner row.
-- Read audit: the app records "opened client" events through this function only.

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
  insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, detail)
  values (v_practitioner_id, v_uid, 'insert', 'practitioner', v_practitioner_id, jsonb_build_object('invite_id', v_invite_id));
  return v_practitioner_id;
end $$;
revoke all on function public.accept_invite(text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_invite(text, text, text, text) to authenticated;

create or replace function public.record_client_read(p_client_id uuid, p_request_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_practitioner_id();
begin
  if v_me is null or not public.can_access_client(p_client_id, 'view') then
    raise exception 'no access to this client' using errcode = '42501';
  end if;
  insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id, request_id)
  values (v_me, auth.uid(), 'read', 'client', p_client_id, p_client_id,
          public.relied_on_grant(p_client_id, 'view'), nullif(p_request_id, ''));
end $$;
revoke all on function public.record_client_read(uuid, text) from public, anon, authenticated;
grant execute on function public.record_client_read(uuid, text) to authenticated;

-- Names of the practitioners on the other side of the caller's grants (given or received),
-- so the cover screen can show who, without exposing the directory.
create or replace function public.grant_counterparty_names()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select distinct p.id, p.full_name
  from public.access_grant g
  join public.practitioner p
    on p.id = g.grantor_practitioner_id
    or (g.grantee_type = 'practitioner' and p.id = g.grantee_id)
  where public.current_practitioner_id() is not null
    and (g.grantor_practitioner_id = public.current_practitioner_id()
      or (g.grantee_type = 'practitioner' and g.grantee_id = public.current_practitioner_id()));
$$;
revoke all on function public.grant_counterparty_names() from public, anon, authenticated;
grant execute on function public.grant_counterparty_names() to authenticated;
