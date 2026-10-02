// Relations in the public schema that anon is intentionally allowed to read.
// Every entry needs a reason and a reviewer. Empty is the expected state for Mauri.
export const publicReadAllowlist: { relation: string; reason: string; reviewedBy: string }[] = [];
