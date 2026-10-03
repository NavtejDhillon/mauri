import { headers } from "next/headers";
import { requestIdHeader } from "./request-id-header";

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The per-request id for audit events, as set by the proxy. Falls back to a fresh id if the
// header is missing or not a uuid, which only happens when a request did not pass the proxy.
export async function requestId(): Promise<string> {
  const value = (await headers()).get(requestIdHeader);
  return value && uuidShape.test(value) ? value : crypto.randomUUID();
}
