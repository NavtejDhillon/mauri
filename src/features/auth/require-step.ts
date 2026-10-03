import { redirect } from "next/navigation";
import { sessionState } from "./session-state";

// The gate at the top of each sign-in step page (/mfa and the welcome steps): the page only
// renders for someone at that step. Everyone else goes to their own step, or to the dashboard
// once there is none left.
export async function requireStep(path: string): Promise<void> {
  const { step } = await sessionState();
  if (step !== path) redirect(step ?? "/dashboard");
}
