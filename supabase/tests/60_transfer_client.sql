begin;
select plan(9);

insert into practitioner (id, auth_user_id, full_name, email, status) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('old@example.test'),   'Old LMC',   'old@example.test',   'active'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('new@example.test'),   'New LMC',   'new@example.test',   'active'),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('other@example.test'), 'Other',     'other@example.test', 'active'),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('gone@example.test'),  'Suspended', 'gone@example.test',  'suspended');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Moving', 'Client');

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

select has_function('public', 'transfer_client', array['uuid', 'uuid', 'text'], 'transfer_client exists');

-- only the owner can transfer
select tests.login('a0000000-0000-0000-0000-000000000003');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'moved') $$,
  '42501', null, 'a non-owner cannot transfer');

-- cannot transfer to a suspended practitioner
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'moved') $$,
  '23514', null, 'cannot transfer to a suspended practitioner');

-- the real transfer
select lives_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'moved to new LMC') $$,
  'owner transfers her client');

select tests.admin();
select is((select owner_practitioner_id from client where id = 'c0000000-0000-0000-0000-000000000001'),
  'a0000000-0000-0000-0000-000000000002', 'new LMC now owns the client');
select is((select count(*) from client_transfer where client_id = 'c0000000-0000-0000-0000-000000000001'), 1::bigint, 'transfer is recorded');
select is((select count(*) from access_grant where kind = 'historical' and grantee_id = 'a0000000-0000-0000-0000-000000000001'
           and grantor_practitioner_id = 'a0000000-0000-0000-0000-000000000002' and level = 'view' and client_id = 'c0000000-0000-0000-0000-000000000001'),
  1::bigint, 'previous LMC holds a historical view grant from the new owner');

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), true, 'previous LMC can still read');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'cover'), false, 'previous LMC can no longer write');

select * from finish();
rollback;
