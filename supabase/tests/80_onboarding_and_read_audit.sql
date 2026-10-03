begin;
select plan(24);

-- An invited person: auth user exists, invite row exists, no practitioner row yet.
select tests.create_user('newmidwife@example.test') as uid \gset
insert into invite (email, invited_by) values ('newmidwife@example.test', 'operator');

-- A midwife who was never invited.
select tests.create_user('uninvited@example.test') as uid2 \gset

-- A midwife whose invite has expired.
select tests.create_user('late@example.test') as uid3 \gset
insert into invite (email, invited_by, created_at, expires_at)
  values ('late@example.test', 'operator', now() - interval '8 days', now() - interval '1 day');

-- A midwife whose invite was typed in a different case from her account's email.
select tests.create_user('mixed@example.test') as uid4 \gset
insert into invite (email, invited_by) values ('Mixed@Example.TEST', 'operator');

select has_function('public', 'accept_invite', array['text', 'text', 'text', 'text'], 'accept_invite exists');
select has_function('public', 'record_client_read', array['uuid', 'text'], 'record_client_read exists');

-- accept_invite needs a signed-in user with a pending, unexpired invite for her email
select tests.login_user(:'uid2');
select throws_ok($$ select accept_invite('No Invite', null, null, null) $$,
  '42501', 'no pending invite for this account', 'no invite means no practitioner');
select tests.login_user(:'uid3');
select throws_ok($$ select accept_invite('Late Midwife', null, null, null) $$,
  '42501', 'no pending invite for this account', 'an expired invite is refused');
select tests.login_user(:'uid4');
select lives_ok($$ select accept_invite('Mixed Case', null, null, null) $$, 'the invite email matches whatever its case');

select tests.login_user(:'uid');
select throws_ok($$ select accept_invite('  ', null, null, null) $$, '23514', null, 'a blank name is refused');
select lives_ok($$ select accept_invite('New Midwife', '021 000 000', '12345', null) $$, 'invited user creates her practitioner row');
-- invite is not readable by practitioners, so check the outcome as the superuser
select tests.admin();
select is((select full_name from practitioner where auth_user_id = :'uid'), 'New Midwife', 'practitioner row created with her name');
select is((select accepted_at is not null from invite where email = 'newmidwife@example.test'), true, 'invite marked accepted');
select is((select accepted_practitioner_id from invite where email = 'newmidwife@example.test'),
  (select id from practitioner where auth_user_id = :'uid'), 'invite names the practitioner who accepted it');
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
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select record_client_read('c0000000-0000-0000-0000-000000000010', 'req-0') $$, '42501', null, 'no read is recorded without MFA');
select tests.admin();
select is((select count(*) from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000010' and request_id = 'req-1'), 1::bigint, 'read event stored with the request id');
select is((select practitioner_id from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000010'),
  (select id from practitioner where auth_user_id = :'uid'), 'read event names the practitioner');
select is((select count(*) from audit_event where action = 'read' and client_id = 'c0000000-0000-0000-0000-000000000009'), 0::bigint, 'denied read leaves no event');

-- grant_counterparty_names: only people on my grants.
-- Other gives me a grant; Other also gives Nobody Related a grant I am not party to; I give Colleague a grant.
select tests.admin();
insert into practitioner (id, auth_user_id, full_name, email) values
  ('a0000000-0000-0000-0000-000000000008', tests.create_user('nobody@example.test'), 'Nobody Related', 'nobody@example.test'),
  ('a0000000-0000-0000-0000-000000000007', tests.create_user('colleague@example.test'), 'Colleague', 'colleague@example.test');
insert into access_grant (id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'practitioner',
   (select id from practitioner where auth_user_id = :'uid'), null, 'view', 'a0000000-0000-0000-0000-000000000009'),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000009', 'practitioner',
   'a0000000-0000-0000-0000-000000000008', null, 'view', 'a0000000-0000-0000-0000-000000000009');
select tests.login_user(:'uid');
insert into access_grant (grantor_practitioner_id, grantee_type, grantee_id, client_id, level, created_by) values
  ((select id from practitioner where auth_user_id = :'uid'), 'practitioner', 'a0000000-0000-0000-0000-000000000007',
   'c0000000-0000-0000-0000-000000000010', 'cover', (select id from practitioner where auth_user_id = :'uid'));
select has_function('public', 'grant_counterparty_names', 'grant_counterparty_names exists');
select is((select count(*) from grant_counterparty_names() where full_name = 'Other'), 1::bigint, 'the grantor of a grant I received is named');
select is((select count(*) from grant_counterparty_names() where full_name = 'Colleague'), 1::bigint, 'the grantee of a grant I gave is named');
select is((select count(*) from grant_counterparty_names() where full_name = 'Nobody Related'), 0::bigint,
  'a practitioner on a grant between two other people is not named');
select tests.login_user(:'uid', 'aal1');
select is((select count(*) from grant_counterparty_names()), 0::bigint, 'no names without MFA');

-- A read through a grant names the grant relied on.
select tests.login_user(:'uid');
select lives_ok($$ select record_client_read('c0000000-0000-0000-0000-000000000009', 'req-3') $$,
  'a grantee records a read of a client she reaches through a grant');
select tests.admin();
select is((select grant_id from audit_event where action = 'read' and request_id = 'req-3'),
  'd0000000-0000-0000-0000-000000000009'::uuid, 'the read event names the grant relied on');

select * from finish();
rollback;
