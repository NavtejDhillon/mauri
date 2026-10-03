begin;
select plan(16);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('one@example.test'), 'Aroha Midwife', 'one@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('two@example.test'), 'Bella Midwife', 'two@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client');

select has_role('platform_admin', 'platform_admin role exists');
select has_function('public', 'search_practitioners', array['text'], 'search_practitioners exists');

-- a signed-in midwife can find colleagues by name, seeing only id and name
select tests.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*) from search_practitioners('bell')), 1::bigint, 'search finds a colleague');
select is((select full_name from search_practitioners('bell')), 'Bella Midwife', 'search returns the name');
select is((select count(*) from search_practitioners('bell') where id = 'a0000000-0000-0000-0000-000000000002'), 1::bigint, 'search returns the id');
select is((select count(*) from search_practitioners('b')), 0::bigint, 'a one-character query returns nothing');
select is((select count(*) from search_practitioners('%')), 0::bigint, 'a wildcard alone returns nothing');
select is((select count(*) from search_practitioners('%%')), 0::bigint, 'wildcards are matched literally, not as patterns');
select is((select count(*) from search_practitioners('b_lla')), 0::bigint, 'underscore is matched literally, not as a pattern');

-- platform_admin can manage practitioners but cannot read clinical data
select tests.admin();
set local role platform_admin;
select lives_ok($$ update practitioner set status = 'suspended' where id = 'a0000000-0000-0000-0000-000000000002' $$, 'platform_admin can suspend');
select lives_ok($$ insert into invite (email, invited_by) values ('new@example.test', 'operator') $$, 'platform_admin can create invites');
select throws_ok($$ select count(*) from client $$, '42501', null, 'platform_admin cannot read clients');
select throws_ok($$ select count(*) from access_grant $$, '42501', null, 'platform_admin cannot read grants');
select throws_ok($$ select count(*) from record_version $$, '42501', null, 'platform_admin cannot read record versions');
select throws_ok($$ select count(*) from client_transfer $$, '42501', null, 'platform_admin cannot read transfers');
select throws_ok($$ select transfer_client('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'x') $$,
  '42501', null, 'platform_admin cannot execute transfer_client');
reset role;

select * from finish();
rollback;
