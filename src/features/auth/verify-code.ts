import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientIp } from "@/lib/client-ip";
import { abandonSession } from "./abandon-session";
import { attemptLimiter } from "./attempt-limiter";
import { describeAuthFailure } from "./auth-failure";
import { deviceToken } from "./device-token";
import { rememberDevice } from "./remember-device";
import { serviceProblem } from "./service-problem";
import { tooManyAttempts } from "./too-many-attempts";

// Checks an authenticator code under the attempt limit, for the MFA challenge and for
// enrolment. Returns null on success (the session is then aal2 and this device is remembered
// as one of hers), or the message to show. The attempt is counted as a failure before the
// auth service is asked, so parallel guesses cannot slip past the limit; only an accepted
// code clears it.
export async function verifyCode(supabase: SupabaseClient, factorId: string, code: string, kind: "mfa" | "enrol"): Promise<string | null> {
  const limiter = attemptLimiter(supabase, "mfa", null, clientIp(await headers()), await deviceToken());
  const allowed = await limiter.begin();
  if (allowed === null) return serviceProblem;
  if (!allowed) return tooManyAttempts;

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    const failure = describeAuthFailure(kind, error);
    if (!failure.wrongInput) console.error(`verifyCode(${kind}): challengeAndVerify failed`, error);
    return failure.message;
  }
  if (!(await limiter.succeeded())) return abandonSession(supabase, `verifyCode(${kind}): could not record a successful code`);
  await rememberDevice(supabase);
  return null;
}
