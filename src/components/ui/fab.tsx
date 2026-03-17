"use client";

import { IconPlus } from "./icons";

interface FABProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}

export function FAB({ onClick, label = "Add", icon }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 flex items-center justify-center w-14 h-14 bg-sage-600 text-white rounded-full shadow-lg active:scale-95 active:bg-sage-700 transition-all duration-150 hover:bg-sage-700"
    >
      {icon || <IconPlus size={24} />}
    </button>
  );
}
