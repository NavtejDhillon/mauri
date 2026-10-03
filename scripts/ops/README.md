# Operator scripts

These run on the operator's machine against staging or production. They need `.env.ops` in the repo root (git-ignored) with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPS_DATABASE_URL` (the `mauri_ops` login, which is a member of `platform_admin` and has no clinical access) and `SITE_URL` (where the app runs).

- `pnpm ops:invite her@example.nz`: records an invite and prints a one-time link to send to the midwife. Invite links expire after 7 days. If the email already has an account, the auth service refuses; that case (re-invite, password reset) is handled in a later stage.

The service key is used only to ask the auth service for the invite token. It is never placed in the app's environment.
