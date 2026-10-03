-- The two functions every policy relies on.

-- The calling user's practitioner id, only if active and the session passed MFA.
create or replace function public.current_practitioner_id() returns uuid
language sql stable security definer
set search_path = public
as $$
  select p.id
  from public.practitioner p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke all on function public.current_practitioner_id() from public;
grant execute on function public.current_practitioner_id() to authenticated;

-- Can the calling practitioner access this client at this level?
-- level is 'view' (read) or 'cover' (read and write clinical records).
create or replace function public.can_access_client(p_client_id uuid, p_level text) returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_owner uuid;
begin
  if p_level not in ('view', 'cover') then
    raise exception 'invalid access level %', p_level;
  end if;
  v_me := public.current_practitioner_id();
  if v_me is null then
    return false;
  end if;
  select c.owner_practitioner_id into v_owner from public.client c where c.id = p_client_id;
  if v_owner is null then
    return false;
  end if;
  if v_owner = v_me then
    return true;
  end if;
  return exists (
    select 1
    from public.access_grant g
    where g.grantor_practitioner_id = v_owner
      and (g.client_id = p_client_id or g.client_id is null)
      and g.revoked_at is null
      and g.starts_at <= now()
      and (g.ends_at is null or g.ends_at > now())
      and (p_level = 'view' or g.level = 'cover')
      and (
        (g.grantee_type = 'practitioner' and g.grantee_id = v_me)
        or (g.grantee_type = 'practice' and exists (
              select 1 from public.practice_member pm
              where pm.practice_id = g.grantee_id
                and pm.practitioner_id = v_me
                and pm.left_at is null))
        or (g.grantee_type = 'operator' and exists (
              select 1 from public.practitioner op
              where op.id = v_me and op.is_operator))
      )
  );
end $$;
revoke all on function public.can_access_client(uuid, text) from public;
grant execute on function public.can_access_client(uuid, text) to authenticated;
