"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/auth/actions";
import { readyForAction } from "@/features/auth/ready-for-action";

export async function createClientRecord(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ready = await readyForAction();
  if ("error" in ready) return ready;
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const nhi = String(formData.get("nhi") ?? "").trim().toUpperCase();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
  if (!firstName || !lastName) return { error: "First name and surname are required." };
  if (nhi && !/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9]{2}[A-Z]{2}$/.test(nhi)) return { error: "An NHI number is three letters followed by four digits, or three letters, two digits and two letters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .insert({
      owner_practitioner_id: ready.practitionerId,
      first_name: firstName,
      last_name: lastName,
      preferred_name: preferredName || null,
      nhi: nhi || null,
      date_of_birth: dateOfBirth || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Could not save the client. " + (error?.message ?? "") };
  redirect(`/clients/${data.id}`);
}
