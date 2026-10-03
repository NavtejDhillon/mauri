import type { GrantRow } from "./types";

export type CoverStatus = "active" | "ended" | "revoked";

// Whether a grant gives access now, matching the database's rule: access lasts while it is not
// revoked and now() < ends_at (an exclusive end; null means until revoked). Used by the cover
// list and the dashboard so the two always agree.
export function coverStatus(grant: Pick<GrantRow, "revoked_at" | "ends_at">, now: Date): CoverStatus {
  if (grant.revoked_at) return "revoked";
  if (grant.ends_at && new Date(grant.ends_at).getTime() <= now.getTime()) return "ended";
  return "active";
}
