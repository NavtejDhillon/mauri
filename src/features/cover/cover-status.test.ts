import { describe, expect, it } from "vitest";
import { activeCoverGiven } from "./active-cover-given";
import { coverStatus } from "./cover-status";
import type { GrantRow } from "./types";

const now = new Date("2026-10-19T10:30:00Z"); // 23:30 on 19 October in New Zealand
const me = "11111111-1111-1111-1111-111111111111";

function grant(overrides: Partial<GrantRow>): GrantRow {
  return {
    id: crypto.randomUUID(),
    grantor_practitioner_id: me,
    grantee_type: "practitioner",
    grantee_id: "22222222-2222-2222-2222-222222222222",
    client_id: null,
    level: "cover",
    kind: "standard",
    starts_at: "2026-10-01T00:00:00Z",
    ends_at: null,
    revoked_at: null,
    reason: null,
    ...overrides,
  };
}

describe("coverStatus", () => {
  it("is revoked once revoked, whatever the end date", () => {
    expect(coverStatus(grant({ revoked_at: "2026-10-10T00:00:00Z" }), now)).toBe("revoked");
    expect(coverStatus(grant({ revoked_at: "2026-10-10T00:00:00Z", ends_at: "2027-01-01T00:00:00Z" }), now)).toBe("revoked");
  });

  it("is active with no end date", () => {
    expect(coverStatus(grant({}), now)).toBe("active");
  });

  it("treats the end as exclusive, like the database", () => {
    // Ends at midnight starting 20 October in New Zealand: still active at 23:30 on the 19th.
    expect(coverStatus(grant({ ends_at: "2026-10-19T11:00:00Z" }), now)).toBe("active");
    expect(coverStatus(grant({ ends_at: "2026-10-19T11:00:00Z" }), new Date("2026-10-19T10:59:59.999Z"))).toBe("active");
    expect(coverStatus(grant({ ends_at: "2026-10-19T11:00:00Z" }), new Date("2026-10-19T11:00:00Z"))).toBe("ended");
  });

  it("is ended once the end has passed", () => {
    expect(coverStatus(grant({ ends_at: "2026-10-19T10:29:00Z" }), now)).toBe("ended");
  });
});

describe("activeCoverGiven", () => {
  it("counts standard grants she gave that are in force now", () => {
    const grants = [
      grant({}),
      grant({ ends_at: "2026-10-20T11:00:00Z" }),
      grant({ ends_at: "2026-10-18T11:00:00Z" }), // ended
      grant({ revoked_at: "2026-10-02T00:00:00Z" }), // revoked
      grant({ kind: "historical" }), // from a transfer, not cover she gave
      grant({ grantor_practitioner_id: "33333333-3333-3333-3333-333333333333", grantee_id: me }), // received
    ];
    expect(activeCoverGiven(grants, me, now)).toBe(2);
  });

  it("is 0 with no grants", () => {
    expect(activeCoverGiven([], me, now)).toBe(0);
  });
});
