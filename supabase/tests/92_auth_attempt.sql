begin;
select plan(39);

select tests.create_user('midwife@example.test') as uid \gset
select tests.create_user('other@example.test') as uid2 \gset

select has_table('public', 'auth_attempt', 'auth_attempt table');
select has_function('public', 'auth_attempt_begin', array['text', 'text', 'text', 'text'], 'auth_attempt_begin exists');
select has_function('public', 'auth_attempt_succeeded', array['text', 'text', 'text'], 'auth_attempt_succeeded exists');
select hasnt_function('public', 'auth_attempt_allowed', array['text', 'text', 'text'], 'the check-then-record auth_attempt_allowed is gone');
select hasnt_function('public', 'auth_attempt_record', array['text', 'text', 'text', 'boolean'], 'the check-then-record auth_attempt_record is gone');
select is(provolatile, 'v', 'auth_attempt_begin is volatile, so each count sees rows committed before the lock')
from pg_proc where proname = 'auth_attempt_begin';

-- Nobody reads or writes the table directly; only the functions touch it.
select tests.anon();
select throws_ok($$ select count(*) from auth_attempt $$, '42501', null, 'anon cannot read auth_attempt');
select throws_ok($$ insert into auth_attempt (kind, key_hash, ip, succeeded) values ('password', 'x', 'x', true) $$,
  '42501', null, 'anon cannot write auth_attempt');
select tests.login_user(:'uid');
select throws_ok($$ select count(*) from auth_attempt $$, '42501', null, 'authenticated cannot read auth_attempt');

-- Password: each begin counts as a failure until a success says otherwise. Five begins from one
-- address are allowed and the sixth is refused, for that address only and that email only.
select tests.anon();
select is(array_agg(auth_attempt_begin('password', 'midwife@example.test', '203.0.113.1', null)),
  array[true, true, true, true]::boolean[], 'four begins from one address are allowed')
from generate_series(1, 4);
select is(auth_attempt_begin('password', '  Midwife@Example.TEST ', '203.0.113.1', null), true, 'the fifth begin is allowed');
select is(auth_attempt_begin('password', 'midwife@example.test', '203.0.113.1', null), false, 'the sixth begin from that address is refused');
select is(auth_attempt_begin('password', 'midwife@example.test', '203.0.113.2', null), true, 'another address is not refused');
select is(auth_attempt_begin('password', 'other@example.test', '203.0.113.1', null), true, 'another email from the same address is not refused');

-- The key is a hash of the trimmed, lower-cased email; the email itself is never stored.
-- A refused begin records nothing, so the rows for a key stay bounded.
select tests.admin();
select is((select count(*) from auth_attempt
           where kind = 'password' and key_hash = encode(sha256(convert_to('midwife@example.test', 'UTF8')), 'hex')),
  6::bigint, 'five begins from one address and one from another were recorded; the refused one was not');
select is((select count(*) from auth_attempt where key_hash like '%@%'), 0::bigint, 'no email is stored');
select is((select count(*) from auth_attempt where succeeded), 0::bigint, 'a begin is recorded as a failure');

-- Twenty from any mix of addresses refuse every address, and further refusals record nothing.
select tests.anon();
select is(bool_and(auth_attempt_begin('password', 'other@example.test', '198.51.100.' || g, null)), true,
  'nineteen more begins from many addresses are allowed')
from generate_series(1, 19) g;
select is(auth_attempt_begin('password', 'other@example.test', '192.0.2.1', null), false, 'the twenty-first begin from an unseen address is refused');
select is(bool_or(auth_attempt_begin('password', 'other@example.test', '192.0.2.' || g, null)), false,
  'fifty more begins from fresh addresses are all refused')
from generate_series(10, 59) g;
select tests.admin();
select is((select count(*) from auth_attempt
           where key_hash = encode(sha256(convert_to('other@example.test', 'UTF8')), 'hex')),
  20::bigint, 'a key over its cap gains no more rows');

-- A success resets the count, and only the account that signed in can record one.
select tests.anon();
select throws_ok($$ select auth_attempt_succeeded('password', 'other@example.test', '192.0.2.1') $$,
  '42501', null, 'anon cannot record a success');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select auth_attempt_succeeded('password', 'other@example.test', '192.0.2.1') $$,
  '42501', null, 'one account cannot record a success for another email');
select tests.login_user(:'uid2', 'aal1');
select lives_ok($$ select auth_attempt_succeeded('password', 'Other@Example.test', '192.0.2.1') $$,
  'the account that signed in records its success');
select tests.anon();
select is(auth_attempt_begin('password', 'other@example.test', '192.0.2.1', null), true, 'a success resets the count');

-- MFA: the key is the caller's auth user id, whatever email is passed.
select tests.login_user(:'uid', 'aal1');
select is(bool_and(auth_attempt_begin('mfa', 'other@example.test', '203.0.113.1', null)), true, 'five code begins are allowed')
from generate_series(1, 5);
select is(auth_attempt_begin('mfa', null, '203.0.113.1', null), false, 'the sixth code begin is refused');
select tests.login_user(:'uid2', 'aal1');
select is(auth_attempt_begin('mfa', 'midwife@example.test', '203.0.113.1', null), true, 'her failures do not refuse another user');
select tests.admin();
select is((select count(*) from auth_attempt
           where kind = 'mfa' and key_hash = encode(sha256(convert_to(:'uid', 'UTF8')), 'hex')),
  5::bigint, 'code attempts are keyed by the sha256 of the caller''s auth user id');
select tests.anon();
select throws_ok($$ select auth_attempt_begin('mfa', null, '203.0.113.1', null) $$, '42501', null, 'a code begin without a session is refused');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select auth_attempt_succeeded('mfa', null, '203.0.113.1') $$,
  '42501', null, 'a code success cannot be recorded without MFA');
select tests.login_user(:'uid', 'aal2');
select lives_ok($$ select auth_attempt_succeeded('mfa', null, '203.0.113.1') $$, 'a session with MFA records the code success');
select is(auth_attempt_begin('mfa', null, '203.0.113.1', null), true, 'a verified code resets her count');

-- Old attempts: older than 15 minutes do not count, older than 7 days are deleted.
select tests.admin();
insert into auth_attempt (kind, key_hash, ip, succeeded, at)
select 'password', encode(sha256(convert_to('stale@example.test', 'UTF8')), 'hex'), '203.0.113.9', false, now() - interval '20 minutes'
from generate_series(1, 5);
insert into auth_attempt (kind, key_hash, ip, succeeded, at) values ('password', 'ancient', '203.0.113.9', false, now() - interval '8 days');
select tests.anon();
select is(auth_attempt_begin('password', 'stale@example.test', '203.0.113.9', null), true, 'failures older than 15 minutes do not count');
select tests.admin();
select is((select count(*) from auth_attempt where key_hash = 'ancient'), 0::bigint, 'attempts older than 7 days are deleted');

-- Bad input is refused rather than guessed at.
select tests.anon();
select throws_ok($$ select auth_attempt_begin('sms', 'a@example.test', '203.0.113.1', null) $$, '22023', null, 'an unknown kind is refused');
select throws_ok($$ select auth_attempt_begin('password', '  ', '203.0.113.1', null) $$, '22023', null, 'a blank email is refused');

-- Grants: begin is reachable before there is a session; a success needs one.
select is(has_function_privilege('anon', 'public.auth_attempt_begin(text, text, text, text)', 'execute'), true, 'anon can begin an attempt');
select is(has_function_privilege('anon', 'public.auth_attempt_succeeded(text, text, text)', 'execute'), false, 'anon cannot record a success at all');

select * from finish();
rollback;
