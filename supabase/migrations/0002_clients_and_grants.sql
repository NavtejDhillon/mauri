-- Clients (minimal columns for stage 1), access grants and ownership transfers.

create table public.client (
  id uuid primary key default gen_random_uuid(),
  owner_practitioner_id uuid not null references public.practitioner (id),
  nhi text,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on column public.client.owner_practitioner_id is 'The LMC. Changed only by transfer_client().';
create index client_owner_idx on public.client (owner_practitioner_id) where deleted_at is null;
create trigger client_updated_at before update on public.client
  for each row execute function public.set_updated_at();

create table public.access_grant (
  id uuid primary key default gen_random_uuid(),
  grantor_practitioner_id uuid not null references public.practitioner (id),
  grantee_type text not null check (grantee_type in ('practitioner', 'practice', 'operator')),
  grantee_id uuid,
  client_id uuid references public.client (id),
  level text not null check (level in ('view', 'cover')),
  kind text not null default 'standard' check (kind in ('standard', 'historical')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.practitioner (id),
  reason text,
  created_by uuid not null references public.practitioner (id),
  created_at timestamptz not null default now(),
  constraint access_grant_grantee_id_rule check (
    (grantee_type = 'operator' and grantee_id is null)
    or (grantee_type <> 'operator' and grantee_id is not null)),
  constraint access_grant_operator_rule check (
    grantee_type <> 'operator'
    or (level = 'view' and ends_at is not null and ends_at <= starts_at + interval '7 days')),
  constraint access_grant_window check (ends_at is null or ends_at > starts_at)
);
comment on table public.access_grant is 'Backup cover, practice sharing, historical access after transfer, and operator support access. A null client_id means the grantor''s whole caseload.';
create index access_grant_grantor_idx on public.access_grant (grantor_practitioner_id) where revoked_at is null;
create index access_grant_grantee_idx on public.access_grant (grantee_type, grantee_id) where revoked_at is null;
create index access_grant_client_idx on public.access_grant (client_id) where revoked_at is null;

create table public.client_transfer (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client (id),
  from_practitioner_id uuid not null references public.practitioner (id),
  to_practitioner_id uuid not null references public.practitioner (id),
  transferred_at timestamptz not null default now(),
  reason text,
  created_by uuid not null references public.practitioner (id)
);

alter table public.client enable row level security;
alter table public.access_grant enable row level security;
alter table public.client_transfer enable row level security;
revoke all on public.client, public.access_grant, public.client_transfer from anon;
