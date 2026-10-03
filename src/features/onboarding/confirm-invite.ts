"use server";

import { isAuthApiError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { serviceProblem } from "@/features/auth/service-problem";

// Exchanges the one-time token in an invite link for a session. Runs only when the person
// presses Continue (a POST), so link previews and mail scanners cannot use the token up.
// Only invite links are accepted.
export async function confirmInvite(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  const invalid = "That invitation link is not valid or has expired. Ask for a new one.";
  if (!tokenHash || type !== "invite") return { error: invalid };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
  if (error) {
    console.error("confirmInvite: verifyOtp failed", error);
    return { error: isAuthApiError(error) && error.status < 500 ? invalid : serviceProblem };
  }
  redirect("/");
}
