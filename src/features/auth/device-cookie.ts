// The known-device cookie. After she completes MFA on a device, it holds a random token whose
// sha256 the database keeps against her account (known_device). Sign-in attempts from that
// device then have their own attempt bucket, so failures from other addresses cannot lock her
// out of it. Only the server reads it. It outlives sign-out on purpose: it grants nothing by
// itself, and a known device's own failures are still limited to 5 in 15 minutes.
export const deviceCookie = {
  name: "mauri_device",
  maxAgeSeconds: 180 * 24 * 60 * 60,
  options: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};
