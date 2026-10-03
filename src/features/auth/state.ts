import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthState } from "./next-step";

// Gathers everything nextStepFor needs from the session. passwordSet is a flag the app
// writes to user metadata when the invited person chooses her password.
export async function getAuthState(supabase: SupabaseClient): Promise<AuthState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { signedIn: false, passwordSet: false, hasVerifiedFactor: false, currentLevel: null, hasPractitioner: false };
  }
  const [{ data: factors }, { data: aal }, { data: practitioner }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from("practitioner").select("id").eq("auth_user_id", user.id).maybeSingle(),
  ]);
  return {
    signedIn: true,
    passwordSet: user.user_metadata?.password_set === true,
    hasVerifiedFactor: (factors?.totp ?? []).some((f) => f.status === "verified"),
    currentLevel: (aal?.currentLevel as AuthState["currentLevel"]) ?? null,
    hasPractitioner: practitioner !== null,
  };
}
