"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { markSignedOut } from "./mark-signed-out";
import { readyForAction } from "./ready-for-action";

// "Sign out everywhere" from settings: ends every session for this account. Needs a fully
// signed-in session, so a password alone cannot sign the midwife out of her other devices.
export async function signOut(): Promise<ActionResult> {
  const ready = await readyForAction();
  if ("error" in ready) return ready;
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    console.error("signOut: global sign-out failed", error);
    return { error: "Could not sign you out everywhere. Try again." };
  }
  await markSignedOut();
  redirect("/login");
}
