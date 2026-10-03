begin;
select plan(19);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),    'Owner',    'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'),   'Backup',   'backup@example.test'),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('stranger@example.test'), 'Stranger', 'stranger@example.test');
insert into practice (id, name) values ('b0000000-0000-0000-0000-000000000001', 'Practice');
insert into practice_member (practice_id, practitioner_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client');
-- Backup holds two routes to the caseload: a view grant through her practice and a cover grant of her own.
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', null, 'cover', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'practice',     'b0000000-0000-0000-0000-000000000001', null, 'view',  'a0000000-0000-0000-0000-000000000001');

select has_table('public', 'record_version', 'record_version table');
select has_table('public', 'audit_event', 'audit_event table');

-- owner edits: a version is stored, an audit event is written, no grant involved
select tests.login('a0000000-0000-0000-0000-000000000001');
update client set preferred_name = 'First' where id = 'c0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select count(*) from record_version where table_name = 'client' and row_id = 'c0000000-0000-0000-0000-000000000001'), 1::bigint, 'one version after one update');
select is((select (previous_row ->> 'preferred_name') is null from record_version where table_name = 'client' limit 1), true, 'the stored version is the row before the change');
select is((select changed_by from record_version where table_name = 'client' limit 1), 'a0000000-0000-0000-0000-000000000001', 'version records who changed it');
select is((select count(*) from audit_event where table_name = 'client' and action = 'update'), 1::bigint, 'an audit event for the update');
select is((select grant_id from audit_event where table_name = 'client' and action = 'update' limit 1), null, 'owner change has no grant');

-- owner creates a client: an insert event names her and no grant
select tests.login('a0000000-0000-0000-0000-000000000001');
insert into client (id, owner_practitioner_id, first_name, last_name)
  values ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Two', 'Client');
select tests.admin();
select is((select count(*) from audit_event where table_name = 'client' and action = 'insert'
           and row_id = 'c0000000-0000-0000-0000-000000000002' and practitioner_id = 'a0000000-0000-0000-0000-000000000001' and grant_id is null),
  1::bigint, 'client creation writes an insert event');

-- backup edits: the audit event names the cover grant, not the view grant she also holds
select tests.login('a0000000-0000-0000-0000-000000000002');
update client set preferred_name = 'Second' where id = 'c0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select grant_id from audit_event where table_name = 'client' and action = 'update' order by occurred_at desc limit 1),
  'd0000000-0000-0000-0000-000000000001', 'a write records the cover grant relied on');

-- grants and revocations are audit events naming the practitioner who acted
select tests.login('a0000000-0000-0000-0000-000000000001');
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'view', 'a0000000-0000-0000-0000-000000000001');
-- the caller-supplied revoked_by is ignored
update access_grant set revoked_at = now(), revoked_by = 'a0000000-0000-0000-0000-000000000003' where id = 'd0000000-0000-0000-0000-000000000003';
select tests.admin();
select is((select practitioner_id from audit_event where action = 'grant' and grant_id = 'd0000000-0000-0000-0000-000000000003'),
  'a0000000-0000-0000-0000-000000000001', 'grant creation writes a grant event naming the grantor');
select is((select practitioner_id from audit_event where action = 'revoke' and grant_id = 'd0000000-0000-0000-0000-000000000003'),
  'a0000000-0000-0000-0000-000000000001', 'revocation writes a revoke event naming the revoker');
select is((select revoked_by from access_grant where id = 'd0000000-0000-0000-0000-000000000003'),
  'a0000000-0000-0000-0000-000000000001', 'revoked_by is the practitioner who revoked, whatever the caller sent');

-- audit rows and versions cannot be read or changed by practitioners directly
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ delete from audit_event $$, '42501', null, 'practitioners cannot delete audit events');
select throws_ok($$ select count(*) from audit_event $$, '42501', null, 'practitioners cannot read audit events directly');
select throws_ok($$ select count(*) from record_version $$, '42501', null, 'practitioners cannot read record versions');

-- the filtered audit trail: owner sees her client's events, a stranger sees none, and the
-- projection omits auth_user_id and request_id
select is((select count(*) > 0 from audit_events_for_client('c0000000-0000-0000-0000-000000000001')), true, 'owner sees events for her client');
select is((select count(*) from audit_events_for_client('c0000000-0000-0000-0000-000000000001') where action = 'update' and practitioner_id = 'a0000000-0000-0000-0000-000000000002' and grant_id = 'd0000000-0000-0000-0000-000000000001'),
  1::bigint, 'owner sees the backup edit and the grant it relied on');
select is((select count(*) from pg_proc where proname = 'audit_events_for_client'
           and (pg_get_function_result(oid) like '%auth_user_id%' or pg_get_function_result(oid) like '%request_id%')),
  0::bigint, 'the filtered audit trail omits auth_user_id and request_id');
select tests.login('a0000000-0000-0000-0000-000000000003');
select is((select count(*) from audit_events_for_client('c0000000-0000-0000-0000-000000000001')), 0::bigint, 'a stranger gets no events');

select * from finish();
rollback;
