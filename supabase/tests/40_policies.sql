begin;
select plan(22);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'),  'Owner',  'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'), 'Backup', 'backup@example.test'),
  ('a0000000-0000-0000-0000-000000000003', tests.create_user('viewer@example.test'), 'Viewer', 'viewer@example.test'),
  ('a0000000-0000-0000-0000-000000000004', tests.create_user('other@example.test'),  'Other',  'other@example.test');
insert into practice (id, name) values ('b0000000-0000-0000-0000-000000000001', 'Practice');
insert into practice_member (practice_id, practitioner_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Two', 'Client');
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000002', null, 'cover', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'practitioner', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'view', 'a0000000-0000-0000-0000-000000000001');

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
select is((select count(*) from access_grant), 2::bigint, 'owner sees the grants she gave');
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
select is((select count(*) from access_grant), 1::bigint, 'backup sees the grant she received');

-- viewer whose grant was revoked
select tests.login('a0000000-0000-0000-0000-000000000003');
select is((select count(*) from client), 0::bigint, 'revoked viewer sees nothing');

-- other practitioner with no relationship
select tests.login('a0000000-0000-0000-0000-000000000004');
select is((select count(*) from client where id = 'c0000000-0000-0000-0000-000000000001'), 0::bigint, 'unrelated practitioner sees nothing of the owner');
with u as (update client set preferred_name = 'Hacked' where id = 'c0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'unrelated update touches no rows');
select throws_ok($$ update practitioner set is_operator = true where id = 'a0000000-0000-0000-0000-000000000004' $$,
  '42501', null, 'a practitioner cannot make herself operator');

select * from finish();
rollback;
