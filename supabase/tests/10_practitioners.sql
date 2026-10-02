begin;
select plan(9);

select has_table('public', 'practitioner', 'practitioner table');
select has_table('public', 'practice', 'practice table');
select has_table('public', 'practice_member', 'practice_member table');
select has_table('public', 'invite', 'invite table');

select col_is_unique('public', 'practitioner', 'auth_user_id', 'one practitioner per auth user');

-- status is constrained
select throws_ok(
  $$ insert into practitioner (auth_user_id, full_name, email, status)
     values (tests.create_user('bad@example.test'), 'Bad', 'bad@example.test', 'unknown') $$,
  '23514', null, 'status must be active or suspended');

-- a member cannot be in the same practice twice while still a member
select lives_ok($$
  insert into practice (id, name) values ('11111111-1111-1111-1111-111111111111', 'West Coast Midwives');
  insert into practitioner (id, auth_user_id, full_name, email)
    values ('22222222-2222-2222-2222-222222222222', tests.create_user('a@example.test'), 'A', 'a@example.test');
  insert into practice_member (practice_id, practitioner_id, role)
    values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member');
$$, 'first membership inserts');
select throws_ok($$
  insert into practice_member (practice_id, practitioner_id, role)
    values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'admin');
$$, '23505', null, 'second current membership is rejected');

-- updated_at trigger works
with u as (
  update practitioner set phone = '021' where id = '22222222-2222-2222-2222-222222222222'
  returning created_at, updated_at)
select is((select updated_at > created_at from u), true, 'updated_at moves on update');

select * from finish();
rollback;
