import { sessionState } from "./session-state";
import { stepRefusal } from "./step-refusal";
import type { SessionState } from "./state";

// For server actions: confirms the person is at the expected step (null means fully set up)
// and returns a message to show instead of redirecting when she is not.
export async function checkStep(expected: string | null): Promise<{ state: SessionState } | { error: string }> {
  let state: Awaited<ReturnType<typeof sessionState>>;
  try {
    state = await sessionState();
  } catch (e) {
    console.error("checkStep: could not read the session", e);
    return { error: "We could not check your sign-in. Try again shortly." };
  }
  const refusal = stepRefusal(expected, state.step);
  return refusal ? { error: refusal } : { state };
}
