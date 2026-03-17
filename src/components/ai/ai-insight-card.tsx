"use client";

import { IconSparkles } from "@/components/ui/icons";
import { useTautoko } from "./agent-context";

interface AIInsightCardProps {
  title: string;
  content: string;
  suggestion?: string;
}

export function AIInsightCard({ title, content, suggestion }: AIInsightCardProps) {
  const { open, sendMessage } = useTautoko();

  async function handleSuggestion() {
    if (!suggestion) return;
    open();
    await sendMessage(suggestion);
  }

  return (
    <div className="bg-plum-50 rounded-[14px] border border-plum-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconSparkles size={14} className="text-plum-500" />
        <span className="text-[11px] font-medium text-plum-500 uppercase tracking-wider">Tautoko</span>
      </div>
      <h4 className="text-sm font-medium text-sage-900 mb-1">{title}</h4>
      <p className="text-xs text-warm-500 leading-relaxed">{content}</p>
      {suggestion && (
        <button
          onClick={handleSuggestion}
          className="mt-2.5 px-3 py-1.5 text-[11px] font-medium text-plum-600 bg-white border border-plum-100 rounded-full active:bg-plum-50 transition-colors duration-150"
        >
          Ask Tautoko
        </button>
      )}
    </div>
  );
}
