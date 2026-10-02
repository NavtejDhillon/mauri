-- The operator's database role: manages accounts, practices and invites. No clinical access.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'platform_admin') then
    create role platform_admin nologin;
  end if;
end $$;

grant usage on schema public to platform_admin;
grant select, insert, update on public.practitioner, public.practice, public.practice_member, public.invite to platform_admin;
grant select on public.audit_event to platform_admin;
grant usage on all sequences in schema public to platform_admin;

create policy practitioner_admin on public.practitioner for all to platform_admin using (true) with check (true);
create policy practice_admin on public.practice for all to platform_admin using (true) with check (true);
create policy practice_member_admin on public.practice_member for all to platform_admin using (true) with check (true);
create policy invite_admin on public.invite for all to platform_admin using (true) with check (true);
create policy audit_event_admin on public.audit_event for select to platform_admin using (true);

-- Colleague lookup for creating grants: id and name only, active practitioners only.
create or replace function public.search_practitioners(p_query text)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from public.practitioner p
  where public.current_practitioner_id() is not null
    and p.status = 'active'
    and p.is_operator = false
    and p.id <> public.current_practitioner_id()
    and p.full_name ilike '%' || p_query || '%'
  order by p.full_name
  limit 20;
$$;
revoke all on function public.search_practitioners(text) from public;
grant execute on function public.search_practitioners(text) to authenticated;
