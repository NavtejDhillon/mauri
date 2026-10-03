import { tooManyAttempts } from "./too-many-attempts";
import { serviceProblem } from "./service-problem";

export type AuthFailure = {
  message: string;
  // True only for a wrong password or a wrong code: her own mistake, so not logged as an error.
  // Every attempt counts against the attempt limit whatever the answer (see attemptLimiter).
  wrongInput: boolean;
};

const wrongAnswer: Record<"password" | "mfa" | "enrol", { code: string; message: string }> = {
  password: { code: "invalid_credentials", message: "Email or password is incorrect." },
  mfa: { code: "mfa_verification_failed", message: "That code was not accepted. Codes change every 30 seconds." },
  enrol: { code: "mfa_verification_failed", message: "That code was not accepted. Check the time on your phone and try the next code." },
};

// What to tell the person after a failed sign-in or code check. Only the auth service's own
// "wrong password" or "wrong code" answers are reported as such; a rate limit gets the same
// message as our own attempt limit, and anything else is reported as a service problem.
export function describeAuthFailure(kind: "password" | "mfa" | "enrol", error: { code?: string; status?: number }): AuthFailure {
  if (error.code === "over_request_rate_limit" || error.status === 429) return { message: tooManyAttempts, wrongInput: false };
  if (error.code === wrongAnswer[kind].code) return { message: wrongAnswer[kind].message, wrongInput: true };
  if (error.code === "mfa_challenge_expired") return { message: "That took too long. Enter the next code from your app.", wrongInput: false };
  return { message: serviceProblem, wrongInput: false };
}
