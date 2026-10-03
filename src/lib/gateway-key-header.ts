// The request header that carries the shared gateway key. The reverse proxy in front of the
// database API rejects any request without it, so only the app server and the operator scripts
// can reach the API. The key itself is server-only (MAURI_GATEWAY_KEY) and never reaches the browser.
export const gatewayKeyHeader = "x-mauri-gateway-key";
