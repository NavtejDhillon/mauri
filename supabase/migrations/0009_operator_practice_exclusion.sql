-- Grant matching in one place, and operator accounts never reach a client through a practice.
-- Review finding N1: an operator added to a practice by platform_admin would otherwise inherit
-- the practice's grants without the operator rules (view only, 7 days).

-- The id of an active grant from p_owner that reaches p_me for p_client_id at p_level, or null.
-- Internal: called only from the security definer functions below, so it is granted to nobody.
create or replace function public.matching_grant_id(p_owner uuid, p_me uuid, p_client_id uuid, p_level text) returns uuid
language sql stable security definer set search_path = public as $$
  select g.id
  from public.access_grant g
  where g.grantor_practitioner_id = p_owner
    and (g.client_id = p_client_id or g.client_id is null)
    and g.revoked_at is null
    and g.starts_at <= now()
    and (g.ends_at is null or g.ends_at > now())
    and (p_level = 'view' or g.level = 'cover')
    and (
      (g.grantee_type = 'practitioner' and g.grantee_id = p_me)
      or (g.grantee_type = 'practice'
          and exists (
            select 1 from public.practice_member pm
            where pm.practice_id = g.grantee_id and pm.practitioner_id = p_me and pm.left_at is null)
          and not exists (
            select 1 from public.practitioner op where op.id = p_me and op.is_operator))
      or (g.grantee_type = 'operator'
          and exists (
            select 1 from public.practitioner op where op.id = p_me and op.is_operator))
    )
  order by case g.level when 'cover' then 0 else 1 end, g.client_id nulls last
  limit 1;
$$;
revoke all on function public.matching_grant_id(uuid, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.can_access_client(p_client_id uuid, p_level text) returns boolean
language plpgsql stable security definer set search_path = public as $$
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
  return public.matching_grant_id(v_owner, v_me, p_client_id, p_level) is not null;
end $$;

create or replace function public.relied_on_grant(p_client_id uuid, p_level text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.current_practitioner_id();
  v_owner uuid;
begin
  if p_level not in ('view', 'cover') then
    raise exception 'invalid access level %', p_level;
  end if;
  if v_me is null then return null; end if;
  select owner_practitioner_id into v_owner from public.client where id = p_client_id;
  if v_owner is null or v_owner = v_me then return null; end if;
  return public.matching_grant_id(v_owner, v_me, p_client_id, p_level);
end $$;
