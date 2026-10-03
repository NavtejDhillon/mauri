"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { clientIp } from "@/lib/client-ip";
import { abandonSession } from "./abandon-session";
import { attemptLimiter } from "./attempt-limiter";
import { describeAuthFailure } from "./auth-failure";
import { readyForAction } from "./ready-for-action";
import { serviceProblem } from "./service-problem";
import { tooManyAttempts } from "./too-many-attempts";
import { verifyCode } from "./verify-code";

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // The email comes back so the form can show it again; the password never does.
  const fail = (error: string): ActionResult => ({ error, values: { email } });
  if (!email || !password) return fail("Enter your email and password.");
  const supabase = await createClient();
  const limiter = attemptLimiter(supabase, "password", email, clientIp(await headers()));
  const allowed = await limiter.allowed();
  if (allowed === null) return fail(serviceProblem);
  if (!allowed) return fail(tooManyAttempts);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const failure = describeAuthFailure("password", error);
    if (!failure.counts) console.error("signIn: signInWithPassword failed", error);
    if (failure.counts && !(await limiter.record(false))) return fail(serviceProblem);
    return fail(failure.message);
  }
  // Same client, so this call carries the new session, which the database requires to record a success.
  if (!(await limiter.record(true))) return fail(await abandonSession(supabase, "signIn: could not record a successful sign-in"));
  redirect("/");
}

export async function verifyMfa(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6 digit code from your authenticator app." };
  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error("verifyMfa: listFactors failed", listError);
    return { error: "Could not read your authenticator settings. Try again shortly." };
  }
  const factor = factors.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/welcome/mfa");
  const message = await verifyCode(supabase, factor.id, code, "mfa");
  if (message) return { error: message };
  redirect("/");
}

// "Sign out everywhere" from settings: ends every session for this account. Needs a fully
// signed-in session, so a password alone cannot sign the midwife out of her other devices.
export async function signOut(): Promise<ActionResult> {
  const ready = await readyForAction();
  if ("error" in ready) return ready;
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    console.error("signOut: global sign-out failed", error);
    return { error: "Could not sign you out everywhere. Try again." };
  }
  redirect("/login");
}

// "Sign out" from the MFA and welcome steps: ends the session on this device only.
export async function signOutHere(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error("signOutHere: sign-out failed", error);
    return { error: "Could not sign you out. Try again." };
  }
  redirect("/login");
}
