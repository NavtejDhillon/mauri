begin;
select plan(8);

insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('owner@example.test'), 'Owner', 'owner@example.test'),
  ('a0000000-0000-0000-0000-000000000002', tests.create_user('backup@example.test'), 'Backup', 'backup@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'One', 'Client');

-- The app sends its request id as the x-mauri-request-id header; PostgREST exposes headers as request.headers.
select tests.login('a0000000-0000-0000-0000-000000000001');
select set_config('request.headers', '{"x-mauri-request-id":"req-x"}', true);
insert into client (id, owner_practitioner_id, first_name, last_name)
  values ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Two', 'Client');
update client set preferred_name = 'Uno' where id = 'c0000000-0000-0000-0000-000000000001';
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'practitioner',
   'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'cover', 'a0000000-0000-0000-0000-000000000001');
update access_grant set revoked_at = now() where id = 'd0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select request_id from audit_event where action = 'insert' and row_id = 'c0000000-0000-0000-0000-000000000002'),
  'req-x', 'an insert event carries the request id header');
select is((select request_id from audit_event where action = 'update' and row_id = 'c0000000-0000-0000-0000-000000000001'),
  'req-x', 'an update event carries the request id header');
select is((select request_id from audit_event where action = 'grant' and grant_id = 'd0000000-0000-0000-0000-000000000001'),
  'req-x', 'a grant event carries the request id header');
select is((select request_id from audit_event where action = 'revoke' and grant_id = 'd0000000-0000-0000-0000-000000000001'),
  'req-x', 'a revoke event carries the request id header');

-- A request id set in the session takes precedence over the header.
select tests.login('a0000000-0000-0000-0000-000000000001');
select set_config('mauri.request_id', 'req-local', true);
update client set preferred_name = 'Local' where id = 'c0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select request_id from audit_event where action = 'update' order by id desc limit 1),
  'req-local', 'mauri.request_id takes precedence over the header');

-- With neither, the write still succeeds and the request id is empty.
select tests.login('a0000000-0000-0000-0000-000000000001');
select set_config('mauri.request_id', '', true);
select set_config('request.headers', '', true);
select lives_ok($$ update client set preferred_name = 'Bare' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'a write without any request id succeeds');
select tests.admin();
select is((select request_id from audit_event where action = 'update' order by id desc limit 1),
  null, 'a write without any request id stores none');

-- The header comes from outside the database, so its length is capped.
select tests.login('a0000000-0000-0000-0000-000000000001');
select set_config('request.headers', json_build_object('x-mauri-request-id', repeat('x', 500))::text, true);
update client set preferred_name = 'Long' where id = 'c0000000-0000-0000-0000-000000000001';
select tests.admin();
select is((select length(request_id) from audit_event where action = 'update' order by id desc limit 1),
  64, 'a long request id is cut to 64 characters');

select * from finish();
rollback;
