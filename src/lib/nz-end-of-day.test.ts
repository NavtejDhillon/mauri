import { describe, expect, it } from "vitest";
import { nzEndOfDay } from "./nz-end-of-day";

const iso = (date: string) => nzEndOfDay(date)?.toISOString();

describe("nzEndOfDay", () => {
  it("ends a summer day at the following New Zealand midnight (NZDT, UTC+13)", () => {
    // 00:00 on 20 October 2026 in New Zealand is 11:00 UTC on 19 October.
    expect(iso("2026-10-19")).toBe("2026-10-19T11:00:00.000Z");
    expect(iso("2026-12-31")).toBe("2026-12-31T11:00:00.000Z");
  });

  it("ends a winter day at the following New Zealand midnight (NZST, UTC+12)", () => {
    expect(iso("2026-06-14")).toBe("2026-06-14T12:00:00.000Z");
  });

  it("handles the April change from daylight time to standard time", () => {
    // Daylight time ends at 3am on Sunday 5 April 2026, which makes that day 25 hours long.
    expect(iso("2026-04-04")).toBe("2026-04-04T11:00:00.000Z"); // midnight starting 5 April, still NZDT
    expect(iso("2026-04-05")).toBe("2026-04-05T12:00:00.000Z"); // midnight starting 6 April, NZST
    const day = nzEndOfDay("2026-04-05")!.getTime() - nzEndOfDay("2026-04-04")!.getTime();
    expect(day).toBe(25 * 3600 * 1000);
  });

  it("handles the September change from standard time to daylight time", () => {
    // Daylight time starts at 2am on Sunday 27 September 2026, which makes that day 23 hours long.
    expect(iso("2026-09-26")).toBe("2026-09-26T12:00:00.000Z"); // midnight starting 27 September, NZST
    expect(iso("2026-09-27")).toBe("2026-09-27T11:00:00.000Z"); // midnight starting 28 September, NZDT
    const day = nzEndOfDay("2026-09-27")!.getTime() - nzEndOfDay("2026-09-26")!.getTime();
    expect(day).toBe(23 * 3600 * 1000);
  });

  it("rolls over months and years", () => {
    expect(iso("2026-02-28")).toBe("2026-02-28T11:00:00.000Z");
    expect(iso("2028-02-29")).toBe("2028-02-29T11:00:00.000Z");
  });

  it("returns null for a malformed or impossible date instead of throwing", () => {
    for (const bad of ["", "2026-13-01", "2026-02-30", "2027-02-29", "19/10/2026", "2026-10-19T00:00", "abc", "0050-01-01"]) {
      expect(nzEndOfDay(bad)).toBeNull();
    }
  });
});
