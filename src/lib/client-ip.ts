// The visitor's address as the hosting platform reports it: the first value of
// x-forwarded-for, else "unknown". Used only to count failed sign-in attempts.
// Vercel overwrites x-forwarded-for with the address it saw, so a browser cannot choose its
// own; any proxy put in front of the app instead must overwrite it the same way. x-real-ip is
// not read, because not every proxy sets or overwrites it.
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
