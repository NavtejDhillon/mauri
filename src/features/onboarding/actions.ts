"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { checkStep } from "@/features/auth/check-step";
import { verifyCode } from "@/features/auth/verify-code";
import { otpauthUri } from "./otpauth-uri";

// Only at the password step, that is while user_metadata.password_set is not true. Later
// password changes need their own flow that asks for the current password.
export async function setPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters.", field: "password" };
  if (password !== confirm) return { error: "The two passwords do not match.", field: "confirm" };
  const checked = await checkStep("/welcome/password");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
  if (error) return { error: await userMessage("setPassword: updateUser", error, { fallback: "Could not save that password. Try again." }) };
  redirect("/");
}

export type EnrolmentStart = { factorId: string; qrCode: string; secret: string; uri: string } | { error: string };

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
  // Her email names the account in the authenticator app.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) return { error: await userMessage("startEnrolment: getUser", userError, { fallback: "Could not start authenticator setup. Reload the page to try again." }) };
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Mauri" });
  if (error || !data) return { error: await userMessage("startEnrolment: enroll", error, { fallback: "Could not start authenticator setup. Reload the page to try again." }) };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: otpauthUri(data.totp.secret, userData.user.email) };
}

export async function completeEnrolment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!factorId || code.length !== 6) return { error: "Enter the 6 digit code shown in your authenticator app." };
  const checked = await checkStep("/welcome/mfa");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const message = await verifyCode(supabase, factorId, code, "enrol");
  if (message) return { error: message };
  redirect("/");
}

// Only at the profile step: signed in with MFA and no practitioner row yet.
export async function completeProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const values = {
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    midwifery_council_number: String(formData.get("midwifery_council_number") ?? ""),
    hpi_cpn: String(formData.get("hpi_cpn") ?? ""),
  };
  const fail = (error: string, field?: string): ActionResult => ({ error, field, values });
  const checked = await checkStep("/welcome/profile");
  if ("error" in checked) return fail(checked.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_full_name: values.full_name,
    p_phone: values.phone,
    p_midwifery_council_number: values.midwifery_council_number,
    p_hpi_cpn: values.hpi_cpn,
  });
  if (error) {
    // The function raises 42501 both for "no pending invite" and for a session below aal2.
    const noInvite = error.code === "42501" && error.message.includes("no pending invite");
    return fail(
      await userMessage("completeProfile: accept_invite", error, {
        codes: {
          "42501": noInvite ? "There is no pending invitation for this email address. Ask the operator for a new invite." : "Finish signing in first. Reload the page to carry on.",
          "23505": "Your profile is already set up. Reload the page to carry on.",
          "23514": "Enter your full name.",
        },
        fallback: "Could not save your profile. Try again.",
      }),
      error.code === "23514" ? "full_name" : undefined,
    );
  }
  redirect("/dashboard");
}
