import type { SupabaseClient } from "@supabase/supabase-js";

// Used when a sign-in step succeeded with the auth service but could not be recorded: the
// session on this device is ended so nothing proceeds on an unrecorded success.
// Returns the message for the form.
export async function abandonSession(supabase: SupabaseClient, reason: string): Promise<string> {
  console.error(reason);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("abandonSession: local sign-out failed", error);
  return "We could not finish signing you in. Sign in again.";
}
