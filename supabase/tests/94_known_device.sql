begin;
select plan(34);

select tests.create_user('midwife@example.test') as uid \gset
select tests.create_user('other@example.test') as uid2 \gset

select has_table('public', 'known_device', 'known_device table');
select has_function('public', 'known_device_register', array['text', 'text'], 'known_device_register exists');

-- Nobody reads or writes the table directly.
select tests.anon();
select throws_ok($$ select count(*) from known_device $$, '42501', null, 'anon cannot read known_device');
select tests.login_user(:'uid');
select throws_ok($$ select count(*) from known_device $$, '42501', null, 'authenticated cannot read known_device');
select throws_ok($$ insert into known_device (auth_user_id, token_hash) values (auth.uid(), 'x') $$, '42501', null, 'authenticated cannot write known_device');

-- A device is registered only by a session that passed MFA, with a token long enough to be unguessable.
select tests.anon();
select throws_ok($$ select known_device_register(repeat('a', 64), null) $$, '42501', null, 'anon cannot register a device');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select known_device_register(repeat('a', 64), null) $$, '42501', null, 'a session without MFA cannot register a device');
select tests.login_user(:'uid', 'aal2');
select throws_ok($$ select known_device_register('short', null) $$, '22023', null, 'a short token is refused');
select lives_ok($$ select known_device_register(repeat('a', 64), null) $$, 'a session with MFA registers her device');
select tests.login_user(:'uid2', 'aal2');
select lives_ok($$ select known_device_register(repeat('c', 64), null) $$, 'another account registers its own device');

-- Only the sha256 of the token is stored.
select tests.admin();
select is((select count(*) from known_device where auth_user_id = :'uid' and token_hash = encode(sha256(convert_to(repeat('a', 64), 'UTF8')), 'hex')),
  1::bigint, 'the device is stored as the sha256 of its token');
select is((select count(*) from known_device where token_hash = repeat('a', 64)), 0::bigint, 'the token itself is not stored');

-- Twenty failures from many addresses refuse her on unknown devices, but not on her known device.
select tests.anon();
select is(bool_and(auth_attempt_begin('password', 'midwife@example.test', '198.51.100.' || g, null)), true, 'twenty failures from many addresses')
from generate_series(1, 20) g;
select is(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.1', null), false, 'an unknown device is refused');
select is(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.1', repeat('b', 64)), false, 'an unregistered token is refused like an unknown device');
select is(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.1', repeat('c', 64)), false, 'another account''s device does not count for her');
select is(auth_attempt_begin('password', 'midwife@example.test', '198.51.100.1', repeat('a', 64)), true, 'her known device is allowed, even from a refused address');

-- A known device's own failures still refuse it, after five in its own bucket.
select is(bool_and(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.' || g, repeat('a', 64))), true, 'four more failures on her known device are allowed')
from generate_series(2, 5) g;
select is(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.9', repeat('a', 64)), false, 'the sixth on her known device is refused');

-- Code attempts use the same buckets, with the account taken from the session.
select tests.login_user(:'uid', 'aal1');
select is(bool_and(auth_attempt_begin('mfa', null, '198.51.100.' || g, null)), true, 'twenty code failures from many addresses') from generate_series(1, 20) g;
select is(auth_attempt_begin('mfa', null, '192.0.2.1', null), false, 'an unknown device cannot enter a code');
select is(auth_attempt_begin('mfa', null, '198.51.100.1', repeat('a', 64)), true, 'her known device can still enter a code');

-- Rotation: registering a new token with the previous one replaces it, for her own devices only.
select tests.login_user(:'uid', 'aal2');
select lives_ok($$ select known_device_register(repeat('d', 64), repeat('a', 64)) $$, 'a new token replaces the previous one');
select tests.admin();
select is((select array_agg(token_hash order by token_hash) from known_device where auth_user_id = :'uid'),
  array[encode(sha256(convert_to(repeat('d', 64), 'UTF8')), 'hex')], 'the previous token is gone and the new one is stored');

-- An expired device is an unknown device.
update known_device set expires_at = now() - interval '1 minute' where auth_user_id = :'uid';
select tests.anon();
select is(auth_attempt_begin('password', 'midwife@example.test', '192.0.2.1', repeat('d', 64)), false, 'an expired device is refused like an unknown one');

-- Code attempts across all of an account's known devices are capped at 20 together, so a
-- handful of device tokens cannot each spend their own five.
select tests.admin();
select tests.create_user('many-devices@example.test') as uid3 \gset
select tests.login_user(:'uid3', 'aal2');
select lives_ok($$ select known_device_register(repeat(t, 64), null) from unnest(array['e', 'f', 'g', 'h', 'i']) t $$, 'five devices are registered for one account');
select tests.login_user(:'uid3', 'aal1');
select is(bool_and(auth_attempt_begin('mfa', null, '198.51.100.1', repeat(t, 64))), true, 'five code failures on each of four known devices are allowed')
from unnest(array['e', 'f', 'g', 'h']) t, generate_series(1, 5) g;
select is(auth_attempt_begin('mfa', null, '198.51.100.1', repeat('i', 64)), false, 'a fifth known device is refused once the account has 20 known-device code failures');
select is(auth_attempt_begin('mfa', null, '198.51.100.1', null), true, 'an unknown device keeps its own bucket');
select tests.admin();
select is((select count(*) from auth_attempt where kind = 'mfa' and device_hash = encode(sha256(convert_to(repeat('i', 64), 'UTF8')), 'hex')),
  0::bigint, 'the refused attempt records nothing');
-- A code success resets the cross-device count with the other buckets.
select tests.login_user(:'uid3', 'aal2');
select lives_ok($$ select auth_attempt_succeeded('mfa', null, '198.51.100.1') $$, 'a code success is recorded');
select tests.login_user(:'uid3', 'aal1');
select is(auth_attempt_begin('mfa', null, '198.51.100.1', repeat('i', 64)), true, 'after a success the fifth device is allowed again');

-- The password step keeps per-device buckets only: the cross-device cap is for codes.
select tests.anon();
select is(bool_and(auth_attempt_begin('password', 'many-devices@example.test', '198.51.100.1', repeat(t, 64))), true, 'five password failures on each of four known devices')
from unnest(array['e', 'f', 'g', 'h']) t, generate_series(1, 5) g;
select is(auth_attempt_begin('password', 'many-devices@example.test', '198.51.100.1', repeat('i', 64)), true, 'a fifth known device can still try a password');

select * from finish();
rollback;
