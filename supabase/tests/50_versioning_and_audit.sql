begin;
select plan(9);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),  'Owner',  'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'), 'Backup', 'backup@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client');
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', null, 'cover', 'a0000000-0000-0000-0000-000000000001');

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

-- backup edits: the audit event names the grant relied on
select tests.login('a0000000-0000-0000-0000-000000000002');
update client set preferred_name = 'Second' where id = 'c0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select grant_id from audit_event where table_name = 'client' and action = 'update' order by occurred_at desc limit 1),
  'd0000000-0000-0000-0000-000000000001', 'backup change records the grant');

-- audit rows cannot be changed by anyone but the system
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ delete from audit_event $$, '42501', null, 'practitioners cannot delete audit events');

select * from finish();
rollback;
