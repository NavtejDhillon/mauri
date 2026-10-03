begin;
select plan(9);

-- A midwife's own practitioner row is past the second factor, like everything else she sees.
insert into practitioner (id, auth_user_id, full_name, email, phone) values
  ('a0000000-0000-0000-0000-000000000001', tests.create_user('self@example.test'), 'Self', 'self@example.test', '021 111 111');

-- Without MFA she can neither read nor change her own row.
select tests.login('a0000000-0000-0000-0000-000000000001', 'aal1');
select is((select count(*) from practitioner), 0::bigint, 'without MFA she reads none of her own practitioner row');
with u as (update practitioner set phone = '000' where id = 'a0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 0::bigint, 'without MFA her update touches no rows');
select tests.admin();
select is((select phone from practitioner where id = 'a0000000-0000-0000-0000-000000000001'), '021 111 111', 'the update without MFA changed nothing');

-- With MFA both work.
select tests.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*) from practitioner), 1::bigint, 'with MFA she reads her own row');
with u as (update practitioner set phone = '022 222 222' where id = 'a0000000-0000-0000-0000-000000000001' returning id)
select is((select count(*) from u), 1::bigint, 'with MFA her update touches her row');
select tests.admin();
select is((select phone from practitioner where id = 'a0000000-0000-0000-0000-000000000001'), '022 222 222', 'the update with MFA is stored');

-- accept_invite needs MFA too: the profile step comes after the second factor.
select tests.create_user('invited@example.test') as uid \gset
insert into invite (email, invited_by) values ('invited@example.test', 'operator');
select tests.login_user(:'uid', 'aal1');
select throws_ok($$ select accept_invite('Invited Midwife', null, null, null) $$,
  '42501', 'not signed in with MFA', 'accept_invite without MFA is refused');
select tests.admin();
select is((select count(*) from practitioner where auth_user_id = :'uid'), 0::bigint, 'no practitioner row is created without MFA');
select tests.login_user(:'uid');
select lives_ok($$ select accept_invite('Invited Midwife', null, null, null) $$, 'accept_invite with MFA creates her row');

select * from finish();
rollback;
