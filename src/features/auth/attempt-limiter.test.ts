import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attemptLimiter } from "./attempt-limiter";

function fakeClient(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("attemptLimiter", () => {
  it("begins an attempt with the email, address and device token", async () => {
    const { client, rpc } = fakeClient({ data: true });
    expect(await attemptLimiter(client, "password", "her@example.nz", "203.0.113.1", "t".repeat(64)).begin()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("auth_attempt_begin", { p_kind: "password", p_email: "her@example.nz", p_ip: "203.0.113.1", p_device_token: "t".repeat(64) });
  });

  it("reports a refused attempt as false", async () => {
    const { client } = fakeClient({ data: false });
    expect(await attemptLimiter(client, "mfa", null, "203.0.113.1", null).begin()).toBe(false);
  });

  it("reports a failed check as null, never as allowed", async () => {
    const { client } = fakeClient({ error: { code: "57014", message: "timeout" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await attemptLimiter(client, "password", "her@example.nz", "203.0.113.1", null).begin()).toBeNull();
  });

  it("records a success for the same key", async () => {
    const { client, rpc } = fakeClient({});
    expect(await attemptLimiter(client, "mfa", null, "203.0.113.1", null).succeeded()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("auth_attempt_succeeded", { p_kind: "mfa", p_email: null, p_ip: "203.0.113.1" });
  });

  it("reports a success that could not be recorded", async () => {
    const { client } = fakeClient({ error: { code: "42501", message: "no" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await attemptLimiter(client, "password", "her@example.nz", "203.0.113.1", null).succeeded()).toBe(false);
  });
});
