// Functions in the public schema that anon is intentionally allowed to execute.
// Every entry needs a reason and a reviewer. The signature is the function name followed by
// pg_get_function_identity_arguments, exactly as the security audit prints it.
export const publicExecuteAllowlist: { signature: string; reason: string; reviewedBy: string }[] = [
  {
    signature: "auth_attempt_allowed(p_kind text, p_email text, p_ip text)",
    reason:
      "Password sign-in is checked against the attempt limit before there is a session. Returns only a boolean; the attempt table itself has no privileges.",
    reviewedBy: "Stage 1b fix plan A2, 2026-10-04",
  },
  {
    signature: "auth_attempt_record(p_kind text, p_email text, p_ip text, p_succeeded boolean)",
    reason:
      "A failed password sign-in is recorded before there is a session. A success can only be recorded by the session that authenticated, so anon cannot reset a count.",
    reviewedBy: "Stage 1b fix plan A2, 2026-10-04",
  },
];
