import { describe, expect, it } from "vitest";
import { nzToday } from "./nz-today";

describe("nzToday", () => {
  it("gives the New Zealand date, which is often a day ahead of UTC", () => {
    // 11:30 UTC on 10 October is 00:30 on 11 October in New Zealand (NZDT).
    expect(nzToday(new Date("2026-10-10T11:30:00Z"))).toBe("2026-10-11");
    expect(nzToday(new Date("2026-10-10T10:59:59Z"))).toBe("2026-10-10");
  });

  it("follows standard time in winter", () => {
    expect(nzToday(new Date("2026-06-14T11:59:59Z"))).toBe("2026-06-14");
    expect(nzToday(new Date("2026-06-14T12:00:00Z"))).toBe("2026-06-15");
  });

  it("pads the month and day", () => {
    expect(nzToday(new Date("2026-01-04T00:00:00Z"))).toBe("2026-01-04");
  });
});
