-- Records which migration files have been applied. Applied first, by name order.
create table if not exists public.schema_migration (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.schema_migration enable row level security;
revoke all on public.schema_migration from anon, authenticated;
