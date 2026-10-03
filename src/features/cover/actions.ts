"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";
import { readyForAction } from "@/features/auth/ready-for-action";

export async function giveCover(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ready = await readyForAction();
  if ("error" in ready) return ready;
  const granteeId = String(formData.get("grantee_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const level = String(formData.get("level") ?? "cover");
  const endsAt = String(formData.get("ends_at") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/.test(granteeId)) return { error: "Choose a colleague from the search results." };
  if (clientId && !/^[0-9a-f-]{36}$/.test(clientId)) return { error: "That client reference is not valid." };
  if (level !== "cover" && level !== "view") return { error: "Choose an access level." };

  const me = ready.practitionerId;
  const supabase = await createClient();
  const { error } = await supabase.from("access_grant").insert({
    grantor_practitioner_id: me,
    grantee_type: "practitioner",
    grantee_id: granteeId,
    client_id: clientId || null,
    level,
    ends_at: endsAt ? new Date(endsAt + "T23:59:59").toISOString() : null,
    reason: reason || null,
    created_by: me,
  });
  if (error) {
    if (error.code === "42501") return { error: "That colleague cannot be given cover. Check she is active and not an operator account." };
    return { error: "Could not save the cover. " + error.message };
  }
  redirect("/cover");
}

export async function revokeCover(formData: FormData): Promise<void> {
  const ready = await readyForAction();
  if ("error" in ready) throw new Error(ready.error);
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid grant id");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("access_grant")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new Error("Could not revoke cover: " + error.message);
  if (!data || data.length === 0) throw new Error("That cover could not be revoked. Only the midwife who gave it can revoke it, and historical access cannot be revoked.");
  revalidatePath("/cover");
}
