begin;
select plan(4);
select has_schema('tests', 'tests schema exists');
select has_function('auth', 'uid', 'auth.uid() exists in this image');
select is(auth.uid(), null, 'no user before login');
select isnt(tests.create_user('smoke@example.test'), null, 'can create a test auth user');
select * from finish();
rollback;
