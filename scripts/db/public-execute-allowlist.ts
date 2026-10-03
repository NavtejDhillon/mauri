// Functions in the public schema that anon is intentionally allowed to execute.
// Every entry needs a reason and a reviewer. The signature is the function name followed by
// pg_get_function_identity_arguments, exactly as the security audit prints it.
export const publicExecuteAllowlist: { signature: string; reason: string; reviewedBy: string }[] = [
  {
    signature: "auth_attempt_begin(p_kind text, p_email text, p_ip text, p_device_token text)",
    reason:
      "Password sign-in begins an attempt before there is a session. Returns only a boolean and writes at most one row per allowed attempt; a key over its cap gains no rows, and rows older than 7 days are deleted. The attempt table itself has no privileges. Anyone holding the anon key can use up the unknown-device buckets for any email (a midwife's known devices keep working), so the anon key is load-bearing for availability and must stay server-only: it is never sent to the browser.",
    reviewedBy: "Stage 1b review fixes C1, I1 and I2, 2026-10-04",
  },
];
