import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthState } from "./next-step";
import { isSignedOutError } from "./signed-out-error";

export type SessionState = AuthState & { practitionerId: string | null };

const signedOut: SessionState = {
  signedIn: false,
  passwordSet: false,
  hasVerifiedFactor: false,
  currentLevel: null,
  hasPractitioner: false,
  practitionerId: null,
};

// Gathers everything nextStepFor needs from the session. passwordSet is a set-once database
// flag (onboarding_state, migration 0016) the app sets when the invited person chooses her
// password; user metadata is not used, because she could write that herself.
// Throws when the auth service or the database fails, so a failure is never mistaken for
// "this step is not done yet".
export async function getAuthState(supabase: SupabaseClient): Promise<SessionState> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (isSignedOutError(userError)) return signedOut;
    throw new Error("Could not check your sign-in: " + userError.message);
  }
  const user = userData.user;
  if (!user) return signedOut;

  const [factors, aal, passwordSet] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.rpc("password_is_set"),
  ]);
  if (factors.error) throw new Error("Could not read authenticator settings: " + factors.error.message);
  if (passwordSet.error) throw new Error("Could not check whether your password is set: " + passwordSet.error.message);
  if (aal.error) throw new Error("Could not read the sign-in level: " + aal.error.message);
  const currentLevel = (aal.data.currentLevel as AuthState["currentLevel"]) ?? null;

  // The practitioner row is only visible at aal2, and nextStepFor checks aal2 before it
  // looks at hasPractitioner, so below aal2 there is nothing to ask.
  let practitionerId: string | null = null;
  if (currentLevel === "aal2") {
    const { data, error } = await supabase.from("practitioner").select("id").eq("auth_user_id", user.id).maybeSingle<{ id: string }>();
    if (error) throw new Error("Could not load your practitioner record: " + error.message);
    practitionerId = data?.id ?? null;
  }

  return {
    signedIn: true,
    passwordSet: passwordSet.data === true,
    // `totp` lists verified factors only.
    hasVerifiedFactor: factors.data.totp.some((f) => f.status === "verified"),
    currentLevel,
    hasPractitioner: practitionerId !== null,
    practitionerId,
  };
}
