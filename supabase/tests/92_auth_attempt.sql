begin;
select plan(31);

select tests.create_user('midwife@example.test') as uid \gset
select tests.create_user('other@example.test') as uid2 \gset

select has_table('public', 'auth_attempt', 'auth_attempt table');
select has_function('public', 'auth_attempt_allowed', array['text', 'text', 'text'], 'auth_attempt_allowed exists');
select has_function('public', 'auth_attempt_record', array['text', 'text', 'text', 'boolean'], 'auth_attempt_record exists');

-- Nobody reads or writes the table directly; only the two functions touch it.
select tests.anon();
select throws_ok($$ select count(*) from auth_attempt $$, '42501', null, 'anon cannot read auth_attempt');
select throws_ok($$ insert into auth_attempt (kind, key_hash, ip, succeeded) values ('password', 'x', 'x', true) $$,
  '42501', null, 'anon cannot write auth_attempt');
select tests.login_user(:'uid');
select throws_ok($$ select count(*) from auth_attempt $$, '42501', null, 'authenticated cannot read auth_attempt');

-- Password: five failures from one address block that address, not another, and not another email.
select tests.anon();
select is(auth_attempt_allowed('password', 'midwife@example.test', '203.0.113.1'), true, 'a fresh email is allowed');
select auth_attempt_record('password', 'midwife@example.test', '203.0.113.1', false) from generate_series(1, 4);
select is(auth_attempt_allowed('password', 'midwife@example.test', '203.0.113.1'), true, 'four failures are still allowed');
select auth_attempt_record('password', '  Midwife@Example.TEST ', '203.0.113.1', false);
select is(auth_attempt_allowed('password', 'midwife@example.test', '203.0.113.1'), false, 'five failures from one address block that address');
select is(auth_attempt_allowed('password', 'midwife@example.test', '203.0.113.2'), true, 'another address is not blocked');
select is(auth_attempt_allowed('password', 'other@example.test', '203.0.113.1'), true, 'another email from the same address is not blocked');

-- The key is a hash of the trimmed, lower-cased email; the email itself is never stored.
select tests.admin();
select is((select count(*) from auth_attempt
           where kind = 'password' and key_hash = encode(sha256(convert_to('midwife@example.test', 'UTF8')), 'hex')),
  5::bigint, 'password attempts are keyed by the sha256 of the normalised email');
select is((select count(*) from auth_attempt where key_hash like '%@%'), 0::bigint, 'no email is stored');

-- Twenty failures from any mix of addresses block every address.
select tests.anon();
select auth_attempt_record('password', 'other@example.test', '198.51.100.' || g, false) from generate_series(1, 19) g;
select is(auth_attempt_allowed('password', 'other@example.test', '192.0.2.1'), true, 'nineteen failures from many addresses are still allowed');
select auth_attempt_record('password', 'other@example.test', '198.51.100.20', false);
select is(auth_attempt_allowed('password', 'other@example.test', '192.0.2.1'), false, 'twenty failures from many addresses block an unseen address');

-- A success resets the count, and only the account that signed in can record one.
select throws_ok($$ select auth_attempt_record('password', 'other@example.test', '192.0.2.1', true) $$,
  '42501', null, 'anon cannot record a password success');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select auth_attempt_record('password', 'other@example.test', '192.0.2.1', true) $$,
  '42501', null, 'one account cannot record a success for another email');
select tests.login_user(:'uid2', 'aal1');
select lives_ok($$ select auth_attempt_record('password', 'Other@Example.test', '192.0.2.1', true) $$,
  'the account that signed in records its success');
select tests.anon();
select is(auth_attempt_allowed('password', 'other@example.test', '192.0.2.1'), true, 'a success resets the count');

-- MFA: the key is the caller's auth user id, whatever email is passed.
select tests.login_user(:'uid', 'aal1');
select auth_attempt_record('mfa', 'other@example.test', '203.0.113.1', false) from generate_series(1, 5);
select is(auth_attempt_allowed('mfa', null, '203.0.113.1'), false, 'five failed codes block her');
select tests.login_user(:'uid2', 'aal1');
select is(auth_attempt_allowed('mfa', 'midwife@example.test', '203.0.113.1'), true, 'her failures do not block another user');
select tests.admin();
select is((select count(*) from auth_attempt
           where kind = 'mfa' and key_hash = encode(sha256(convert_to(:'uid', 'UTF8')), 'hex')),
  5::bigint, 'mfa attempts are keyed by the sha256 of the caller''s auth user id');
select tests.anon();
select throws_ok($$ select auth_attempt_allowed('mfa', null, '203.0.113.1') $$, '42501', null, 'an mfa check without a session is refused');
select throws_ok($$ select auth_attempt_record('mfa', null, '203.0.113.1', false) $$, '42501', null, 'an mfa record without a session is refused');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select auth_attempt_record('mfa', null, '203.0.113.1', true) $$,
  '42501', null, 'a code success cannot be recorded without MFA');
select tests.login_user(:'uid', 'aal2');
select lives_ok($$ select auth_attempt_record('mfa', null, '203.0.113.1', true) $$, 'a session with MFA records the code success');
select is(auth_attempt_allowed('mfa', null, '203.0.113.1'), true, 'a verified code resets her count');

-- Old attempts: older than 15 minutes do not count, older than 7 days are deleted.
select tests.admin();
insert into auth_attempt (kind, key_hash, ip, succeeded, at)
select 'password', encode(sha256(convert_to('stale@example.test', 'UTF8')), 'hex'), '203.0.113.9', false, now() - interval '20 minutes'
from generate_series(1, 5);
insert into auth_attempt (kind, key_hash, ip, succeeded, at) values ('password', 'ancient', '203.0.113.9', false, now() - interval '8 days');
select tests.anon();
select is(auth_attempt_allowed('password', 'stale@example.test', '203.0.113.9'), true, 'failures older than 15 minutes do not count');
select auth_attempt_record('password', 'stale@example.test', '203.0.113.9', false);
select tests.admin();
select is((select count(*) from auth_attempt where key_hash = 'ancient'), 0::bigint, 'attempts older than 7 days are deleted');

-- Bad input is refused rather than guessed at.
select tests.anon();
select throws_ok($$ select auth_attempt_allowed('sms', 'a@example.test', '203.0.113.1') $$, '22023', null, 'an unknown kind is refused');
select throws_ok($$ select auth_attempt_allowed('password', '  ', '203.0.113.1') $$, '22023', null, 'a blank email is refused');

select * from finish();
rollback;
