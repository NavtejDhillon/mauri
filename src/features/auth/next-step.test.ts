import { describe, expect, it } from "vitest";
import { nextStepFor, type AuthState } from "./next-step";

const ready: AuthState = {
  signedIn: true,
  passwordSet: true,
  hasVerifiedFactor: true,
  currentLevel: "aal2",
  hasPractitioner: true,
};

describe("nextStepFor", () => {
  it("sends anonymous visitors to sign in", () => {
    expect(nextStepFor({ ...ready, signedIn: false })).toBe("/login");
  });
  it("asks an invited user to set a password first", () => {
    expect(nextStepFor({ ...ready, passwordSet: false, hasVerifiedFactor: false, currentLevel: "aal1", hasPractitioner: false })).toBe("/welcome/password");
  });
  it("then asks her to enrol MFA", () => {
    expect(nextStepFor({ ...ready, hasVerifiedFactor: false, currentLevel: "aal1", hasPractitioner: false })).toBe("/welcome/mfa");
  });
  it("challenges a returning user who has a factor but has not passed it this session", () => {
    expect(nextStepFor({ ...ready, currentLevel: "aal1" })).toBe("/mfa");
  });
  it("asks for the profile once MFA has passed and no practitioner row exists", () => {
    expect(nextStepFor({ ...ready, hasPractitioner: false })).toBe("/welcome/profile");
  });
  it("returns null when fully onboarded", () => {
    expect(nextStepFor(ready)).toBeNull();
  });
});
