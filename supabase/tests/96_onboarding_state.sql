begin;
select plan(14);

select tests.create_user('new-midwife@example.test') as uid \gset
select tests.create_user('other@example.test') as uid2 \gset

select has_table('public', 'onboarding_state', 'onboarding_state table');
select has_function('public', 'mark_password_set', array[]::text[], 'mark_password_set exists');
select has_function('public', 'password_is_set', array[]::text[], 'password_is_set exists');

-- Nobody reads or writes the table directly, so the flag cannot be cleared or forged.
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select count(*) from onboarding_state $$, '42501', null, 'authenticated cannot read onboarding_state');
select throws_ok($$ insert into onboarding_state (auth_user_id, password_set_at) values (auth.uid(), now()) $$, '42501', null, 'authenticated cannot write onboarding_state');
select throws_ok($$ delete from onboarding_state $$, '42501', null, 'authenticated cannot delete onboarding_state');

-- Before she chooses a password the flag is not set; afterwards it is, once.
select is(password_is_set(), false, 'a new account has not set a password');
select lives_ok($$ select mark_password_set() $$, 'she marks her password as set');
select is(password_is_set(), true, 'her password is set');
select tests.admin();
update onboarding_state set password_set_at = now() - interval '1 day' where auth_user_id = :'uid';
select tests.login_user(:'uid', 'aal1');
select lives_ok($$ select mark_password_set() $$, 'marking it again is harmless');
select tests.admin();
select ok((select password_set_at < now() - interval '23 hours' from onboarding_state where auth_user_id = :'uid'), 'the first time it was set is kept');

-- Each account sees only its own flag; without a session there is none.
select tests.login_user(:'uid2', 'aal1');
select is(password_is_set(), false, 'another account has not set a password');
select tests.anon();
select throws_ok($$ select mark_password_set() $$, '42501', null, 'anon cannot mark a password as set');
select throws_ok($$ select password_is_set() $$, '42501', null, 'anon cannot ask whether a password is set');

select * from finish();
rollback;
