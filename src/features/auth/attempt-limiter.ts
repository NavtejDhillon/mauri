import type { SupabaseClient } from "@supabase/supabase-js";

// Wraps the database's attempt limit (auth_attempt_begin and auth_attempt_succeeded; see
// migrations 0014 and 0017). begin() is called before the auth service is asked: it records the attempt
// as a failure, atomically, unless a limit is already reached. succeeded() is called after the
// auth service accepts, and resets the count.
// Password attempts are counted against the email and need no session. Code attempts are
// counted against the signed-in user, so the client must carry her session. A success may
// only be recorded by a client whose session proves it: after signInWithPassword for a
// password, after challengeAndVerify (aal2) for a code.
// deviceToken is the mauri_device cookie, if any; a token of one of her known devices puts the
// attempt in that device's own bucket.
export function attemptLimiter(supabase: SupabaseClient, kind: "password" | "mfa", email: string | null, ip: string, deviceToken: string | null) {
  return {
    // True when the attempt may go ahead, false when refused, null when the check itself failed.
    async begin(): Promise<boolean | null> {
      const { data, error } = await supabase.rpc("auth_attempt_begin", { p_kind: kind, p_email: email, p_ip: ip, p_device_token: deviceToken });
      if (error) {
        console.error(`auth_attempt_begin(${kind}) failed`, error);
        return null;
      }
      return data === true;
    },
    // True when recorded.
    async succeeded(): Promise<boolean> {
      const { error } = await supabase.rpc("auth_attempt_succeeded", { p_kind: kind, p_email: email, p_ip: ip });
      if (error) {
        console.error(`auth_attempt_succeeded(${kind}) failed`, error);
        return false;
      }
      return true;
    },
  };
}
