begin;
select plan(8);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('one@example.test'), 'Aroha Midwife', 'one@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('two@example.test'), 'Bella Midwife', 'two@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client');

-- helper to log in as a practitioner id. Resets to the superuser first so the
-- lookup is not blocked by RLS when called while already logged in as someone
-- else. (Postgres forbids changing the role inside a security definer function,
-- so this cannot be done with security definer.)
create or replace function tests.login(p_practitioner uuid, p_aal text default 'aal2') returns void
language plpgsql as $$
declare v uuid;
begin
  perform tests.admin();
  select auth_user_id into v from public.practitioner where id = p_practitioner;
  perform tests.login_user(v, p_aal);
end $$;

select has_role('platform_admin', 'platform_admin role exists');
select has_function('public', 'search_practitioners', array['text'], 'search_practitioners exists');

-- a signed-in midwife can find colleagues by name, seeing only id and name
select tests.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*) from search_practitioners('bell')), 1::bigint, 'search finds a colleague');
select is((select full_name from search_practitioners('bell')), 'Bella Midwife', 'search returns the name');
select is((select count(*) from search_practitioners('bell') where id = 'a0000000-0000-0000-0000-000000000002'), 1::bigint, 'search returns the id');

-- platform_admin can manage practitioners but cannot read clinical data
select tests.admin();
set local role platform_admin;
select lives_ok($$ update practitioner set status = 'suspended' where id = 'a0000000-0000-0000-0000-000000000002' $$, 'platform_admin can suspend');
select lives_ok($$ insert into invite (email, invited_by) values ('new@example.test', 'operator') $$, 'platform_admin can create invites');
select throws_ok($$ select count(*) from client $$, '42501', null, 'platform_admin cannot read clients');
reset role;

select * from finish();
rollback;
