"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { markSignedOut } from "./mark-signed-out";

// "Sign out" from the MFA and welcome steps: ends the session on this device only.
export async function signOutHere(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error("signOutHere: sign-out failed", error);
    return { error: "Could not sign you out. Try again." };
  }
  await markSignedOut();
  redirect("/login");
}
