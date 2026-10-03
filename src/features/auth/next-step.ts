export type AuthState = {
  signedIn: boolean;
  passwordSet: boolean;
  hasVerifiedFactor: boolean;
  currentLevel: "aal1" | "aal2" | null;
  hasPractitioner: boolean;
};

// The one place that decides what a signed-in person must do next.
// Returns the path to send her to, or null when she can use the app.
export function nextStepFor(state: AuthState): string | null {
  if (!state.signedIn) return "/login";
  if (!state.passwordSet) return "/welcome/password";
  if (!state.hasVerifiedFactor) return "/welcome/mfa";
  if (state.currentLevel !== "aal2") return "/mfa";
  if (!state.hasPractitioner) return "/welcome/profile";
  return null;
}
