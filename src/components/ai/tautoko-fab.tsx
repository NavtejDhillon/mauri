"use client";

import { useTautoko } from "./agent-context";
import { IconSparkles } from "@/components/ui/icons";

/**
 * Floating button to open Tautoko AI panel.
 * Mobile: small circle above the bottom tab bar.
 * Desktop: hidden (sidebar button is used instead).
 */
export function TautokoFAB() {
  const { toggle, isOpen } = useTautoko();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:hidden w-12 h-12 rounded-full bg-plum-600 text-white shadow-lg shadow-plum-600/30 flex items-center justify-center active:scale-95 transition-transform duration-150 z-40"
      aria-label="Open Tautoko AI"
    >
      <IconSparkles size={22} />
    </button>
  );
}
