interface RiskIndicatorProps {
  level: "low" | "medium" | "high";
  label?: string;
}

const riskColors = {
  low: "bg-sage-50 text-sage-800 border-sage-100",
  medium: "bg-warm-50 text-warm-800 border-warm-200",
  high: "bg-coral-50 text-coral-800 border-coral-100",
};

export function RiskIndicator({ level, label }: RiskIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${riskColors[level]}`}
    >
      {label ?? level}
    </span>
  );
}
