// The visitor's address as the hosting platform reports it: the first value of
// x-forwarded-for, else x-real-ip, else "unknown". Used only to count failed sign-in attempts.
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || "unknown";
}
