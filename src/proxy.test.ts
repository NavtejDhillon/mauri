import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({ env: { supabaseUrl: "https://db.example.invalid", supabaseAnonKey: "anon", siteUrl: "https://example.invalid" } }));

type CookieAdapter = { setAll: (c: { name: string; value: string; options: object }[]) => void };
const fake = { user: null as { id: string } | null, refresh: false };

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
    auth: {
      getUser: async () => {
        if (fake.refresh) options.cookies.setAll([{ name: "sb-x-auth-token", value: "new", options: { path: "/", httpOnly: true } }]);
        return { data: { user: fake.user }, error: null };
      },
    },
  }),
}));

const { proxy, config } = await import("./proxy");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function get(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "https://mauri.example.invalid"), { headers });
}

beforeEach(() => {
  fake.user = null;
  fake.refresh = false;
});

describe("proxy", () => {
  it("replaces a request id sent by the browser with its own", async () => {
    fake.user = { id: "u1" };
    const res = await proxy(get("/clients", { "x-mauri-request-id": "forged" }));
    const forwarded = res.headers.get("x-middleware-request-x-mauri-request-id");
    expect(forwarded).toMatch(uuid);
    expect(forwarded).not.toBe("forged");
  });

  it("passes a nonce'd Content-Security-Policy to the page and the browser", async () => {
    fake.user = { id: "u1" };
    const res = await proxy(get("/dashboard"));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/);
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });

  it("sends an anonymous visitor on a private page to sign in", async () => {
    const res = await proxy(get("/clients"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets an anonymous visitor reach the public pages", async () => {
    for (const path of ["/login", "/auth/confirm"]) {
      const res = await proxy(get(path));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("keeps refreshed session cookies on a redirect", async () => {
    fake.user = { id: "u1" };
    fake.refresh = true;
    const res = await proxy(get("/login"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(res.headers.get("set-cookie")).toContain("sb-x-auth-token=new");
  });

  it("passes refreshed cookies on to the page", async () => {
    fake.user = { id: "u1" };
    fake.refresh = true;
    const res = await proxy(get("/clients", { cookie: "sb-x-auth-token=old" }));
    expect(res.headers.get("x-middleware-request-cookie")).toContain("sb-x-auth-token=new");
    expect(res.headers.get("set-cookie")).toContain("sb-x-auth-token=new");
  });

  it("does not run for the service worker or static files, only for pages", () => {
    const runs = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);
    expect(runs("/sw.js")).toBe(false);
    expect(runs("/_next/static/chunks/app.js")).toBe(false);
    expect(runs("/manifest.json")).toBe(false);
    expect(runs("/clients")).toBe(true);
    expect(runs("/login")).toBe(true);
  });
});
