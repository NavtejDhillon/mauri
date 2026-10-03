"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";

export async function setPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
  if (error) return { error: "Could not save that password. " + error.message };
  redirect("/");
}

export type EnrolmentStart = { factorId: string; qrCode: string; secret: string } | { error: string };

// Starts a fresh TOTP enrolment, discarding any earlier attempt that was never verified.
export async function startEnrolment(): Promise<EnrolmentStart> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // `totp` lists verified factors only; unverified attempts are found in `all`.
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Mauri" });
  if (error || !data) return { error: "Could not start authenticator setup. " + (error?.message ?? "") };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function completeEnrolment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!factorId || code.length !== 6) return { error: "Enter the 6 digit code shown in your authenticator app." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "That code was not accepted. Check the time on your phone and try the next code." };
  redirect("/");
}

export async function completeProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_full_name: String(formData.get("full_name") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_midwifery_council_number: String(formData.get("midwifery_council_number") ?? ""),
    p_hpi_cpn: String(formData.get("hpi_cpn") ?? ""),
  });
  if (error) {
    if (error.code === "42501") return { error: "There is no pending invitation for this email address. Ask the operator for a new invite." };
    if (error.code === "23514") return { error: "Enter your full name." };
    return { error: "Could not save your profile. " + error.message };
  }
  redirect("/dashboard");
}
