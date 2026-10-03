"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { checkStep } from "@/features/auth/check-step";

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
