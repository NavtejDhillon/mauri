"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { verifyCode } from "./verify-code";

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
