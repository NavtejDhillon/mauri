"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

/**
 * Native-feel pull-to-refresh wrapper for mobile.
 * Wraps scrollable content; shows a spinner when pulled past threshold.
 * Only activates when scroll is at top (scrollTop === 0).
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentPull = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const isActive = useRef(false);

  const THRESHOLD = 70;
  const MAX_PULL = 120;
  const RESISTANCE = 0.45;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const container = containerRef.current;
    // Only activate if we're at the very top of scroll
    if (container && container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isActive.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isActive.current || refreshing) return;
    const dy = (e.touches[0].clientY - startY.current) * RESISTANCE;
    if (dy > 0) {
      currentPull.current = Math.min(dy, MAX_PULL);
      setPullDistance(currentPull.current);
      setPulling(true);
      // Prevent native scroll while pulling
      if (dy > 10) e.preventDefault();
    } else {
      isActive.current = false;
      setPulling(false);
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isActive.current) return;
    isActive.current = false;

    if (currentPull.current >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPulling(false);
        setPullDistance(0);
        currentPull.current = 0;
      }
    } else {
      setPulling(false);
      setPullDistance(0);
      currentPull.current = 0;
    }
  }, [onRefresh]);

  const rotation = Math.min((pullDistance / THRESHOLD) * 360, 360);
  const opacity = Math.min(pullDistance / (THRESHOLD * 0.6), 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
      style={{ touchAction: pulling ? "none" : "auto" }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{
          height: pulling || refreshing ? `${pullDistance}px` : "0px",
          transition: pulling ? "none" : undefined,
        }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{ opacity }}
        >
          {refreshing ? (
            <svg className="w-5 h-5 text-sage-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-sage-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
