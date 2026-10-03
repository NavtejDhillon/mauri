begin;
select plan(4);

-- The app inserts through PostgREST, which sends INSERT ... RETURNING. Postgres then applies the
-- select policy to the new row, so the owner must be able to see a row her own statement creates.
insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'), 'Owner', 'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'), 'Backup', 'backup@example.test');

select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok($$
  insert into client (id, owner_practitioner_id, first_name, last_name)
  values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'New', 'Client')
  returning id
$$, 'owner can insert a client and read it back in the same statement');
select is((select count(*) from client), 1::bigint, 'owner sees the new client');

-- A practitioner with no grant still cannot see it.
select tests.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*) from client), 0::bigint, 'an unrelated practitioner still sees nothing');

-- And without MFA the owner sees nothing either.
select tests.login('a0000000-0000-0000-0000-000000000001', 'aal1');
select is((select count(*) from client), 0::bigint, 'owner without MFA sees nothing');

select * from finish();
rollback;
