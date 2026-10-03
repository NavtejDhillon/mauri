// The order of the sign-in steps, ending with null for "ready to use the app".
const order: (string | null)[] = ["/login", "/welcome/password", "/welcome/mfa", "/mfa", "/welcome/profile", null];

// Why an action meant for one step cannot run when the person is at another, or null when it can.
export function stepRefusal(expected: string | null, actual: string | null): string | null {
  if (expected === actual) return null;
  if (actual === "/login") return "Your session has ended. Sign in again to continue.";
  if (order.indexOf(expected) < order.indexOf(actual)) return "This step is already done. Reload the page to carry on.";
  return "Finish signing in first. Reload the page to carry on.";
}
