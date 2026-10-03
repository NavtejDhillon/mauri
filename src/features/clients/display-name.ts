import type { ClientSummary } from "./types";

// How a client is named everywhere in the app: "Ro (Aroha) Smith" when she has a preferred name
// that differs from her first name, otherwise "Aroha Smith". Blank names are ignored.
export function displayName(c: Pick<ClientSummary, "first_name" | "last_name" | "preferred_name">): string {
  const first = c.first_name.trim();
  const last = c.last_name.trim();
  const preferred = c.preferred_name?.trim() ?? "";
  const given = preferred && preferred.toLocaleLowerCase("en-NZ") !== first.toLocaleLowerCase("en-NZ") ? `${preferred} (${first})` : first;
  return [given, last].filter(Boolean).join(" ");
}
