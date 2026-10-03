"use server";

import { createClient } from "@/lib/supabase/server";
import { userMessage } from "@/lib/user-message";
import { checkStep } from "@/features/auth/check-step";
import type { EnrolmentStart } from "./enrolment-start";
import { otpauthUri } from "./otpauth-uri";

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
