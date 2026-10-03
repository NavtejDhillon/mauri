import { headers } from "next/headers";

// A per-request id for audit events. Uses the proxy's request id header when present.
export async function requestId(): Promise<string> {
  const h = await headers();
  return h.get("x-request-id") ?? crypto.randomUUID();
}
