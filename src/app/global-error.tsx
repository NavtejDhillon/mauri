"use client";

import { useEffect } from "react";
import "./globals.css";

// The last resort, when the root layout itself fails. It replaces the whole document, so it
// renders its own html and body, and imports the styles itself. A full reload is the surest
// retry from here.
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NZ">
      <body className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <main className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-sage-900">Something went wrong</h1>
          <p className="text-sm text-warm-700">Mauri could not be loaded. Nothing you saved earlier has been lost. Try again, and if it keeps happening, contact support.</p>
          <button type="button" onClick={() => window.location.reload()} className="w-full min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-sage-600 rounded-[10px]">
            Try again
          </button>
          {/* A plain anchor: a full page load, not a client navigation, from a broken app. */}
          <a href="/dashboard" className="inline-flex items-center justify-center min-h-11 text-sm text-warm-700 underline underline-offset-2">
            Go to the dashboard
          </a>
          {error.digest && <p className="text-xs text-warm-400">Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
