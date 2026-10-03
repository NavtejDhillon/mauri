"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { clientIp } from "@/lib/client-ip";
import { abandonSession } from "./abandon-session";
import { attemptLimiter } from "./attempt-limiter";
import { describeAuthFailure } from "./auth-failure";
import { deviceToken } from "./device-token";
import { serviceProblem } from "./service-problem";
import { tooManyAttempts } from "./too-many-attempts";

// The attempt is counted as a failure before the auth service is asked, so parallel guesses
// cannot slip past the limit; only a successful sign-in clears it.
export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // The email comes back so the form can show it again; the password never does.
  const fail = (error: string): ActionResult => ({ error, values: { email } });
  if (!email || !password) return fail("Enter your email and password.");
  const supabase = await createClient();
  const limiter = attemptLimiter(supabase, "password", email, clientIp(await headers()), await deviceToken());
  const allowed = await limiter.begin();
  if (allowed === null) return fail(serviceProblem);
  if (!allowed) return fail(tooManyAttempts);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const failure = describeAuthFailure("password", error);
    if (!failure.wrongInput) console.error("signIn: signInWithPassword failed", error);
    return fail(failure.message);
  }
  // Same client, so this call carries the new session, which the database requires to record a success.
  if (!(await limiter.succeeded())) return fail(await abandonSession(supabase, "signIn: could not record a successful sign-in"));
  redirect("/");
}
