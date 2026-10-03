// The Content-Security-Policy for every page. The proxy builds it per request with a fresh
// nonce; Next.js reads the nonce from the request's CSP header and puts it on its own scripts.
// No third-party origins: fonts are self-hosted by next/font and the QR code is a data: URL.
export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' lets scripts Next loads from its nonce'd scripts run. Next's dev server
    // (React's debugging tools and fast refresh) needs eval; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React and Next set style attributes, which nonces cannot cover.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
