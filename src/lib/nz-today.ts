import { nzWallClock } from "./nz-wall-clock";

// Today's date in New Zealand as YYYY-MM-DD (the format of a date input), whatever time zone
// the server runs in. Dates in this format compare correctly as strings.
export function nzToday(now: Date = new Date()): string {
  const { year, month, day } = nzWallClock(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
