"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { checkStep } from "@/features/auth/check-step";

// Only at the password step, that is while the account's password_is_set flag is not set.
// Later password changes need their own flow that asks for the current password. The flag is
// set once in the database (mark_password_set) and nothing can clear it.
export async function setPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters.", field: "password" };
  if (password !== confirm) return { error: "The two passwords do not match.", field: "confirm" };
  const checked = await checkStep("/welcome/password");
  if ("error" in checked) return checked;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  // same_password: this is already her password, saved by an earlier try whose flag was not.
  if (error && error.code !== "same_password") return { error: await userMessage("setPassword: updateUser", error, { fallback: "Could not save that password. Try again." }) };
  // The password is saved; until the flag is too she stays at this step and can enter it again.
  const { error: markError } = await supabase.rpc("mark_password_set");
  if (markError) return { error: await userMessage("setPassword: mark_password_set", markError, { fallback: "Your password was saved, but we could not finish this step. Enter it again to carry on." }) };
  redirect("/");
}
