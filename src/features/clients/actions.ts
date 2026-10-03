"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { readyForAction } from "@/features/auth/ready-for-action";
import { checkNhi } from "./nhi";

export async function createClientRecord(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const values = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    preferred_name: String(formData.get("preferred_name") ?? "").trim(),
    nhi: String(formData.get("nhi") ?? "").replace(/\s+/g, "").toUpperCase(),
    date_of_birth: String(formData.get("date_of_birth") ?? "").trim(),
  };
  const fail = (error: string, field?: string): ActionResult => ({ error, field, values });
  const ready = await readyForAction();
  if ("error" in ready) return fail(ready.error);
  if (!values.first_name) return fail("Enter her first name.", "first_name");
  if (!values.last_name) return fail("Enter her surname.", "last_name");
  if (values.nhi) {
    const nhi = checkNhi(values.nhi);
    if (nhi === "shape") return fail("An NHI number is 7 characters: three letters and four digits, or three letters, two digits and two letters. It never uses the letters I or O.", "nhi");
    if (nhi === "check") return fail("That NHI number does not pass its check. One of the characters is probably mistyped; check it against her records.", "nhi");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .insert({
      owner_practitioner_id: ready.practitionerId,
      first_name: values.first_name,
      last_name: values.last_name,
      preferred_name: values.preferred_name || null,
      nhi: values.nhi || null,
      date_of_birth: values.date_of_birth || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return fail(await userMessage("createClientRecord: insert client", error, { fallback: "Could not save the client. Try again." }));
  redirect(`/clients/${data.id}`);
}
