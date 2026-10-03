-- Access hardening from the stage 1 security review.
-- 0000 to 0007 are applied on staging and are never edited; every change is a replacement here.

-- ---------------------------------------------------------------------------
-- 1. relied_on_grant: only return a grant sufficient for the operation, preferring cover.
--    The old version sorted level as text, so a view grant could be recorded as the basis of a write.
drop function if exists public.relied_on_grant(uuid);
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
  return (
    select g.id from public.access_grant g
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
              where pm.practice_id = g.grantee_id and pm.practitioner_id = v_me and pm.left_at is null))
        or (g.grantee_type = 'operator' and exists (
              select 1 from public.practitioner op where op.id = v_me and op.is_operator))
      )
    order by case g.level when 'cover' then 0 else 1 end, g.client_id nulls last
    limit 1);
end $$;

-- Inserts and updates are writes, so the grant relied on must be a cover grant.
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
          nullif(current_setting('mauri.request_id', true), ''));
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. access_grant updates: no reinstating a revoked grant, no extending the window,
--    and revoked_by is always the practitioner who revoked. More access means a new grant row.
create or replace function public.access_grant_guard() returns trigger
language plpgsql as $$
begin
  if old.revoked_at is not null and new.revoked_at is null then
    raise exception 'a revoked grant cannot be reinstated; create a new grant' using errcode = '42501';
  end if;
  if old.ends_at is not null and (new.ends_at is null or new.ends_at > old.ends_at) then
    raise exception 'a grant cannot be extended; create a new grant' using errcode = '42501';
  end if;
  if old.revoked_at is null and new.revoked_at is not null then
    new.revoked_by := public.current_practitioner_id();
  end if;
  return new;
end $$;
create trigger access_grant_guard before update on public.access_grant
  for each row execute function public.access_grant_guard();

-- ---------------------------------------------------------------------------
-- 3. Only standard grants can be revoked or shortened by their grantor. The historical grant a
--    transfer creates belongs to the previous LMC's record of care and is not the new owner's to end.
drop policy access_grant_update on public.access_grant;
create policy access_grant_update on public.access_grant
  for update to authenticated
  using (grantor_practitioner_id = public.current_practitioner_id() and kind = 'standard')
  with check (grantor_practitioner_id = public.current_practitioner_id() and kind = 'standard');

-- ---------------------------------------------------------------------------
-- 4. The operator rule (view only, 7 days) cannot be bypassed by treating the operator as a colleague.
--    Policies run under the caller's RLS, which hides other practitioners' rows, so the check is a
--    security definer helper rather than a subquery in the policy.
create or replace function public.is_grantable_practitioner(p_practitioner_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.practitioner p
    where p.id = p_practitioner_id and p.status = 'active' and not p.is_operator);
$$;

drop policy access_grant_insert on public.access_grant;
create policy access_grant_insert on public.access_grant
  for insert to authenticated
  with check (
    grantor_practitioner_id = public.current_practitioner_id()
    and created_by = public.current_practitioner_id()
    and kind = 'standard'
    and (client_id is null or exists (
          select 1 from public.client c
          where c.id = client_id and c.owner_practitioner_id = public.current_practitioner_id()))
    and (grantee_type <> 'practitioner' or public.is_grantable_practitioner(grantee_id))
  );

-- An operator account never owns clients.
drop policy client_insert on public.client;
create policy client_insert on public.client
  for insert to authenticated
  with check (
    owner_practitioner_id = public.current_practitioner_id()
    and public.is_grantable_practitioner(owner_practitioner_id));

create or replace function public.transfer_client(p_client_id uuid, p_to_practitioner_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_practitioner_id();
  v_owner uuid;
  v_to_status text;
  v_to_operator boolean;
  v_transfer_id uuid;
begin
  if v_me is null then
    raise exception 'not signed in with MFA' using errcode = '42501';
  end if;
  select owner_practitioner_id into v_owner from public.client where id = p_client_id and deleted_at is null;
  if v_owner is null or v_owner <> v_me then
    raise exception 'only the owner can transfer a client' using errcode = '42501';
  end if;
  select status, is_operator into v_to_status, v_to_operator from public.practitioner where id = p_to_practitioner_id;
  if v_to_status is distinct from 'active' then
    raise exception 'target practitioner must be active' using errcode = '23514';
  end if;
  if v_to_operator then
    raise exception 'a client cannot be transferred to an operator' using errcode = '23514';
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

-- ---------------------------------------------------------------------------
-- 5. The owner column changes only inside transfer_client(). A practitioner session can set the
--    flag itself, so also require that the statement is not running as the authenticated role
--    (inside the security definer function the current user is the function owner).
create or replace function public.client_guard_columns() returns trigger
language plpgsql as $$
begin
  if new.owner_practitioner_id <> old.owner_practitioner_id
     and not (coalesce(current_setting('mauri.transfer_in_progress', true), '') = 'on'
              and current_user <> 'authenticated') then
    raise exception 'owner can only change through transfer_client()' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and old.owner_practitioner_id is distinct from public.current_practitioner_id() then
    raise exception 'only the owner can delete or restore a client' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 6. The audit trail a practitioner sees omits auth_user_id and request_id.
drop function public.audit_events_for_client(uuid);
create function public.audit_events_for_client(p_client_id uuid)
returns table (id bigint, occurred_at timestamptz, practitioner_id uuid, action text,
               table_name text, row_id uuid, grant_id uuid, detail jsonb)
language sql stable security definer set search_path = public as $$
  select e.id, e.occurred_at, e.practitioner_id, e.action, e.table_name, e.row_id, e.grant_id, e.detail
  from public.audit_event e
  where e.client_id = p_client_id
    and public.can_access_client(p_client_id, 'view')
  order by e.occurred_at desc;
$$;

-- ---------------------------------------------------------------------------
-- 7. platform_admin policies name the commands its privileges allow, nothing wider.
drop policy practitioner_admin on public.practitioner;
drop policy practice_admin on public.practice;
drop policy practice_member_admin on public.practice_member;
drop policy invite_admin on public.invite;
create policy practitioner_admin_select on public.practitioner for select to platform_admin using (true);
create policy practitioner_admin_insert on public.practitioner for insert to platform_admin with check (true);
create policy practitioner_admin_update on public.practitioner for update to platform_admin using (true) with check (true);
create policy practice_admin_select on public.practice for select to platform_admin using (true);
create policy practice_admin_insert on public.practice for insert to platform_admin with check (true);
create policy practice_admin_update on public.practice for update to platform_admin using (true) with check (true);
create policy practice_member_admin_select on public.practice_member for select to platform_admin using (true);
create policy practice_member_admin_insert on public.practice_member for insert to platform_admin with check (true);
create policy practice_member_admin_update on public.practice_member for update to platform_admin using (true) with check (true);
create policy invite_admin_select on public.invite for select to platform_admin using (true);
create policy invite_admin_insert on public.invite for insert to platform_admin with check (true);
create policy invite_admin_update on public.invite for update to platform_admin using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 8. Colleague search needs at least two characters and treats the query as plain text.
create or replace function public.search_practitioners(p_query text)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from public.practitioner p
  where public.current_practitioner_id() is not null
    and length(trim(p_query)) >= 2
    and p.status = 'active'
    and p.is_operator = false
    and p.id <> public.current_practitioner_id()
    and p.full_name ilike
        '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
  order by p.full_name
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- 9. Function privileges: explicit grants only. The image's default privileges give anon,
--    authenticated and service_role execute on every new function, so revoking from public is
--    not enough; name the roles. Only the functions the app calls are granted to authenticated.
--    Trigger functions need no execute privilege at fire time.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.client_guard_columns() from public, anon, authenticated;
revoke all on function public.clinical_row_changed() from public, anon, authenticated;
revoke all on function public.grant_changed() from public, anon, authenticated;
revoke all on function public.access_grant_guard() from public, anon, authenticated;
revoke all on function public.relied_on_grant(uuid, text) from public, anon, authenticated;
revoke all on function public.current_practitioner_id() from public, anon, authenticated;
revoke all on function public.can_access_client(uuid, text) from public, anon, authenticated;
revoke all on function public.is_current_member(uuid) from public, anon, authenticated;
revoke all on function public.is_grantable_practitioner(uuid) from public, anon, authenticated;
revoke all on function public.transfer_client(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.audit_events_for_client(uuid) from public, anon, authenticated;
revoke all on function public.search_practitioners(text) from public, anon, authenticated;

grant execute on function public.current_practitioner_id() to authenticated;
grant execute on function public.can_access_client(uuid, text) to authenticated;
grant execute on function public.is_current_member(uuid) to authenticated;
grant execute on function public.is_grantable_practitioner(uuid) to authenticated; -- evaluated inside policies
grant execute on function public.transfer_client(uuid, uuid, text) to authenticated;
grant execute on function public.audit_events_for_client(uuid) to authenticated;
grant execute on function public.search_practitioners(text) to authenticated;
