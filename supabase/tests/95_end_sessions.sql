begin;
select plan(22);

select tests.create_user('lost-phone@example.test') as uid \gset
select tests.create_user('bystander@example.test') as uid2 \gset

-- Two sessions for her (one with a refresh token), one for someone else.
insert into auth.sessions (id, user_id, created_at, updated_at, aal) values
  ('5e550000-0000-0000-0000-000000000001', :'uid', now(), now(), 'aal2'),
  ('5e550000-0000-0000-0000-000000000002', :'uid', now(), now(), 'aal1'),
  ('5e550000-0000-0000-0000-000000000003', :'uid2', now(), now(), 'aal2');
insert into auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
values ('00000000-0000-0000-0000-000000000000', 'refresh-token-one', :'uid', false, now(), now(), '5e550000-0000-0000-0000-000000000001');
-- Two known devices for her (one of them the lost phone), one for someone else.
insert into known_device (auth_user_id, token_hash) values
  (:'uid', encode(sha256(convert_to(repeat('p', 64), 'UTF8')), 'hex')),
  (:'uid', encode(sha256(convert_to(repeat('q', 64), 'UTF8')), 'hex')),
  (:'uid2', encode(sha256(convert_to(repeat('r', 64), 'UTF8')), 'hex'));

select has_function('ops', 'end_sessions', array['uuid', 'text'], 'ops.end_sessions exists');
select is(prosecdef, true, 'ops.end_sessions is security definer') from pg_proc where oid = 'ops.end_sessions(uuid, text)'::regprocedure;
select is(proconfig, array['search_path=""'], 'ops.end_sessions runs with an empty search path') from pg_proc where oid = 'ops.end_sessions(uuid, text)'::regprocedure;
select is(proowner, (select nspowner from pg_namespace where nspname = 'ops'), 'ops.end_sessions is owned by the migration role that owns the ops schema')
from pg_proc where oid = 'ops.end_sessions(uuid, text)'::regprocedure;
select is(has_schema_privilege('anon', 'ops', 'usage'), false, 'anon has no use of the ops schema');
select is(has_schema_privilege('authenticated', 'ops', 'usage'), false, 'authenticated has no use of the ops schema');

-- Only the operator role can end sessions.
select tests.anon();
select throws_ok(format('select ops.end_sessions(%L, %L)', :'uid', 'test'), '42501', null, 'anon cannot end sessions');
select tests.login_user(:'uid', 'aal2');
select throws_ok(format('select ops.end_sessions(%L, %L)', :'uid', 'test'), '42501', null, 'authenticated cannot end sessions, not even her own');

-- The operator role (mauri_ops is a member of platform_admin) ends every session for her.
select tests.admin();
set local role platform_admin;
select throws_ok($$ select ops.end_sessions(null, 'lost phone') $$, '22023', null, 'a missing account is refused');
select throws_ok(format('select ops.end_sessions(%L, %L)', :'uid', '  '), '22023', null, 'a blank reason is refused');
select is(ops.end_sessions(:'uid', 'authenticator reset: lost phone'), 2, 'the operator role ends her two sessions');
select is(ops.end_sessions(:'uid', 'authenticator reset: lost phone'), 0, 'a second call finds nothing to end');
reset role;

select is((select count(*) from auth.sessions where user_id = :'uid'), 0::bigint, 'none of her sessions remain');
select is((select count(*) from auth.refresh_tokens where session_id = '5e550000-0000-0000-0000-000000000001'), 0::bigint,
  'her refresh tokens went with her sessions');
select is((select count(*) from auth.sessions where user_id = :'uid2'), 1::bigint, 'another account keeps its session');

-- Her known devices go too, so the lost phone's device cookie no longer earns its own attempt
-- bucket; another account keeps its device.
select is((select count(*) from known_device where auth_user_id = :'uid'), 0::bigint, 'none of her known devices remain');
select is((select count(*) from known_device where auth_user_id = :'uid2'), 1::bigint, 'another account keeps its known device');
select tests.anon();
select is(auth_attempt_begin('password', 'lost-phone@example.test', '192.0.2.1', repeat('p', 64)), true, 'the lost phone''s token is now an unknown device');
select tests.admin();
select is((select device_hash from auth_attempt where key_hash = auth_attempt_key('password', 'lost-phone@example.test') order by id desc limit 1),
  null, 'its attempt was counted in the unknown-device buckets');

-- Each call is an audit event naming the account, the operator login, the reason and both counts.
select is((select count(*) from audit_event where action = 'end_sessions' and row_id = :'uid'), 2::bigint, 'each call writes an audit event');
select is((select detail from audit_event where action = 'end_sessions' and row_id = :'uid' order by id limit 1),
  jsonb_build_object('reason', 'authenticator reset: lost phone', 'sessions_ended', 2, 'known_devices_removed', 2, 'operator', session_user::text),
  'the audit event records the reason, both counts and the operator login');
select is((select detail from audit_event where action = 'end_sessions' and row_id = :'uid' order by id desc limit 1),
  jsonb_build_object('reason', 'authenticator reset: lost phone', 'sessions_ended', 0, 'known_devices_removed', 0, 'operator', session_user::text),
  'a second call records that nothing was left');

select * from finish();
rollback;
