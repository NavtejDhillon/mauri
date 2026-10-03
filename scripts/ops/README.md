# Operator scripts

These run on the operator's machine against staging or production. They need `.env.ops` in the repo root (git-ignored) with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPS_DATABASE_URL` (the `mauri_ops` login, which is a member of `platform_admin` and has no clinical access) and `SITE_URL` (where the app runs).

- `pnpm ops:invite her@example.nz`: records an invite and prints a one-time link to send to the midwife. The link expires in 24 hours: the auth service's invite token lasts 24 hours (`GOTRUE_MAILER_OTP_EXP`, default 86400 seconds), and the invite row is recorded with the same expiry. If it expires, run the command again. If the email already has an account, the auth service refuses; that case (re-invite, password reset) is handled in a later stage.
- `pnpm ops:reset-mfa [--temporary-password] her@example.nz`: removes a midwife's authenticator so she can set up a new one, ends every session on her account and forgets her known devices. With `--temporary-password` it first gives her a new random password. Follow the procedure below; never run it on the strength of an email alone. `pnpm ops:reset-mfa --help` shows the options and changes nothing.

The service key is used only by these scripts, to reach the auth service's admin API. It is never placed in the app's environment. Ending sessions needs the database instead (`ops.end_sessions`, which only `platform_admin` may run), because neither the service key nor the admin API can end another person's sessions.

## A midwife has lost her authenticator

The auth service has no recovery codes, so a lost or replaced phone needs the operator. Removing her authenticator lets anyone who knows her password set up a new one, so confirm who she is first.

1. Confirm her identity by a route other than the one the request came in on. Call her on the phone number held for her outside Mauri (for example her Midwifery Council registration or the practice's contact list), not a number given in the request, and check details only she would know, such as her Midwifery Council number and the practice she works with. If the request came by email, do not reply to that email to confirm.
2. Record the request in the operations log: who asked, when, how her identity was confirmed, and who is doing the reset.
3. Decide whether the phone may have held her password (saved in the browser, or in a password manager on it). If it may have, or you cannot be sure, add `--temporary-password`.
4. Run `pnpm ops:reset-mfa her@example.nz`, or `pnpm ops:reset-mfa --temporary-password her@example.nz`. It shows her account and its factors. Check they are what you expect, then type her email address again when asked. Anything other than an exact match stops the script with nothing changed. In that one confirmed run it:
   - with `--temporary-password`, sets a new random password (24 characters, letters, digits, `-` and `_`) with the auth admin API (`auth.admin.updateUserById`) and prints it once. Read it to her over the verified call. Never send it by text or email, and do not keep it anywhere. If setting it fails, nothing else is changed;
   - removes her authenticator (TOTP factor) with the auth admin API (`auth.admin.mfa.deleteFactor`);
   - ends every session on her account and forgets her known devices through `ops.end_sessions` over `OPS_DATABASE_URL`, and reports how many sessions ended. The audit event records both counts.

   If it stops after the password or the authenticator but before ending the sessions, run it again without `--temporary-password` (so the password you already read to her stays hers): with no authenticator left it still ends the sessions.
   - Removing the authenticator alone is not enough: her sessions, including any on the lost phone, would stay signed in with the second factor already passed. Ending them signs every device out of Mauri at once. Forgetting her known devices means the lost phone's attempts are counted with every other unknown device's.
   - Access tokens already issued remain valid at the API until they expire, about an hour. The app itself treats the device as signed out straight away.
   - Mauri has no way yet for her to change her password herself, so a temporary password stays her password until that arrives in a later stage.
5. Tell her, by the same confirmed route, to sign in with her email and her password (the temporary one, if you set it). With no authenticator on the account, Mauri takes her straight to setting up a new one, and she continues once that is done.
   - If someone is flooding her account with sign-in or code attempts, each attempt waits its turn behind a lock on her account, so hers may wait too. After about 8 seconds she may see "We could not check that just now". Ask her to wait a minute and try again; if it keeps happening, look at the attempts for her account before going further.
6. Add the time of the reset to the log entry, and whether a temporary password was given (never the password itself). If she says she did not ask for this, treat it as a security incident and start by reviewing the audit log for her account.
