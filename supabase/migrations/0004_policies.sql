-- Row-level security policies. Every policy is to authenticated only.
-- Clinical tables use can_access_client(). Owner-only tables use current_practitioner_id().

-- practitioner: see yourself; update a few profile columns on yourself.
create policy practitioner_select_self on public.practitioner
  for select to authenticated
  using (auth_user_id = auth.uid());
create policy practitioner_update_self on public.practitioner
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
revoke all on public.practitioner from authenticated;
grant select on public.practitioner to authenticated;
grant update (full_name, phone, hpi_cpn, midwifery_council_number) on public.practitioner to authenticated;

-- practice and practice_member: see the practices you are a current member of, and their members.
create or replace function public.is_current_member(p_practice_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.practice_member pm
    where pm.practice_id = p_practice_id
      and pm.practitioner_id = public.current_practitioner_id()
      and pm.left_at is null);
$$;
revoke all on function public.is_current_member(uuid) from public;
grant execute on function public.is_current_member(uuid) to authenticated;

revoke all on public.practice, public.practice_member, public.invite from authenticated;
create policy practice_select_member on public.practice
  for select to authenticated
  using (public.is_current_member(id));
grant select on public.practice to authenticated;

create policy practice_member_select on public.practice_member
  for select to authenticated
  using (public.is_current_member(practice_id));
grant select on public.practice_member to authenticated;
-- Membership changes are made by platform_admin (a later migration) in stage 1.
-- invite: not visible to practitioners at all in stage 1.

-- client: the clinical pattern.
revoke all on public.client from authenticated;
create policy client_select on public.client
  for select to authenticated
  using (public.can_access_client(id, 'view'));
create policy client_insert on public.client
  for insert to authenticated
  with check (owner_practitioner_id = public.current_practitioner_id());
create policy client_update on public.client
  for update to authenticated
  using (public.can_access_client(id, 'cover'))
  with check (public.can_access_client(id, 'cover'));
grant select, insert, update on public.client to authenticated;

-- The owner column and soft-delete column may only change through controlled paths.
create or replace function public.client_guard_columns() returns trigger
language plpgsql as $$
begin
  if new.owner_practitioner_id <> old.owner_practitioner_id
     and coalesce(current_setting('mauri.transfer_in_progress', true), '') <> 'on' then
    raise exception 'owner can only change through transfer_client()' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and old.owner_practitioner_id is distinct from public.current_practitioner_id() then
    raise exception 'only the owner can delete or restore a client' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger client_guard_columns before update on public.client
  for each row execute function public.client_guard_columns();

-- access_grant: see grants you gave or received; create only as yourself for your own clients; revoke only your own.
revoke all on public.access_grant from authenticated;
create policy access_grant_select on public.access_grant
  for select to authenticated
  using (
    grantor_practitioner_id = public.current_practitioner_id()
    or (grantee_type = 'practitioner' and grantee_id = public.current_practitioner_id())
    or (grantee_type = 'practice' and public.is_current_member(grantee_id))
  );
create policy access_grant_insert on public.access_grant
  for insert to authenticated
  with check (
    grantor_practitioner_id = public.current_practitioner_id()
    and created_by = public.current_practitioner_id()
    and kind = 'standard'
    and (client_id is null or exists (
          select 1 from public.client c
          where c.id = client_id and c.owner_practitioner_id = public.current_practitioner_id()))
  );
create policy access_grant_update on public.access_grant
  for update to authenticated
  using (grantor_practitioner_id = public.current_practitioner_id())
  with check (grantor_practitioner_id = public.current_practitioner_id());
grant select, insert on public.access_grant to authenticated;
grant update (revoked_at, revoked_by, ends_at, reason) on public.access_grant to authenticated;

-- client_transfer: visible to either side; written only by transfer_client().
revoke all on public.client_transfer from authenticated;
create policy client_transfer_select on public.client_transfer
  for select to authenticated
  using (from_practitioner_id = public.current_practitioner_id()
      or to_practitioner_id = public.current_practitioner_id());
grant select on public.client_transfer to authenticated;
