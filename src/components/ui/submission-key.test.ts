import { describe, expect, it } from "vitest";
import { submissionKey } from "./submission-key";

describe("submissionKey", () => {
  it("is 0 before the first submission", () => {
    expect(submissionKey(null)).toBe(0);
  });

  it("is stable for one result and different for the next, even when the results look alike", () => {
    const first = { error: "Enter your full name." };
    const second = { error: "Enter your full name." };
    expect(submissionKey(first)).toBe(submissionKey(first));
    expect(submissionKey(second)).not.toBe(submissionKey(first));
    expect(submissionKey(first)).not.toBe(0);
  });
});
