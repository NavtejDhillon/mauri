import { checkStep } from "./check-step";

// The gate at the start of every server action that needs a fully set up, MFA-verified
// practitioner. Returns her practitioner id, or a message for the form to show.
export async function readyForAction(): Promise<{ practitionerId: string } | { error: string }> {
  const checked = await checkStep(null);
  if ("error" in checked) return checked;
  if (!checked.state.practitionerId) return { error: "Finish signing in first. Reload the page to carry on." };
  return { practitionerId: checked.state.practitionerId };
}
