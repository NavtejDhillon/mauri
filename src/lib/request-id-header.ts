// The request header that carries the per-request audit id. The proxy always sets it,
// overwriting anything the browser sent; the database reads it for write audit events.
export const requestIdHeader = "x-mauri-request-id";
