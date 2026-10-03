const nzDate = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" });
const calendarDate = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;

// Every date the app shows, as "12 June 1994". A date-only value (a date of birth) is a
// calendar day and is shown as that day; a timestamp is shown as the day it falls on in
// New Zealand, whatever time zone the server runs in. Anything unreadable shows as "-".
export function formatDate(value: string | Date): string {
  const match = typeof value === "string" ? dateOnly.exec(value) : null;
  if (match) {
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    // Date.UTC rolls 30 February over into March; refuse it instead.
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "-";
    return calendarDate.format(date);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "-" : nzDate.format(date);
}
