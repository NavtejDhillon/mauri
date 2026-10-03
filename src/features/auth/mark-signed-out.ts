import { cookies } from "next/headers";
import { signedOutCookie } from "@/lib/signed-out-cookie";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

// Called after a successful sign-out, so the next response tells the browser to clear this
// site's cache and storage (see signedOutCookie).
export async function markSignedOut(): Promise<void> {
  (await cookies()).set(signedOutCookie.name, "1", { ...sessionCookieOptions, maxAge: signedOutCookie.maxAgeSeconds });
}
