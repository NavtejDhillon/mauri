-- Move a client to a new LMC. The previous LMC keeps read access to the record of the care she gave.
create or replace function public.transfer_client(p_client_id uuid, p_to_practitioner_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_practitioner_id();
  v_owner uuid;
  v_to_status text;
  v_transfer_id uuid;
begin
  if v_me is null then
    raise exception 'not signed in with MFA' using errcode = '42501';
  end if;
  select owner_practitioner_id into v_owner from public.client where id = p_client_id and deleted_at is null;
  if v_owner is null or v_owner <> v_me then
    raise exception 'only the owner can transfer a client' using errcode = '42501';
  end if;
  select status into v_to_status from public.practitioner where id = p_to_practitioner_id;
  if v_to_status is distinct from 'active' then
    raise exception 'target practitioner must be active' using errcode = '23514';
  end if;
  if p_to_practitioner_id = v_me then
    raise exception 'client already belongs to you' using errcode = '23514';
  end if;

  perform set_config('mauri.transfer_in_progress', 'on', true);
  update public.client set owner_practitioner_id = p_to_practitioner_id where id = p_client_id;
  perform set_config('mauri.transfer_in_progress', 'off', true);

  insert into public.client_transfer (client_id, from_practitioner_id, to_practitioner_id, reason, created_by)
  values (p_client_id, v_me, p_to_practitioner_id, p_reason, v_me)
  returning id into v_transfer_id;

  -- Historical access for the previous LMC, granted by the new owner.
  insert into public.access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, kind, reason, created_by)
  values (p_to_practitioner_id, 'practitioner', v_me, p_client_id, 'view', 'historical',
          'Previous LMC, transferred ' || to_char(now(), 'YYYY-MM-DD'), v_me);

  insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, detail)
  values (v_me, auth.uid(), 'transfer', 'client', p_client_id, p_client_id,
          jsonb_build_object('to', p_to_practitioner_id, 'transfer_id', v_transfer_id, 'reason', p_reason));

  return v_transfer_id;
end $$;
revoke all on function public.transfer_client(uuid, uuid, text) from public;
grant execute on function public.transfer_client(uuid, uuid, text) to authenticated;
