// A short-lived marker set by the sign-out actions. Server actions cannot set response headers,
// so the proxy sees this cookie on the request that follows sign-out and sends
// Clear-Site-Data from there (src/proxy.ts). It holds no personal data.
export const signedOutCookie = { name: "mauri_signed_out", maxAgeSeconds: 600 };
