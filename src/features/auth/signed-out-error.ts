import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";

// Auth error codes that mean "this session is over", as opposed to the auth service failing.
const signedOutCodes = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "user_banned",
  "bad_jwt",
  "no_authorization",
]);

// True when getUser's error means the visitor is simply not signed in.
// Anything else (network failure, 5xx, unexpected) is a real failure the caller must surface.
export function isSignedOutError(error: unknown): boolean {
  if (isAuthSessionMissingError(error)) return true;
  return isAuthApiError(error) && typeof error.code === "string" && signedOutCodes.has(error.code);
}
