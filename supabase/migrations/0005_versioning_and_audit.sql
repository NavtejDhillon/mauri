-- Every change to a clinical row keeps the previous version and writes an audit event.

create table public.record_version (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid not null,
  client_id uuid,
  previous_row jsonb not null,
  changed_by uuid references public.practitioner (id),
  changed_at timestamptz not null default clock_timestamp(),
  grant_id uuid references public.access_grant (id)
);
create index record_version_row_idx on public.record_version (table_name, row_id, changed_at desc);
create index record_version_client_idx on public.record_version (client_id, changed_at desc);

create table public.audit_event (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  practitioner_id uuid references public.practitioner (id),
  auth_user_id uuid,
  action text not null check (action in ('insert', 'update', 'soft_delete', 'restore', 'read', 'grant', 'revoke', 'transfer')),
  table_name text,
  row_id uuid,
  client_id uuid,
  grant_id uuid references public.access_grant (id),
  request_id text,
  detail jsonb
);
create index audit_event_client_idx on public.audit_event (client_id, occurred_at desc);
create index audit_event_practitioner_idx on public.audit_event (practitioner_id, occurred_at desc);

alter table public.record_version enable row level security;
alter table public.audit_event enable row level security;
revoke all on public.record_version, public.audit_event from anon, authenticated;

-- Which grant is the caller relying on for this client? Null when she is the owner.
create or replace function public.relied_on_grant(p_client_id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.current_practitioner_id();
  v_owner uuid;
begin
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
      and (
        (g.grantee_type = 'practitioner' and g.grantee_id = v_me)
        or (g.grantee_type = 'practice' and exists (
              select 1 from public.practice_member pm
              where pm.practice_id = g.grantee_id and pm.practitioner_id = v_me and pm.left_at is null))
        or (g.grantee_type = 'operator' and exists (
              select 1 from public.practitioner op where op.id = v_me and op.is_operator))
      )
    order by g.client_id nulls last, g.level desc
    limit 1);
end $$;
revoke all on function public.relied_on_grant(uuid) from public;

-- Trigger for clinical tables. Requires the table to have an id and a client_id column
-- (for client itself, the id is the client id).
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
  v_grant := public.relied_on_grant(v_client_id);

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

create trigger client_changed after insert or update on public.client
  for each row execute function public.clinical_row_changed();

-- Grants and revocations are audit events too.
create or replace function public.grant_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id, detail)
    values (public.current_practitioner_id(), auth.uid(), 'grant', 'access_grant', new.id, new.client_id, new.id,
            jsonb_build_object('grantee_type', new.grantee_type, 'grantee_id', new.grantee_id, 'level', new.level, 'kind', new.kind, 'ends_at', new.ends_at));
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    insert into public.audit_event (practitioner_id, auth_user_id, action, table_name, row_id, client_id, grant_id)
    values (public.current_practitioner_id(), auth.uid(), 'revoke', 'access_grant', new.id, new.client_id, new.id);
  end if;
  return new;
end $$;
create trigger access_grant_changed after insert or update on public.access_grant
  for each row execute function public.grant_changed();

-- A practitioner may read the audit trail of a client she can access, through this function only.
create or replace function public.audit_events_for_client(p_client_id uuid)
returns setof public.audit_event
language sql stable security definer set search_path = public as $$
  select * from public.audit_event
  where client_id = p_client_id
    and public.can_access_client(p_client_id, 'view')
  order by occurred_at desc;
$$;
revoke all on function public.audit_events_for_client(uuid) from public;
grant execute on function public.audit_events_for_client(uuid) to authenticated;
