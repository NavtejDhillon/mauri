"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { readyForAction } from "@/features/auth/ready-for-action";

export type SaveResult = ActionResult | { saved: true; values: Record<string, string> };

export async function saveProfile(_prev: SaveResult, formData: FormData): Promise<SaveResult> {
  const values = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    midwifery_council_number: String(formData.get("midwifery_council_number") ?? "").trim(),
    hpi_cpn: String(formData.get("hpi_cpn") ?? "").trim(),
  };
  const fail = (error: string, field?: string): ActionResult => ({ error, field, values });
  const ready = await readyForAction();
  if ("error" in ready) return fail(ready.error);
  if (values.full_name.length < 2) return fail("Enter your full name.", "full_name");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practitioner")
    .update({
      full_name: values.full_name,
      phone: values.phone || null,
      midwifery_council_number: values.midwifery_council_number || null,
      hpi_cpn: values.hpi_cpn || null,
    })
    // Her own row only, whatever the form posted.
    .eq("id", ready.practitionerId)
    .select("id");
  if (error) return fail(await userMessage("saveProfile: update practitioner", error, { fallback: "Could not save your details. Try again." }));
  if (!data || data.length === 0) {
    console.error("saveProfile: the update matched no row", { practitionerId: ready.practitionerId });
    return fail("Nothing was saved. Sign in again and retry.");
  }
  revalidatePath("/settings");
  return { saved: true, values };
}
