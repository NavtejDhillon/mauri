"use client";

import { useRouter } from "next/navigation";
import { IconChevronLeft } from "./icons";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function MobileHeader({
  title,
  showBack = false,
  backHref,
  rightAction,
}: MobileHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className="flex items-center justify-between mb-4 md:mb-6">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-warm-100 transition-colors duration-100 md:hidden"
            aria-label="Back"
          >
            <IconChevronLeft size={22} className="text-warm-500" />
          </button>
        )}
        <h1 className="text-[22px] md:text-[26px] font-semibold text-sage-900 truncate">
          {title}
        </h1>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </div>
  );
}
