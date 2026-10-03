import { describe, expect, it } from "vitest";
import { stepRefusal } from "./step-refusal";

describe("stepRefusal", () => {
  it("allows an action at its own step", () => {
    expect(stepRefusal("/welcome/mfa", "/welcome/mfa")).toBeNull();
    expect(stepRefusal(null, null)).toBeNull();
  });
  it("asks a signed-out person to sign in again", () => {
    expect(stepRefusal("/welcome/password", "/login")).toMatch(/Sign in again/);
    expect(stepRefusal(null, "/login")).toMatch(/Sign in again/);
  });
  it("says a step is done once the person has moved past it", () => {
    expect(stepRefusal("/welcome/password", "/welcome/mfa")).toMatch(/already done/);
    expect(stepRefusal("/welcome/mfa", "/mfa")).toMatch(/already done/);
    expect(stepRefusal("/welcome/profile", null)).toMatch(/already done/);
  });
  it("refuses a later step, or the app, until the earlier steps are done", () => {
    expect(stepRefusal("/welcome/profile", "/welcome/mfa")).toMatch(/Finish signing in/);
    expect(stepRefusal(null, "/mfa")).toMatch(/Finish signing in/);
    expect(stepRefusal(null, "/welcome/profile")).toMatch(/Finish signing in/);
  });
});
