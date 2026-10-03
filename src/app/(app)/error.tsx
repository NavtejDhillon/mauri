"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Shown inside the app shell when a page fails, so the navigation stays. The error's text is
// never shown: in production it is withheld, and it is technical. The digest matches the
// server log entry for this failure.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    // Fetch the page from the server again, then clear the error.
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="space-y-4 md:max-w-lg">
      {/* A client component cannot export metadata; React places this title in the head. */}
      <title>Something went wrong | Mauri</title>
      <h1 className="text-2xl font-semibold text-sage-900">Something went wrong</h1>
      <p className="text-sm text-warm-700">This page could not be loaded. Nothing you saved earlier has been lost. Try again, and if it keeps happening, contact support.</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <button type="button" onClick={retry} className="min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700">
          Try again
        </button>
        <Link href="/dashboard" className="inline-flex items-center justify-center min-h-11 px-4 py-2.5 text-sm font-medium text-sage-700 bg-white border border-warm-200 rounded-[10px] hover:bg-warm-50">
          Go to the dashboard
        </Link>
      </div>
      {error.digest && <p className="text-xs text-warm-400">Reference: {error.digest}</p>}
    </div>
  );
}
