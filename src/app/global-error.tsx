"use client";

import { useEffect } from "react";

// The last resort, when the root layout itself fails. It replaces the whole document, so it
// renders its own html and body. Its styles are inline: the app's stylesheet belongs to the
// root layout, and importing it here as well makes every page preload a second copy.
// Colours are the globals.css tokens (warm-50, sage-900, warm-700, sage-600, warm-400).
const page = { minHeight: "100vh", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#faf8f5", fontFamily: "system-ui, -apple-system, sans-serif" };
const box = { width: "100%", maxWidth: 384, textAlign: "center" as const };
const button = { width: "100%", minHeight: 44, border: 0, borderRadius: 10, background: "#4a7040", color: "#ffffff", fontSize: 14, fontWeight: 500, cursor: "pointer" };
const link = { display: "inline-flex", alignItems: "center", minHeight: 44, marginTop: 12, fontSize: 14, color: "#6b5f52" };

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NZ">
      <body style={page}>
        <main style={box}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1a2d17", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#6b5f52", margin: "0 0 16px", lineHeight: 1.5 }}>Mauri could not be loaded. Nothing you saved earlier has been lost. Try again, and if it keeps happening, contact support.</p>
          {/* A full reload is the surest retry when the root layout failed. */}
          <button type="button" onClick={() => window.location.reload()} style={button}>
            Try again
          </button>
          {/* A plain anchor: a full page load, not a client navigation, from a broken app. */}
          <a href="/dashboard" style={link}>
            Go to the dashboard
          </a>
          {error.digest && <p style={{ fontSize: 12, color: "#796f62", marginTop: 12 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
