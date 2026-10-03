begin;
select plan(19);

-- Fixtures: owner, backup, practice member, stranger, suspended, operator, expired, future.
insert into practitioner (id, auth_user_id, full_name, email, status, is_operator) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),    'Owner',    'owner@example.test',    'active', false),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'),   'Backup',   'backup@example.test',   'active', false),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('member@example.test'),   'Member',   'member@example.test',   'active', false),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('stranger@example.test'), 'Stranger', 'stranger@example.test', 'active', false),
  ('a0000000-0000-0000-0000-000000000005', tests.create_user('suspended@example.test'),'Suspended','suspended@example.test','suspended', false),
  ('a0000000-0000-0000-0000-000000000006', tests.create_user('operator@example.test'), 'Operator', 'operator@example.test', 'active', true),
  ('a0000000-0000-0000-0000-000000000007', tests.create_user('expired@example.test'),  'Expired',  'expired@example.test',  'active', false),
  ('a0000000-0000-0000-0000-000000000008', tests.create_user('future@example.test'),   'Future',   'future@example.test',   'active', false);
insert into practice (id, name) values ('b0000000-0000-0000-0000-000000000001', 'Practice');
-- The operator is also a practice member: practice grants must not reach an operator account.
insert into practice_member (practice_id, practitioner_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'member');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Two', 'Client');

-- Grants: backup has cover on client 1 only; practice has view on the whole caseload;
-- operator has view on client 2 for 2 days; stranger had a grant that was revoked;
-- expired's grant ended yesterday; future's grant starts tomorrow.
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by, starts_at, ends_at, revoked_at) values
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'cover', 'a0000000-0000-0000-0000-000000000001', now(), null, null),
  ('a0000000-0000-0000-0000-000000000001', 'practice',     'b0000000-0000-0000-0000-000000000001', null,                                    'view',  'a0000000-0000-0000-0000-000000000001', now(), null, null),
  ('a0000000-0000-0000-0000-000000000001', 'operator',     null,                                   'c0000000-0000-0000-0000-000000000002', 'view',  'a0000000-0000-0000-0000-000000000001', now(), now() + interval '2 days', null),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000004', null,                                    'cover', 'a0000000-0000-0000-0000-000000000001', now(), null, now() - interval '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000007', null,                                    'cover', 'a0000000-0000-0000-0000-000000000001', now() - interval '2 days', now() - interval '1 day', null),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000008', null,                                    'cover', 'a0000000-0000-0000-0000-000000000001', now() + interval '1 day', null, null);

select has_function('public', 'current_practitioner_id', 'current_practitioner_id exists');
select has_function('public', 'can_access_client', array['uuid', 'text'], 'can_access_client exists');

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(current_practitioner_id(), 'a0000000-0000-0000-0000-000000000001', 'owner resolves to her practitioner id');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'cover'), true, 'owner has cover on her client');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'cover'), true, 'owner has cover on her other client');

select tests.login('a0000000-0000-0000-0000-000000000001', 'aal1');
select is(current_practitioner_id(), null, 'without MFA there is no practitioner');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'owner without MFA is denied');

select tests.login('a0000000-0000-0000-0000-000000000002');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'cover'), true, 'backup has cover on client 1');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'view'), false, 'backup has nothing on client 2');

select tests.login('a0000000-0000-0000-0000-000000000003');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'view'), true, 'practice member has view via the practice grant');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'cover'), false, 'practice member cannot write with a view grant');
select tests.admin();
update practice_member set left_at = now() where practitioner_id = 'a0000000-0000-0000-0000-000000000003';
select tests.login('a0000000-0000-0000-0000-000000000003');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'view'), false, 'leaving the practice removes access');

select tests.login('a0000000-0000-0000-0000-000000000004');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'revoked grant gives nothing');

select tests.login('a0000000-0000-0000-0000-000000000005');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'suspended practitioner is denied');

select tests.login('a0000000-0000-0000-0000-000000000006');
select is(can_access_client('c0000000-0000-0000-0000-000000000002', 'view'), true, 'operator has view within the support window');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'operator has nothing outside the grant, even as a practice member');

select tests.login('a0000000-0000-0000-0000-000000000007');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'expired grant gives nothing');

select tests.login('a0000000-0000-0000-0000-000000000008');
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'a grant that has not started gives nothing');

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(can_access_client(gen_random_uuid(), 'view'), false, 'an unknown client id is denied');

select * from finish();
rollback;
