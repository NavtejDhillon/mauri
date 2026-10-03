"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readyForAction } from "./ready-for-action";

export type ActionResult = { error: string } | null;

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email or password is incorrect." };
  redirect("/");
}

export async function verifyMfa(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6 digit code from your authenticator app." };
  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Could not read your authenticator settings." };
  const factor = factors.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/welcome/mfa");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "That code was not accepted. Codes change every 30 seconds." };
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
