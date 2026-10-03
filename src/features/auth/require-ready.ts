import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionState } from "./session-state";

// The gate at the top of every (app) page. Next renders layouts and pages in parallel, and
// skips layouts the client already has, so the layout gate alone does not stop a page running.
// Redirects to the next sign-in step when there is one; otherwise returns the practitioner id.
export const requireReady = cache(async (): Promise<string> => {
  const state = await sessionState();
  if (state.step) redirect(state.step);
  if (!state.practitionerId) throw new Error("Signed in and set up, but no practitioner id was found.");
  return state.practitionerId;
});
