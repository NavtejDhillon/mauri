begin;
select plan(13);

insert into practitioner (id, auth_user_id, full_name, email, status, is_operator) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('old@example.test'),      'Old LMC',   'old@example.test',      'active',    false),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('new@example.test'),      'New LMC',   'new@example.test',      'active',    false),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('other@example.test'),    'Other',     'other@example.test',    'active',    false),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('gone@example.test'),     'Suspended', 'gone@example.test',     'suspended', false),
  ('a0000000-0000-0000-0000-000000000005', tests.create_user('operator@example.test'), 'Operator',  'operator@example.test', 'active',    true);
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Moving', 'Client');

select has_function('public', 'transfer_client', array['uuid', 'uuid', 'text'], 'transfer_client exists');

-- only the owner can transfer
select tests.login('a0000000-0000-0000-0000-000000000003');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'moved') $$,
  '42501', null, 'a non-owner cannot transfer');

-- cannot transfer to a suspended practitioner
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'moved') $$,
  '23514', null, 'cannot transfer to a suspended practitioner');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'moved') $$,
  '23514', null, 'cannot transfer to an operator');

-- the owner column cannot be changed directly, even with the transfer flag forged in the session
select set_config('mauri.transfer_in_progress', 'on', true);
select throws_ok($$ update client set owner_practitioner_id = 'a0000000-0000-0000-0000-000000000002' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', 'owner can only change through transfer_client()', 'a forged transfer flag does not allow a direct owner change');
select set_config('mauri.transfer_in_progress', 'off', true);

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

-- the new owner cannot end the historical grant
select tests.login('a0000000-0000-0000-0000-000000000002');
with u as (update access_grant set revoked_at = now() where kind = 'historical' and client_id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'new owner cannot revoke the historical grant');
with u as (update access_grant set ends_at = now() + interval '1 day' where kind = 'historical' and client_id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'new owner cannot shorten the historical grant');

select * from finish();
rollback;
