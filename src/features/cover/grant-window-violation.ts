// True when a database error is the access_grant_window check (the end must be after the
// start), the one 23514 that means "the last day is in the past". Postgres names the
// constraint in the message; other check failures on access_grant mean something else.
export function isGrantWindowViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23514" && /"access_grant_window"/.test(error.message ?? "");
}
