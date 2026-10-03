import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { contentSecurityPolicy } from "@/lib/content-security-policy";
import { requestIdHeader } from "@/lib/request-id-header";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

const publicPaths = ["/login", "/auth/confirm"];

function isPublic(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// On every request: stamps a fresh request id (never trusting one the browser sent), sets the
// Content-Security-Policy with a fresh script nonce, refreshes the session cookie, and keeps
// anonymous visitors on public pages. Onboarding and MFA steps are decided by the pages.
export async function proxy(request: NextRequest) {
  const id = crypto.randomUUID();
  const csp = contentSecurityPolicy(btoa(crypto.randomUUID()), process.env.NODE_ENV === "development");
  const forwarded = new Headers(request.headers);
  forwarded.set(requestIdHeader, id);
  // Next.js reads the nonce for its own scripts from the request's CSP header.
  forwarded.set("content-security-policy", csp);

  const next = () => {
    const r = NextResponse.next({ request: { headers: forwarded } });
    r.headers.set("content-security-policy", csp);
    r.headers.set(requestIdHeader, id);
    return r;
  };
  let response = next();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Pass the refreshed cookies on to the page as well as back to the browser.
        forwarded.set("cookie", request.headers.get("cookie") ?? "");
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // A redirect must carry any cookies the session refresh just set, or the browser keeps a
  // refresh token that the auth service has already rotated.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && !isPublic(pathname)) return redirectTo("/login");
  if (user && pathname === "/login") return redirectTo("/");
  return response;
}

// Static files skip the proxy. /sw.js must: a signed-out device checking for a service
// worker update would otherwise be redirected to /login, the check would fail and the old
// worker would stay installed.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
