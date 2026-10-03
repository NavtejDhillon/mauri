import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientIp } from "@/lib/client-ip";
import { abandonSession } from "./abandon-session";
import { attemptLimiter } from "./attempt-limiter";
import { describeAuthFailure } from "./auth-failure";
import { serviceProblem } from "./service-problem";
import { tooManyAttempts } from "./too-many-attempts";

// Checks an authenticator code under the attempt limit, for the MFA challenge and for
// enrolment. Returns null on success (the session is then aal2), or the message to show.
export async function verifyCode(supabase: SupabaseClient, factorId: string, code: string, kind: "mfa" | "enrol"): Promise<string | null> {
  const limiter = attemptLimiter(supabase, "mfa", null, clientIp(await headers()));
  const allowed = await limiter.allowed();
  if (allowed === null) return serviceProblem;
  if (!allowed) return tooManyAttempts;

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    const failure = describeAuthFailure(kind, error);
    if (!failure.counts) console.error(`verifyCode(${kind}): challengeAndVerify failed`, error);
    if (failure.counts && !(await limiter.record(false))) return serviceProblem;
    return failure.message;
  }
  if (!(await limiter.record(true))) return abandonSession(supabase, `verifyCode(${kind}): could not record a successful code`);
  return null;
}
