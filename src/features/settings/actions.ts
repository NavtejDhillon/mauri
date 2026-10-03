"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";
import { readyForAction } from "@/features/auth/ready-for-action";

export type SaveResult = ActionResult | { saved: true };

export async function saveProfile(_prev: SaveResult, formData: FormData): Promise<SaveResult> {
  const ready = await readyForAction();
  if ("error" in ready) return ready;
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2) return { error: "Enter your full name." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practitioner")
    .update({
      full_name: fullName,
      phone: String(formData.get("phone") ?? "").trim() || null,
      midwifery_council_number: String(formData.get("midwifery_council_number") ?? "").trim() || null,
      hpi_cpn: String(formData.get("hpi_cpn") ?? "").trim() || null,
    })
    // Her own row only, whatever the form posted.
    .eq("id", ready.practitionerId)
    .select("id");
  if (error) return { error: "Could not save your profile. " + error.message };
  if (!data || data.length === 0) return { error: "Nothing was saved. Sign in again and retry." };
  revalidatePath("/settings");
  return { saved: true };
}
