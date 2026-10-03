begin;
select plan(30);

insert into practitioner (id, auth_user_id, full_name, email, is_operator) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),     'Owner',     'owner@example.test',     false),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'),    'Backup',    'backup@example.test',    false),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('viewer@example.test'),    'Viewer',    'viewer@example.test',    false),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('other@example.test'),     'Other',     'other@example.test',     false),
  ('a0000000-0000-0000-0000-000000000005', tests.create_user('peek@example.test'),      'Peek',      'peek@example.test',      false),
  ('a0000000-0000-0000-0000-000000000006', tests.create_user('operator@example.test'),  'Operator',  'operator@example.test',  true),
  ('a0000000-0000-0000-0000-000000000007', tests.create_user('colleague@example.test'), 'Colleague', 'colleague@example.test', false);
insert into practice (id, name) values ('b0000000-0000-0000-0000-000000000001', 'Practice');
insert into practice_member (practice_id, practitioner_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Two', 'Client');
-- backup: cover on the caseload; viewer and peek: view on client 1 (viewer's is revoked below); operator: view on client 1 for 2 days.
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by, ends_at) values
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', null, 'cover', 'a0000000-0000-0000-0000-000000000001', null),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'view', 'a0000000-0000-0000-0000-000000000001', null),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'view', 'a0000000-0000-0000-0000-000000000001', null),
  ('a0000000-0000-0000-0000-000000000001', 'operator',     null,                                   'c0000000-0000-0000-0000-000000000001', 'view', 'a0000000-0000-0000-0000-000000000001', now() + interval '2 days');

-- every table has RLS on
select is((select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'), true, 'RLS is on for every public table');

-- anon sees nothing and cannot write
select tests.anon();
select throws_ok($$ select count(*) from client $$, '42501', null, 'anon cannot read clients');
select throws_ok($$ insert into client (owner_practitioner_id, first_name, last_name)
  values ('a0000000-0000-0000-0000-000000000001', 'X', 'Y') $$, '42501', null, 'anon cannot insert clients');

-- owner
select tests.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*) from client), 1::bigint, 'owner sees only her client');
select is((select full_name from practitioner where id = 'a0000000-0000-0000-0000-000000000001'), 'Owner', 'owner sees her own practitioner row');
select is((select count(*) from practitioner), 1::bigint, 'owner sees no other practitioner rows');
select lives_ok($$ insert into client (owner_practitioner_id, first_name, last_name)
  values ('a0000000-0000-0000-0000-000000000001', 'New', 'Client') $$, 'owner can create a client she owns');
select throws_ok($$ insert into client (owner_practitioner_id, first_name, last_name)
  values ('a0000000-0000-0000-0000-000000000004', 'New', 'Client') $$, '42501', null, 'owner cannot create a client owned by someone else');
select lives_ok($$ update client set preferred_name = 'Uno' where id = 'c0000000-0000-0000-0000-000000000001' $$, 'owner can update her client');
select throws_ok($$ delete from client where id = 'c0000000-0000-0000-0000-000000000001' $$, '42501', null, 'owner cannot hard delete');
select is((select count(*) from access_grant), 4::bigint, 'owner sees the grants she gave');
select lives_ok($$ insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'cover', 'a0000000-0000-0000-0000-000000000001') $$,
  'owner can grant a colleague cover');
select throws_ok($$ insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'cover', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'owner cannot grant the operator access as if she were a colleague');
select throws_ok($$ insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, kind, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'view', 'historical', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'only a transfer can create a historical grant');
select throws_ok($$ insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000004', 'practitioner', 'a0000000-0000-0000-0000-000000000001', null, 'cover', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'owner cannot create a grant on behalf of another practitioner');
select throws_ok($$ insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'cover', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'owner cannot grant access to a client she does not own');
select lives_ok($$ update access_grant set revoked_at = now(), revoked_by = 'a0000000-0000-0000-0000-000000000001'
  where grantee_id = 'a0000000-0000-0000-0000-000000000003' $$, 'owner can revoke her grant');
select is((select count(*) from practice_member), 2::bigint, 'owner sees members of her practice');

-- backup with cover
select tests.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*) from client), 2::bigint, 'backup sees the whole caseload (2 clients, one created above)');
select lives_ok($$ update client set preferred_name = 'Covered' where id = 'c0000000-0000-0000-0000-000000000001' $$, 'backup with cover can update');
select throws_ok($$ update client set deleted_at = now() where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', 'only the owner can delete or restore a client', 'backup with cover cannot soft delete');
select is((select count(*) from access_grant), 1::bigint, 'backup sees the grant she received');

-- viewer whose grant was revoked
select tests.login('a0000000-0000-0000-0000-000000000003');
select is((select count(*) from client), 0::bigint, 'revoked viewer sees nothing');

-- view grantee can read but not write
select tests.login('a0000000-0000-0000-0000-000000000005');
select is((select count(*) from client), 1::bigint, 'view grantee sees the client');
with u as (update client set preferred_name = 'Peeked' where id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'view grantee update touches no rows');

-- operator with a support grant can read but not write, and never owns clients
select tests.login('a0000000-0000-0000-0000-000000000006');
with u as (update client set preferred_name = 'Operated' where id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'operator update touches no rows');
select throws_ok($$ insert into client (owner_practitioner_id, first_name, last_name)
  values ('a0000000-0000-0000-0000-000000000006', 'Op', 'Owned') $$, '42501', null, 'operator cannot create a client');

-- other practitioner with no relationship
select tests.login('a0000000-0000-0000-0000-000000000004');
select is((select count(*) from client where id = 'c0000000-0000-0000-0000-000000000001'), 0::bigint, 'unrelated practitioner sees nothing of the owner');
with u as (update client set preferred_name = 'Hacked' where id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'unrelated update touches no rows');
select throws_ok($$ update practitioner set is_operator = true where id = 'a0000000-0000-0000-0000-000000000004' $$,
  '42501', null, 'a practitioner cannot make herself operator');

select * from finish();
rollback;
