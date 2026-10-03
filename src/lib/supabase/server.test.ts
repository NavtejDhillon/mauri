import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { supabaseUrl: "https://db.example.invalid", supabaseAnonKey: "anon", mauriGatewayKey: "gateway-secret" } }));

const requestIdValue = "0b9c7a52-6a4e-4f1e-9d2b-3c1f2e4a5b6c";
vi.mock("@/lib/request-id", () => ({ requestId: async () => requestIdValue }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));

type ClientOptions = { global?: { headers?: Record<string, string> } };
const seen: { url?: string; key?: string; options?: ClientOptions } = {};

vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string, options: ClientOptions) => {
    Object.assign(seen, { url, key, options });
    return {};
  },
}));

const { createClient } = await import("./server");

describe("createClient", () => {
  it("sends the gateway key and the request id with every call to the database API", async () => {
    await createClient();
    expect(seen.url).toBe("https://db.example.invalid");
    expect(seen.key).toBe("anon");
    expect(seen.options?.global?.headers).toEqual({ "x-mauri-gateway-key": "gateway-secret", "x-mauri-request-id": requestIdValue });
  });
});
