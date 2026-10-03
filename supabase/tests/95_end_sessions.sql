begin;
select plan(15);

select tests.create_user('lost-phone@example.test') as uid \gset
select tests.create_user('bystander@example.test') as uid2 \gset

-- Two sessions for her (one with a refresh token), one for someone else.
insert into auth.sessions (id, user_id, created_at, updated_at, aal) values
  ('5e550000-0000-0000-0000-000000000001', :'uid', now(), now(), 'aal2'),
  ('5e550000-0000-0000-0000-000000000002', :'uid', now(), now(), 'aal1'),
  ('5e550000-0000-0000-0000-000000000003', :'uid2', now(), now(), 'aal2');
insert into auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
values ('00000000-0000-0000-0000-000000000000', 'refresh-token-one', :'uid', false, now(), now(), '5e550000-0000-0000-0000-000000000001');

select has_function('ops', 'end_sessions', array['uuid', 'text'], 'ops.end_sessions exists');
select is(prosecdef, true, 'ops.end_sessions is security definer') from pg_proc where oid = 'ops.end_sessions(uuid, text)'::regprocedure;
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

-- Each call is an audit event naming the account, the operator login and the reason.
select is((select count(*) from audit_event where action = 'end_sessions' and row_id = :'uid'), 2::bigint, 'each call writes an audit event');
select is((select detail from audit_event where action = 'end_sessions' and row_id = :'uid' order by id limit 1),
  jsonb_build_object('reason', 'authenticator reset: lost phone', 'sessions_ended', 2, 'operator', session_user::text),
  'the audit event records the reason, the count and the operator login');

select * from finish();
rollback;
