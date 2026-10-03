import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/request-id", () => ({ requestId: async () => "11111111-2222-3333-4444-555555555555" }));

const { userMessage } = await import("./user-message");

let logged: unknown[][] = [];
beforeEach(() => {
  logged = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });
});
afterEach(() => vi.restoreAllMocks());

const raw = 'new row violates row-level security policy for table "client"';

describe("userMessage", () => {
  it("never shows the raw error text", async () => {
    const message = await userMessage("createClient", { code: "42501", message: raw });
    expect(message).not.toContain("row-level security");
    expect(message).toMatch(/permission/);
  });

  it("logs the raw error and the request id on the server", async () => {
    const error = { code: "42501", message: raw };
    await userMessage("createClient", error);
    expect(logged).toHaveLength(1);
    expect(String(logged[0][0])).toContain("createClient");
    expect(String(logged[0][0])).toContain("11111111-2222-3333-4444-555555555555");
    expect(logged[0][1]).toBe(error);
  });

  it("maps database codes to calm messages", async () => {
    expect(await userMessage("x", { code: "23505" })).toMatch(/already/);
    expect(await userMessage("x", { code: "23514" })).toMatch(/Check/);
    expect(await userMessage("x", { code: "22007" })).toMatch(/format/);
    expect(await userMessage("x", { code: "22P02" })).toMatch(/format/);
    expect(await userMessage("x", { code: "PGRST301" })).toMatch(/Sign in again/);
  });

  it("maps auth service codes to calm messages", async () => {
    expect(await userMessage("x", { code: "weak_password", status: 422 })).toMatch(/password/i);
    expect(await userMessage("x", { code: "same_password", status: 422 })).toMatch(/different/);
    expect(await userMessage("x", { code: "insufficient_aal", status: 403 })).toMatch(/authenticator/);
    expect(await userMessage("x", { code: "mfa_factor_name_conflict", status: 422 })).toMatch(/Reload the page/);
    expect(await userMessage("x", { code: "session_not_found", status: 403 })).toMatch(/Sign in again/);
    expect(await userMessage("x", { code: "over_request_rate_limit", status: 429 })).toMatch(/Wait/);
    expect(await userMessage("x", { status: 429 })).toMatch(/Wait/);
  });

  it("reports an outage or a dropped connection as a service problem", async () => {
    expect(await userMessage("x", { status: 503 })).toMatch(/Try again shortly/);
    expect(await userMessage("x", { status: 0, name: "AuthRetryableFetchError" })).toMatch(/Try again shortly/);
    expect(await userMessage("x", new TypeError("fetch failed"))).toMatch(/Try again shortly/);
  });

  it("prefers the caller's message for a code, then the caller's fallback", async () => {
    expect(await userMessage("x", { code: "23514" }, { codes: { "23514": "The end date cannot be in the past." } })).toBe("The end date cannot be in the past.");
    expect(await userMessage("x", { code: "XX000" }, { fallback: "Could not save the client. Try again." })).toBe("Could not save the client. Try again.");
  });

  it("falls back to a general message for anything unknown, including no error at all", async () => {
    for (const error of [{ code: "XX000", message: "internal" }, null, undefined, "boom"]) {
      const message = await userMessage("x", error);
      expect(message).toMatch(/Something went wrong/);
      expect(message).not.toMatch(/internal|boom/);
    }
  });

  it("uses plain punctuation only", async () => {
    for (const code of ["23505", "23514", "23502", "23503", "22001", "22007", "42501", "PGRST301", "57014", "weak_password", "same_password", "insufficient_aal", "mfa_factor_name_conflict", "mfa_factor_not_found", "otp_expired", "over_request_rate_limit"]) {
      expect(await userMessage("x", { code })).not.toMatch(/[–—]/);
    }
  });
});
