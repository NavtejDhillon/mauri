-- Stage 1b review fixes, part 2: an authenticator reset must also end every session.
--
-- Deleting a factor leaves the account's sessions and refresh tokens in place (auth.sessions has
-- no foreign key to factors), and the auth service works out the sign-in level from the session's
-- own MFA claims, so a lost phone's session would go on refreshing at aal2. Only the auth service's
-- own role and the superuser can delete sessions; neither mauri_ops nor the service key can, and
-- the admin sign-out needs the user's own token. So the operator ends them through this function.
--
-- It lives in the ops schema, which the API does not expose (PostgREST serves public, storage and
-- graphql_public only), and only platform_admin (so mauri_ops) may use it. It is owned by the
-- migration role, which may delete from auth.sessions. Deleting a session cascades to its refresh
-- tokens and its MFA claims (auth.refresh_tokens and auth.mfa_amr_claims both reference
-- auth.sessions on delete cascade; checked on staging before this migration).
-- Access tokens already issued stay valid at the API until they expire (about an hour).

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;
grant usage on schema ops to platform_admin;

-- The audit trail gains an action for ended sessions.
alter table public.audit_event drop constraint audit_event_action_check;
alter table public.audit_event add constraint audit_event_action_check
  check (action in ('insert', 'update', 'soft_delete', 'restore', 'read', 'grant', 'revoke', 'transfer', 'end_sessions'));

-- Ends every session for the account and returns how many ended. The audit event names the
-- account (row_id, table auth.users), the database login that asked (session_user, which is the
-- operator's login, not the function owner) and the reason given.
create or replace function ops.end_sessions(p_user_id uuid, p_reason text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'the account is required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  insert into public.audit_event (action, table_name, row_id, detail)
  values ('end_sessions', 'auth.users', p_user_id,
          jsonb_build_object('reason', left(trim(p_reason), 500), 'sessions_ended', v_count, 'operator', session_user::text));
  return v_count;
end $$;
revoke all on function ops.end_sessions(uuid, text) from public, anon, authenticated;
grant execute on function ops.end_sessions(uuid, text) to platform_admin;
