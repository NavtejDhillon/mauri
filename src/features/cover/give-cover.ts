"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { userMessage } from "@/lib/user-message";
import { nzEndOfDay } from "@/lib/nz-end-of-day";
import { nzToday } from "@/lib/nz-today";
import { readyForAction } from "@/features/auth/ready-for-action";
import { isGrantWindowViolation } from "./grant-window-violation";

const uuidShape = /^[0-9a-f-]{36}$/;
const pastEnd = "The last day of cover cannot be in the past. Choose today or a later date.";

export async function giveCover(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const granteeId = String(formData.get("grantee_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const level = String(formData.get("level") ?? "cover");
  const endsOn = String(formData.get("ends_at") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  // Sent back with any error so the form keeps her choices; the colleague box keeps its own.
  const values = { client_id: clientId, level, ends_at: endsOn, reason };
  const fail = (error: string, field?: string): ActionResult => ({ error, field, values });
  const ready = await readyForAction();
  if ("error" in ready) return fail(ready.error);
  if (!uuidShape.test(granteeId)) return fail("Choose a colleague from the search results.", "grantee_id");
  if (clientId && !uuidShape.test(clientId)) return fail("Choose one of your clients, or your whole caseload.", "client_id");
  if (level !== "cover" && level !== "view") return fail("Choose an access level.", "level");

  // The chosen day is a New Zealand calendar day; cover lasts to the end of it, whatever time
  // zone the server runs in. Stored as an exclusive end: midnight at the start of the next day.
  let endsAt: string | null = null;
  if (endsOn) {
    const end = nzEndOfDay(endsOn);
    if (!end) return fail("Enter the last day of cover as a date, or leave it empty.", "ends_at");
    if (endsOn < nzToday()) return fail(pastEnd, "ends_at");
    endsAt = end.toISOString();
  }

  const me = ready.practitionerId;
  if (granteeId === me) return fail("You cannot give cover to yourself. Choose a colleague.", "grantee_id");
  const supabase = await createClient();

  // The database refuses both cases below with the same permission error, so each is checked
  // first to tell her which choice to change.
  if (clientId) {
    const { data: owned, error } = await supabase.from("client").select("id").eq("id", clientId).eq("owner_practitioner_id", me).is("deleted_at", null).maybeSingle();
    if (error) return fail(await userMessage("giveCover: check client owner", error, { fallback: "Could not check that client. Try again." }));
    if (!owned) return fail("You can only give cover for your own clients. Choose one of them, or your whole caseload.", "client_id");
  }
  const { data: grantable, error: colleagueError } = await supabase.rpc("is_grantable_practitioner", { p_practitioner_id: granteeId });
  if (colleagueError) return fail(await userMessage("giveCover: check colleague", colleagueError, { fallback: "Could not check that colleague. Try again." }));
  if (grantable !== true) return fail("That colleague cannot be given cover. Check she is active and not an operator account.", "grantee_id");

  const { error } = await supabase.from("access_grant").insert({
    grantor_practitioner_id: me,
    grantee_type: "practitioner",
    grantee_id: granteeId,
    client_id: clientId || null,
    level,
    ends_at: endsAt,
    reason: reason || null,
    created_by: me,
  });
  if (error) {
    // Only the access_grant_window check means the end was not after the start (now); any other
    // check failure gets the general message.
    const pastDate = isGrantWindowViolation(error);
    return fail(
      await userMessage("giveCover: insert access_grant", error, { codes: pastDate ? { "23514": pastEnd } : {}, fallback: "Could not save the cover. Try again." }),
      pastDate ? "ends_at" : undefined,
    );
  }
  redirect("/cover");
}
