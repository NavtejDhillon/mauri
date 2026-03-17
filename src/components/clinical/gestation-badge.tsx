"use client";

import { calculateGestation } from "@/lib/clinical/gestation";

interface GestationBadgeProps {
  edd: string;
  referenceDate?: Date;
}

const trimesterColors = {
  1: "bg-sky-50 text-sky-800 border-sky-100",
  2: "bg-sage-50 text-sage-800 border-sage-100",
  3: "bg-coral-50 text-coral-800 border-coral-100",
};

export function GestationBadge({ edd, referenceDate }: GestationBadgeProps) {
  const gestation = calculateGestation(new Date(edd), referenceDate);

  if (gestation.weeks < 0 || gestation.weeks > 45) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded-full border ${trimesterColors[gestation.trimester]}`}
    >
      {gestation.display}
    </span>
  );
}
