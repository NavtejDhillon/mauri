-- Owners match on the row's own column before the grant lookup.
-- can_access_client() finds the client by id under the statement's snapshot, which cannot see a row
-- the same statement is inserting. PostgREST inserts use INSERT ... RETURNING, and Postgres applies
-- the select policy to returned rows, so without this the owner's own insert was rejected.
-- The subselect lets Postgres evaluate current_practitioner_id() once per statement.
drop policy client_select on public.client;
create policy client_select on public.client
  for select to authenticated
  using (
    owner_practitioner_id = (select public.current_practitioner_id())
    or public.can_access_client(id, 'view')
  );
