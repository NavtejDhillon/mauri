import { requestId } from "@/lib/request-id";

const sessionEnded = "Your session has ended. Sign in again to continue.";
const badFormat = "One of the details is not in the right format. Check it and try again.";
const unreachable = "We could not reach the service just now. Try again shortly.";
const general = "Something went wrong. Try again, and if it keeps happening, contact support.";

// Calm, actionable copy for the error codes the database (Postgres SQLSTATE and PostgREST)
// and the auth service return. Codes not listed here get the caller's fallback.
const byCode: Record<string, string> = {
  // Postgres
  "23505": "This has already been saved. Reload the page to see it.",
  "23514": "Some of the details are not allowed. Check them and try again.",
  "23502": "A required detail is missing. Check the form and try again.",
  "23503": "Something this refers to no longer exists. Reload the page and try again.",
  "22001": "One of the details is too long. Shorten it and try again.",
  "22007": badFormat,
  "22008": badFormat,
  "22023": badFormat,
  "22P02": badFormat,
  "42501": "You do not have permission to do that. If you think you should, contact support.",
  "57014": "That took too long. Try again.",
  // PostgREST: the session token was missing, expired or invalid.
  PGRST301: sessionEnded,
  PGRST302: sessionEnded,
  PGRST303: sessionEnded,
  // Auth service
  weak_password: "Choose a longer password that is harder to guess. A short sentence works well.",
  same_password: "Choose a password different from your current one.",
  insufficient_aal: "Enter the code from your authenticator app first. Reload the page to carry on.",
  mfa_factor_name_conflict: "Authenticator setup was already started. Reload the page to start again.",
  mfa_factor_not_found: "Authenticator setup has expired. Reload the page to start again.",
  otp_expired: "That link has expired. Ask for a new one.",
  session_not_found: sessionEnded,
  session_expired: sessionEnded,
  refresh_token_not_found: sessionEnded,
  refresh_token_already_used: sessionEnded,
  bad_jwt: sessionEnded,
  no_authorization: sessionEnded,
  over_request_rate_limit: "Too many requests just now. Wait a few minutes and try again.",
};

function describe(error: unknown): { code: string; status: number | null; unreachable: boolean } {
  if (error instanceof TypeError) return { code: "", status: null, unreachable: true };
  if (typeof error !== "object" || error === null) return { code: "", status: null, unreachable: false };
  const e = error as { code?: unknown; status?: unknown; name?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const status = typeof e.status === "number" ? e.status : null;
  // supabase-js reports a dropped connection as status 0, AuthRetryableFetchError, or a
  // PostgREST error whose message is the fetch failure. The text is only inspected, never shown.
  const fetchFailed = e.name === "AuthRetryableFetchError" || (typeof e.message === "string" && /fetch failed|network/i.test(e.message));
  return { code, status, unreachable: status === 0 || (status !== null && status >= 500) || (!code && fetchFailed) };
}

// The one place that turns a database or auth service error into what the person sees.
// Logs the raw error with the request id (so a report can be matched to the audit trail and
// the server log) and returns calm British English copy; the raw text is never shown.
// `codes` overrides the message for particular codes; `fallback` replaces the general message.
export async function userMessage(context: string, error: unknown, options: { codes?: Record<string, string>; fallback?: string } = {}): Promise<string> {
  console.error(`${context} failed (request ${await requestId()})`, error);
  const { code, status, unreachable: down } = describe(error);
  if (code && options.codes?.[code]) return options.codes[code];
  if (code && byCode[code]) return byCode[code];
  if (status === 429) return byCode.over_request_rate_limit;
  if (down) return unreachable;
  return options.fallback ?? general;
}
