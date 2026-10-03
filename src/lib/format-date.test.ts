import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("shows a date-only value as that calendar day, whatever the server's time zone", () => {
    expect(formatDate("1994-06-12")).toBe("12 June 1994");
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
    expect(formatDate("2025-12-31")).toBe("31 December 2025");
  });

  it("shows a timestamp as the day it falls on in New Zealand", () => {
    // 11:30 UTC on 10 October is 00:30 on 11 October in New Zealand (NZDT, UTC+13).
    expect(formatDate("2026-10-10T11:30:00Z")).toBe("11 October 2026");
    // One minute before New Zealand midnight.
    expect(formatDate("2026-10-10T10:59:00Z")).toBe("10 October 2026");
    // Winter (NZST, UTC+12): 12:00 UTC on 14 June is midnight on 15 June.
    expect(formatDate("2026-06-14T12:00:00Z")).toBe("15 June 2026");
    expect(formatDate("2026-06-14T11:59:59Z")).toBe("14 June 2026");
  });

  it("accepts a Date and timestamps with an offset", () => {
    expect(formatDate(new Date("2026-10-10T11:30:00Z"))).toBe("11 October 2026");
    expect(formatDate("2026-10-10T23:59:59+13:00")).toBe("10 October 2026");
  });

  it("shows a placeholder for a value that is not a date", () => {
    expect(formatDate("not a date")).toBe("-");
    expect(formatDate("2026-02-30")).toBe("-");
    expect(formatDate(new Date(Number.NaN))).toBe("-");
  });
});
