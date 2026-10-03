import { describe, expect, it } from "vitest";
import { formatLastDay } from "./format-last-day";
import { nzEndOfDay } from "./nz-end-of-day";

describe("formatLastDay", () => {
  it("shows the day she chose, not the midnight after it", () => {
    expect(formatLastDay("2026-10-19T11:00:00.000Z")).toBe("19 October 2026");
    expect(formatLastDay(new Date("2026-06-14T12:00:00.000Z"))).toBe("14 June 2026");
  });

  it("round-trips through nzEndOfDay on both sides of each daylight saving change", () => {
    for (const day of ["2026-04-04", "2026-04-05", "2026-04-06", "2026-09-26", "2026-09-27", "2026-09-28", "2026-12-31"]) {
      const [y, m, d] = day.split("-").map(Number);
      const expected = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
      expect(formatLastDay(nzEndOfDay(day)!)).toBe(expected);
    }
  });

  it("shows a placeholder for a value that is not a date", () => {
    expect(formatLastDay("soon")).toBe("-");
  });
});
