import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { getAuthState } from "./state";

type Fake = {
  user?: unknown;
  userError?: unknown;
  factors?: { all: unknown[]; totp: unknown[] };
  factorsError?: unknown;
  level?: string | null;
  levelError?: unknown;
  practitioner?: { id: string } | null;
  practitionerError?: unknown;
};

function fakeClient(f: Fake) {
  const maybeSingle = vi.fn(async () => ({ data: f.practitioner ?? null, error: f.practitionerError ?? null }));
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  const client = {
    auth: {
      getUser: async () => ({ data: { user: f.userError ? null : (f.user ?? null) }, error: f.userError ?? null }),
      mfa: {
        listFactors: async () =>
          f.factorsError ? { data: null, error: f.factorsError } : { data: f.factors ?? { all: [], totp: [] }, error: null },
        getAuthenticatorAssuranceLevel: async () =>
          f.levelError ? { data: null, error: f.levelError } : { data: { currentLevel: f.level ?? "aal1" }, error: null },
      },
    },
    from,
  };
  return { client: client as unknown as SupabaseClient, from };
}

const user = { id: "u1", user_metadata: { password_set: true } };
const verified = { id: "f1", status: "verified", factor_type: "totp" };

describe("getAuthState", () => {
  it("reports a visitor with no session as signed out", async () => {
    const { client } = fakeClient({ userError: new AuthSessionMissingError() });
    expect((await getAuthState(client)).signedIn).toBe(false);
  });

  it("reports a revoked session as signed out", async () => {
    const { client } = fakeClient({ userError: new AuthApiError("gone", 403, "session_expired") });
    expect((await getAuthState(client)).signedIn).toBe(false);
  });

  it("throws when the auth service cannot be reached", async () => {
    const { client } = fakeClient({ userError: new AuthRetryableFetchError("down", 0) });
    await expect(getAuthState(client)).rejects.toThrow(/Could not check your sign-in/);
  });

  it("throws when the factors cannot be listed", async () => {
    const { client } = fakeClient({ user, factorsError: new AuthApiError("boom", 500, "unexpected_failure") });
    await expect(getAuthState(client)).rejects.toThrow(/authenticator settings/);
  });

  it("throws when the assurance level cannot be read", async () => {
    const { client } = fakeClient({ user, levelError: new AuthApiError("boom", 500, "unexpected_failure") });
    await expect(getAuthState(client)).rejects.toThrow(/sign-in level/);
  });

  it("throws when the practitioner lookup fails at aal2", async () => {
    const { client } = fakeClient({ user, factors: { all: [verified], totp: [verified] }, level: "aal2", practitionerError: { message: "db down" } });
    await expect(getAuthState(client)).rejects.toThrow(/practitioner record/);
  });

  it("does not look for the practitioner row below aal2", async () => {
    const { client, from } = fakeClient({ user, factors: { all: [verified], totp: [verified] }, level: "aal1" });
    const state = await getAuthState(client);
    expect(from).not.toHaveBeenCalled();
    expect(state).toMatchObject({ signedIn: true, currentLevel: "aal1", hasPractitioner: false, practitionerId: null });
  });

  it("returns the practitioner id at aal2", async () => {
    const { client } = fakeClient({ user, factors: { all: [verified], totp: [verified] }, level: "aal2", practitioner: { id: "p1" } });
    expect(await getAuthState(client)).toMatchObject({ currentLevel: "aal2", hasVerifiedFactor: true, hasPractitioner: true, practitionerId: "p1" });
  });

  it("does not count an unverified factor", async () => {
    const pending = { id: "f2", status: "unverified", factor_type: "totp" };
    const { client } = fakeClient({ user, factors: { all: [pending], totp: [] } });
    expect((await getAuthState(client)).hasVerifiedFactor).toBe(false);
  });

  it("only treats password_set true as set", async () => {
    const { client } = fakeClient({ user: { id: "u1", user_metadata: { password_set: "true" } } });
    expect((await getAuthState(client)).passwordSet).toBe(false);
  });
});
