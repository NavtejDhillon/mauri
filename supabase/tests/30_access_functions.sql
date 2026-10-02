begin;
select plan(16);

-- Fixtures: owner, backup, practice member, stranger, suspended, operator.
insert into practitioner (id, auth_user_id, full_name, email, status, is_operator) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),    'Owner',    'owner@example.test',    'active', false),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'),   'Backup',   'backup@example.test',   'active', false),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('member@example.test'),   'Member',   'member@example.test',   'active', false),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('stranger@example.test'), 'Stranger', 'stranger@example.test', 'active', false),
  ('a0000000-0000-0000-0000-000000000005', tests.create_user('suspended@example.test'),'Suspended','suspended@example.test','suspended', false),
  ('a0000000-0000-0000-0000-000000000006', tests.create_user('operator@example.test'), 'Operator', 'operator@example.test', 'active', true);
insert into practice (id, name) values ('b0000000-0000-0000-0000-000000000001', 'Practice');
insert into practice_member (practice_id, practitioner_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Two', 'Client');

-- Grants: backup has cover on client 1 only; practice has view on the whole caseload;
-- operator has view on client 2 for 2 days; stranger had a grant that was revoked.
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by, ends_at, revoked_at) values
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'cover', 'a0000000-0000-0000-0000-000000000001', null, null),
  ('a0000000-0000-0000-0000-000000000001', 'practice',     'b0000000-0000-0000-0000-000000000001', null,                                    'view',  'a0000000-0000-0000-0000-000000000001', null, null),
  ('a0000000-0000-0000-0000-000000000001', 'operator',     null,                                   'c0000000-0000-0000-0000-000000000002', 'view',  'a0000000-0000-0000-0000-000000000001', now() + interval '2 days', null),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000004', null,                                    'cover', 'a0000000-0000-0000-0000-000000000001', null, now() - interval '1 hour');

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
select is(can_access_client('c0000000-0000-0000-0000-000000000001', 'view'), false, 'operator has nothing outside the grant');

select * from finish();
rollback;
