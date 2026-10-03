begin;
select plan(12);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'), 'Owner', 'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'), 'Backup', 'backup@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Test', 'Client');

select has_table('public', 'client', 'client table');
select has_table('public', 'access_grant', 'access_grant table');
select has_table('public', 'client_transfer', 'client_transfer table');

select lives_ok($$
  insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', null, 'cover', 'a0000000-0000-0000-0000-000000000001')
$$, 'whole-caseload cover grant to a practitioner');

select throws_ok($$
  insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'operator', null, null, 'cover', 'a0000000-0000-0000-0000-000000000001')
$$, '23514', null, 'operator grants cannot be cover');

select throws_ok($$
  insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, ends_at, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'operator', null, null, 'view', now() + interval '30 days', 'a0000000-0000-0000-0000-000000000001')
$$, '23514', null, 'operator grants cannot exceed 7 days');

select lives_ok($$
  insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, ends_at, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'operator', null, 'c0000000-0000-0000-0000-000000000001', 'view', now() + interval '2 days', 'a0000000-0000-0000-0000-000000000001')
$$, 'a 2 day view grant to the operator is allowed');

select throws_ok($$
  insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000001', 'practitioner', null, null, 'view', 'a0000000-0000-0000-0000-000000000001')
$$, '23514', null, 'practitioner grants need a grantee id');

-- A grant's window can only close earlier, never later, and a revocation is final.
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, ends_at, created_by)
values ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002',
        null, 'view', now() + interval '10 days', 'a0000000-0000-0000-0000-000000000001');
select throws_ok($$
  update access_grant set ends_at = now() + interval '20 days' where id = 'd0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'extending ends_at is refused');
select throws_ok($$
  update access_grant set ends_at = null where id = 'd0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'removing ends_at is refused');
select lives_ok($$
  update access_grant set ends_at = now() + interval '1 day' where id = 'd0000000-0000-0000-0000-000000000001'
$$, 'shortening ends_at is allowed');
update access_grant set revoked_at = now() where id = 'd0000000-0000-0000-0000-000000000001';
select throws_ok($$
  update access_grant set revoked_at = null where id = 'd0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'a revoked grant cannot be reinstated');

select * from finish();
rollback;
