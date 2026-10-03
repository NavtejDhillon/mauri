# Operator scripts

These run on the operator's machine against staging or production. They need `.env.ops` in the repo root (git-ignored) with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPS_DATABASE_URL` (the `mauri_ops` login, which is a member of `platform_admin` and has no clinical access) and `SITE_URL` (where the app runs).

- `pnpm ops:invite her@example.nz`: records an invite and prints a one-time link to send to the midwife. The link expires in 24 hours: the auth service's invite token lasts 24 hours (`GOTRUE_MAILER_OTP_EXP`, default 86400 seconds), and the invite row is recorded with the same expiry. If it expires, run the command again. If the email already has an account, the auth service refuses; that case (re-invite, password reset) is handled in a later stage.
- `pnpm ops:reset-mfa her@example.nz`: removes a midwife's authenticator so she can set up a new one. Follow the procedure below; never run it on the strength of an email alone.

The service key is used only by these scripts, to reach the auth service's admin API. It is never placed in the app's environment.

## A midwife has lost her authenticator

The auth service has no recovery codes, so a lost or replaced phone needs the operator. Removing her authenticator lets anyone who knows her password set up a new one, so confirm who she is first.

1. Confirm her identity by a route other than the one the request came in on. Call her on the phone number held for her outside Mauri (for example her Midwifery Council registration or the practice's contact list), not a number given in the request, and check details only she would know, such as her Midwifery Council number and the practice she works with. If the request came by email, do not reply to that email to confirm.
2. Record the request in the operations log: who asked, when, how her identity was confirmed, and who is doing the reset.
3. Run `pnpm ops:reset-mfa her@example.nz`. It shows her account and its factors. Check they are what you expect, then type her email address again when asked. It removes her authenticator (TOTP factor) with the auth admin API (`auth.admin.mfa.deleteFactor`). Anything other than an exact match stops the script with nothing removed.
4. Tell her, by the same confirmed route, to sign in with her email and password. With no authenticator on the account, Mauri takes her straight to setting up a new one, and she continues once that is done.
5. Add the time of the reset to the log entry. If she says she did not ask for this, treat it as a security incident and start by reviewing the audit log for her account.
