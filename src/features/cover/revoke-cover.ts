"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { readyForAction } from "@/features/auth/ready-for-action";

const uuidShape = /^[0-9a-f-]{36}$/;
const notYourGrant = "That cover could not be revoked. Only the midwife who gave it can revoke it, and access from a client transfer cannot be revoked.";

// Ends a grant now. Returns null when the grant is revoked, including when it already was (a
// second tap, or another tab), because that is the outcome she asked for.
export async function revokeCover(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ready = await readyForAction();
  if ("error" in ready) return { error: ready.error };
  const id = String(formData.get("id") ?? "");
  if (!uuidShape.test(id)) return { error: "That cover could not be found. Reload the page and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("access_grant")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (error) return { error: await userMessage("revokeCover: update access_grant", error, { codes: { "42501": notYourGrant }, fallback: "Could not revoke the cover. Try again." }) };
  if (!data || data.length === 0) {
    const { data: row, error: readError } = await supabase.from("access_grant").select("revoked_at").eq("id", id).maybeSingle<{ revoked_at: string | null }>();
    if (readError) return { error: await userMessage("revokeCover: read access_grant", readError, { fallback: "Could not check the cover. Reload the page to see whether it was revoked." }) };
    if (!row?.revoked_at) {
      console.error("revokeCover: the update matched no row", { id });
      return { error: notYourGrant };
    }
  }
  revalidatePath("/cover");
  return null;
}
