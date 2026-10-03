"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";
import { checkStep } from "@/features/auth/check-step";

// Only at the password step, that is while user_metadata.password_set is not true. Later
// password changes need their own flow that asks for the current password.
export async function setPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };
  const checked = await checkStep("/welcome/password");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
  if (error) return { error: "Could not save that password. " + error.message };
  redirect("/");
}

export type EnrolmentStart = { factorId: string; qrCode: string; secret: string } | { error: string };

// Starts a fresh TOTP enrolment, discarding any earlier attempt that was never verified.
// Only at the enrolment step, so never once a verified factor exists.
export async function startEnrolment(): Promise<EnrolmentStart> {
  const checked = await checkStep("/welcome/mfa");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error("startEnrolment: listFactors failed", listError);
    return { error: "Could not check your authenticator setup. Try again." };
  }
  // `totp` lists verified factors only; unverified attempts are found in `all`.
  if (factors.totp.length > 0) return { error: "Your authenticator app is already set up. Reload the page to carry on." };
  for (const f of factors.all) {
    if (f.factor_type !== "totp" || f.status !== "unverified") continue;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) {
      console.error("startEnrolment: unenroll failed", error);
      return { error: "Could not reset your earlier authenticator setup. Try again." };
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Mauri" });
  if (error || !data) return { error: "Could not start authenticator setup. " + (error?.message ?? "") };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function completeEnrolment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!factorId || code.length !== 6) return { error: "Enter the 6 digit code shown in your authenticator app." };
  const checked = await checkStep("/welcome/mfa");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "That code was not accepted. Check the time on your phone and try the next code." };
  redirect("/");
}

// Only at the profile step: signed in with MFA and no practitioner row yet.
export async function completeProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const checked = await checkStep("/welcome/profile");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_full_name: String(formData.get("full_name") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_midwifery_council_number: String(formData.get("midwifery_council_number") ?? ""),
    p_hpi_cpn: String(formData.get("hpi_cpn") ?? ""),
  });
  if (error) {
    if (error.code === "42501" && error.message.includes("no pending invite")) {
      return { error: "There is no pending invitation for this email address. Ask the operator for a new invite." };
    }
    if (error.code === "42501") return { error: "Finish signing in first. Reload the page to carry on." };
    if (error.code === "23505") return { error: "Your profile is already set up. Reload the page to carry on." };
    if (error.code === "23514") return { error: "Enter your full name." };
    return { error: "Could not save your profile. " + error.message };
  }
  redirect("/dashboard");
}
