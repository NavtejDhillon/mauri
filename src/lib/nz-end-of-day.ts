import { nzWallClock } from "./nz-wall-clock";

const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;

// The end of a New Zealand calendar day, as an exclusive end: the instant of 00:00 in
// Pacific/Auckland on the following day. Access lasts while now() < that instant, so the whole
// chosen day is included and nothing after it, on a 23 or 25 hour daylight saving day too.
// Returns null for anything that is not a real YYYY-MM-DD date; it never throws.
export function nzEndOfDay(date: string): Date | null {
  const match = dateOnly.exec(date);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  // Midnight on the next day, read as if it were UTC, then moved back by New Zealand's offset
  // from UTC at that moment. The offset is checked twice because the first guess can fall on the
  // other side of a daylight saving change. New Zealand changes at 2am or 3am, never at
  // midnight, so midnight always exists exactly once.
  const target = Date.UTC(year, month - 1, day + 1);
  const offsetAt = (instant: number) => {
    const c = nzWallClock(new Date(instant));
    return Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second) - instant;
  };
  const first = target - offsetAt(target);
  return new Date(target - offsetAt(first));
}
