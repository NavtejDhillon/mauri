// The otpauth:// key URI for a TOTP secret, in the format authenticator apps register to open
// (https://github.com/google/google-authenticator/wiki/Key-Uri-Format). Lets a midwife who is
// setting up on her phone add the key with one tap instead of scanning her own screen.
export function otpauthUri(secret: string, email: string): string {
  return `otpauth://totp/Mauri:${encodeURIComponent(email)}?secret=${encodeURIComponent(secret)}&issuer=Mauri`;
}
