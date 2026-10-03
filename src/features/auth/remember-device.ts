import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deviceCookie } from "./device-cookie";
import { deviceToken } from "./device-token";

// Called once she has completed MFA (the client's session is aal2): gives this device a fresh
// random token, registers its hash for her account, replacing the device's previous token, and
// stores the token in the device cookie. A failure is logged and otherwise ignored: the device
// simply stays unknown, and her sign-in is not held up by it.
export async function rememberDevice(supabase: SupabaseClient): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const { error } = await supabase.rpc("known_device_register", { p_token: token, p_previous_token: await deviceToken() });
  if (error) {
    console.error("rememberDevice: known_device_register failed", error);
    return;
  }
  (await cookies()).set(deviceCookie.name, token, { ...deviceCookie.options, maxAge: deviceCookie.maxAgeSeconds });
}
