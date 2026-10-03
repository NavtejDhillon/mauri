"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";

export type SaveResult = ActionResult | { saved: true };

export async function saveProfile(_prev: SaveResult, formData: FormData): Promise<SaveResult> {
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
    .eq("id", String(formData.get("id") ?? ""))
    .select("id");
  if (error) return { error: "Could not save your profile. " + error.message };
  if (!data || data.length === 0) return { error: "Nothing was saved. Sign in again and retry." };
  revalidatePath("/settings");
  return { saved: true };
}
