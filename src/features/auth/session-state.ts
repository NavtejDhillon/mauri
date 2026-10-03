import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { nextStepFor } from "./next-step";
import { getAuthState, type SessionState } from "./state";

// The signed-in person's state and next step, worked out once per request however many
// layouts, pages and actions ask. Throws when the auth service or database fails.
export const sessionState = cache(async (): Promise<SessionState & { step: string | null }> => {
  const supabase = await createClient();
  const state = await getAuthState(supabase);
  return { ...state, step: nextStepFor(state) };
});
