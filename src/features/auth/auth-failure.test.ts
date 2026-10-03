import { describe, expect, it } from "vitest";
import { describeAuthFailure } from "./auth-failure";
import { tooManyAttempts } from "./too-many-attempts";

describe("describeAuthFailure", () => {
  it("reports a wrong password only for invalid_credentials", () => {
    expect(describeAuthFailure("password", { code: "invalid_credentials", status: 400 })).toEqual({ message: "Email or password is incorrect.", counts: true });
  });
  it("reports a wrong code only for mfa_verification_failed", () => {
    expect(describeAuthFailure("mfa", { code: "mfa_verification_failed", status: 422 })).toMatchObject({ counts: true, message: expect.stringMatching(/code was not accepted/) });
    expect(describeAuthFailure("enrol", { code: "mfa_verification_failed", status: 422 })).toMatchObject({ counts: true, message: expect.stringMatching(/time on your phone/) });
  });
  it("maps the auth service's rate limit to the too-many-attempts message", () => {
    expect(describeAuthFailure("password", { code: "over_request_rate_limit", status: 429 })).toEqual({ message: tooManyAttempts, counts: false });
    expect(describeAuthFailure("mfa", { status: 429 })).toEqual({ message: tooManyAttempts, counts: false });
  });
  it("does not call an outage a wrong password or code", () => {
    for (const kind of ["password", "mfa", "enrol"] as const) {
      const failure = describeAuthFailure(kind, { status: 0 });
      expect(failure.counts).toBe(false);
      expect(failure.message).toMatch(/Try again shortly/);
    }
    expect(describeAuthFailure("password", { code: "mfa_verification_failed", status: 422 }).counts).toBe(false);
  });
  it("asks for the next code when the challenge expired", () => {
    expect(describeAuthFailure("mfa", { code: "mfa_challenge_expired", status: 422 })).toMatchObject({ counts: false, message: expect.stringMatching(/next code/) });
  });
});
