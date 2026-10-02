-- Practitioners, practices, membership and invites.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end $$;

create table public.practitioner (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended')),
  is_operator boolean not null default false,
  full_name text not null,
  email text not null,
  phone text,
  hpi_cpn text,
  midwifery_council_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.practitioner is 'One row per midwife (or operator) with an account.';
comment on column public.practitioner.is_operator is 'True only for operator accounts; set by platform_admin, never by the user.';

create trigger practitioner_updated_at before update on public.practitioner
  for each row execute function public.set_updated_at();

create table public.practice (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger practice_updated_at before update on public.practice
  for each row execute function public.set_updated_at();

create table public.practice_member (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practice (id),
  practitioner_id uuid not null references public.practitioner (id),
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);
create unique index practice_member_current_unique
  on public.practice_member (practice_id, practitioner_id) where left_at is null;
create index practice_member_practitioner_idx on public.practice_member (practitioner_id) where left_at is null;

create table public.invite (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_practitioner_id uuid references public.practitioner (id)
);
comment on table public.invite is 'Operator-issued invitations. The auth-side invite link is managed by GoTrue; this row is the record of it.';

-- Lock everything down immediately. Policies arrive in a later migration.
alter table public.practitioner enable row level security;
alter table public.practice enable row level security;
alter table public.practice_member enable row level security;
alter table public.invite enable row level security;

revoke all on public.practitioner, public.practice, public.practice_member, public.invite from anon;
