import { coverStatus } from "./cover-status";
import type { GrantRow } from "./types";

// The number of cover grants she has given that are in force now. Historical grants are left
// out: a client transfer creates them with the new owner as grantor, but they record the
// previous midwife's access, not cover she chose to give.
export function activeCoverGiven(grants: GrantRow[], me: string, now: Date): number {
  return grants.filter((g) => g.grantor_practitioner_id === me && g.kind === "standard" && coverStatus(g, now) === "active").length;
}
