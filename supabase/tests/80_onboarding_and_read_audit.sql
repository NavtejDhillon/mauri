begin;
select plan(15);

-- An invited person: auth user exists, invite row exists, no practitioner row yet.
select tests.create_user('newmidwife@example.test') as uid \gset
insert into invite (email, invited_by) values ('newmidwife@example.test', 'operator');

-- A midwife who was never invited.
select tests.create_user('uninvited@example.test') as uid2 \gset

select has_function('public', 'accept_invite', array['text', 'text', 'text', 'text'], 'accept_invite exists');
select has_function('public', 'record_client_read', array['uuid', 'text'], 'record_client_read exists');

-- accept_invite needs a signed-in user with a pending invite for her email
select tests.login_user(:'uid2');
select throws_ok($$ select accept_invite('No Invite', null, null, null) $$, '42501', null, 'no invite means no practitioner');

select tests.login_user(:'uid');
select lives_ok($$ select accept_invite('New Midwife', '021 000 000', '12345', null) $$, 'invited user creates her practitioner row');
-- invite is not readable by practitioners, so check the outcome as the superuser
select tests.admin();
select is((select full_name from practitioner where auth_user_id = :'uid'), 'New Midwife', 'practitioner row created with her name');
select is((select accepted_at is not null from invite where email = 'newmidwife@example.test'), true, 'invite marked accepted');
select tests.login_user(:'uid');
select throws_ok($$ select accept_invite('Again', null, null, null) $$, '23505', null, 'cannot accept twice');

-- record_client_read
select tests.admin();
insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000009', tests.create_user('other@example.test'), 'Other', 'other@example.test');
insert into client (id, owner_practitioner_id, first_name, last_name) values
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'Someone', 'Else');
select tests.login_user(:'uid');
insert into client (id, owner_practitioner_id, first_name, last_name)
  values ('c0000000-0000-0000-0000-000000000010', (select id from practitioner where auth_user_id = :'uid'), 'My', 'Client');
select lives_ok($$ select record_client_read('c0000000-0000-0000-0000-000000000010', 'req-1') $$, 'owner records a read of her client');
select throws_ok($$ select record_client_read('c0000000-0000-0000-0000-000000000009', 'req-2') $$, '42501', null, 'cannot record a read of a client she cannot access');
select tests.admin();
select is((select count(*) from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000010' and request_id = 'req-1'), 1::bigint, 'read event stored with the request id');
select is((select practitioner_id from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000010'),
  (select id from practitioner where auth_user_id = :'uid'), 'read event names the practitioner');
select is((select count(*) from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000009'), 0::bigint, 'denied read leaves no event');

-- grant_counterparty_names: only people on my grants
select tests.admin();
insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000008', tests.create_user('nobody@example.test'), 'Nobody Related', 'nobody@example.test');
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by)
  values ('a0000000-0000-0000-0000-000000000009', 'practitioner', (select id from practitioner where auth_user_id = :'uid'), null, 'view', 'a0000000-0000-0000-0000-000000000009');
select tests.login_user(:'uid');
select has_function('public', 'grant_counterparty_names', 'grant_counterparty_names exists');
select is((select count(*) from grant_counterparty_names() where full_name = 'Other'), 1::bigint, 'the grantor of a grant I received is named');
select is((select count(*) from grant_counterparty_names() where full_name = 'Nobody Related'), 0::bigint, 'an unrelated practitioner is not named');

select * from finish();
rollback;
