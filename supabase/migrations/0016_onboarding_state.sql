-- Stage 1b review fixes, part 3: "she has chosen her password" becomes a set-once database flag.
-- It was a user_metadata value, which the person can write herself through the auth API, so it
-- could be set without choosing a password, or cleared to reopen the password step.

create table public.onboarding_state (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  password_set_at timestamptz
);
comment on table public.onboarding_state is 'Onboarding steps an account has completed. Written only by mark_password_set(); nothing clears a step.';

alter table public.onboarding_state enable row level security;
revoke all on public.onboarding_state from public, anon, authenticated;

-- Records that the signed-in account has chosen its password. Keeps the first time; there is no
-- way to clear it.
create or replace function public.mark_password_set() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.onboarding_state (auth_user_id, password_set_at) values (v_uid, now())
  on conflict (auth_user_id) do update set password_set_at = now()
  where public.onboarding_state.password_set_at is null;
end $$;

-- Whether the signed-in account has chosen its password.
create or replace function public.password_is_set() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.onboarding_state s where s.auth_user_id = auth.uid() and s.password_set_at is not null);
$$;

revoke all on function public.mark_password_set() from public, anon, authenticated;
revoke all on function public.password_is_set() from public, anon, authenticated;
grant execute on function public.mark_password_set() to authenticated;
grant execute on function public.password_is_set() to authenticated;

-- Accounts that already chose a password under the old flag keep it.
insert into public.onboarding_state (auth_user_id, password_set_at)
select u.id, coalesce(u.updated_at, now())
from auth.users u
where u.raw_user_meta_data ->> 'password_set' = 'true'
on conflict (auth_user_id) do nothing;
