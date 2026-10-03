import { tooManyAttempts } from "./too-many-attempts";
import { serviceProblem } from "./service-problem";

export type AuthFailure = {
  message: string;
  // True only for a wrong password or a wrong code, the failures the attempt limit counts.
  counts: boolean;
};

const wrongInput: Record<"password" | "mfa" | "enrol", { code: string; message: string }> = {
  password: { code: "invalid_credentials", message: "Email or password is incorrect." },
  mfa: { code: "mfa_verification_failed", message: "That code was not accepted. Codes change every 30 seconds." },
  enrol: { code: "mfa_verification_failed", message: "That code was not accepted. Check the time on your phone and try the next code." },
};

// What to tell the person after a failed sign-in or code check. Only the auth service's own
// "wrong password" or "wrong code" answers are reported as such; a rate limit gets the same
// message as our own attempt limit, and anything else is reported as a service problem.
export function describeAuthFailure(kind: "password" | "mfa" | "enrol", error: { code?: string; status?: number }): AuthFailure {
  if (error.code === "over_request_rate_limit" || error.status === 429) return { message: tooManyAttempts, counts: false };
  if (error.code === wrongInput[kind].code) return { message: wrongInput[kind].message, counts: true };
  if (error.code === "mfa_challenge_expired") return { message: "That took too long. Enter the next code from your app.", counts: false };
  return { message: serviceProblem, counts: false };
}
