import { describe, expect, it } from "vitest";
import { isGrantWindowViolation } from "./grant-window-violation";

describe("isGrantWindowViolation", () => {
  it("recognises the access_grant_window check", () => {
    expect(isGrantWindowViolation({ code: "23514", message: 'new row for relation "access_grant" violates check constraint "access_grant_window"' })).toBe(true);
  });
  it("does not treat another check on access_grant as a past date", () => {
    expect(isGrantWindowViolation({ code: "23514", message: 'new row for relation "access_grant" violates check constraint "access_grant_level_check"' })).toBe(false);
  });
  it("needs the check violation code", () => {
    expect(isGrantWindowViolation({ code: "42501", message: "access_grant_window" })).toBe(false);
    expect(isGrantWindowViolation(null)).toBe(false);
  });
});
