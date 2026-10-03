import type { NextConfig } from "next";

// Security headers for every response. The Content-Security-Policy is not here: it carries a
// fresh nonce per request, so the proxy sets it (src/proxy.ts, src/lib/content-security-policy.ts).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker that retires the old one (public/sw.js). Browsers must always check
      // with the server for it, so no cache ever keeps a device on an outdated worker.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
