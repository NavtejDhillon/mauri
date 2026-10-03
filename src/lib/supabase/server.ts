import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { gatewayKeyHeader } from "@/lib/gateway-key-header";
import { requestId } from "@/lib/request-id";
import { requestIdHeader } from "@/lib/request-id-header";
import { sessionCookieOptions } from "./cookie-options";

// A Supabase client bound to the current request's session cookie.
// Every query it makes runs under the midwife's own database role and policies, carries
// the request id so write audit events record it, and carries the gateway key the reverse
// proxy in front of the database API requires.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: sessionCookieOptions,
    global: { headers: { [requestIdHeader]: await requestId(), [gatewayKeyHeader]: env.mauriGatewayKey } },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only. The proxy refreshes sessions.
        }
      },
    },
  });
}
