const parts = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// The New Zealand calendar date and clock time at an instant, whatever time zone the server
// runs in. Daylight saving is handled by the time zone database.
export function nzWallClock(instant: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const all = parts.formatToParts(instant);
  const get = (type: string) => Number(all.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}
