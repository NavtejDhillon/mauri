import { cookies } from "next/headers";
import { deviceCookie } from "./device-cookie";

// This device's known-device token, or null when it has none.
export async function deviceToken(): Promise<string | null> {
  return (await cookies()).get(deviceCookie.name)?.value || null;
}
