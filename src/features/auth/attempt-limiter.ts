import type { SupabaseClient } from "@supabase/supabase-js";

// Wraps the database's attempt limit (auth_attempt_allowed and auth_attempt_record).
// Password attempts are counted against the email and need no session. MFA attempts are
// counted against the signed-in user, so the client must carry her session.
// A success may only be recorded by a client whose session proves it: after
// signInWithPassword for a password, after challengeAndVerify (aal2) for a code.
export function attemptLimiter(supabase: SupabaseClient, kind: "password" | "mfa", email: string | null, ip: string) {
  return {
    // True when the attempt may go ahead, false when blocked, null when the check itself failed.
    async allowed(): Promise<boolean | null> {
      const { data, error } = await supabase.rpc("auth_attempt_allowed", { p_kind: kind, p_email: email, p_ip: ip });
      if (error) {
        console.error(`auth_attempt_allowed(${kind}) failed`, error);
        return null;
      }
      return data === true;
    },
    // True when recorded.
    async record(succeeded: boolean): Promise<boolean> {
      const { error } = await supabase.rpc("auth_attempt_record", { p_kind: kind, p_email: email, p_ip: ip, p_succeeded: succeeded });
      if (error) {
        console.error(`auth_attempt_record(${kind}, ${succeeded}) failed`, error);
        return false;
      }
      return true;
    },
  };
}
