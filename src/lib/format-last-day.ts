import { formatDate } from "./format-date";

// Shows an exclusive end (the first instant with no access, as nzEndOfDay stores it) as the
// last day that is included, for example "19 October 2026" for midnight starting 20 October.
export function formatLastDay(exclusiveEnd: string | Date): string {
  const end = typeof exclusiveEnd === "string" ? new Date(exclusiveEnd) : exclusiveEnd;
  if (Number.isNaN(end.getTime())) return "-";
  return formatDate(new Date(end.getTime() - 1));
}
