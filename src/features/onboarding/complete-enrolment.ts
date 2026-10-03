"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { checkStep } from "@/features/auth/check-step";
import { verifyCode } from "@/features/auth/verify-code";

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
