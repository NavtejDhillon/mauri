"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  color: string; // Tailwind bg class e.g. "bg-coral-600"
  textColor?: string;
  onAction: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
}

/**
 * Swipeable row with reveal-behind actions (iOS style).
 * Swipe left to reveal right actions, swipe right for left actions.
 * Only active on mobile (touch events).
 */
export function SwipeableRow({ children, rightActions = [], leftActions = [] }: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isTracking = useRef(false);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const ACTION_WIDTH = 72; // px per action button
  const rightWidth = rightActions.length * ACTION_WIDTH;
  const leftWidth = leftActions.length * ACTION_WIDTH;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = offset; // start from current offset if already swiped
    isTracking.current = true;
    directionLocked.current = null;
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current) return;

    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Lock direction after 10px of movement
    if (!directionLocked.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        directionLocked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
      return;
    }

    if (directionLocked.current === "vertical") {
      isTracking.current = false;
      return;
    }

    e.preventDefault();
    setSwiping(true);

    let newOffset = currentX.current + dx;

    // Clamp: can't swipe right past left actions, or left past right actions
    if (rightActions.length === 0 && newOffset < 0) newOffset = 0;
    if (leftActions.length === 0 && newOffset > 0) newOffset = 0;

    // Resistance past action width
    if (newOffset < -rightWidth) {
      const over = Math.abs(newOffset) - rightWidth;
      newOffset = -(rightWidth + over * 0.3);
    }
    if (newOffset > leftWidth) {
      const over = newOffset - leftWidth;
      newOffset = leftWidth + over * 0.3;
    }

    setOffset(newOffset);
  }, [rightActions.length, leftActions.length, rightWidth, leftWidth]);

  const handleTouchEnd = useCallback(() => {
    isTracking.current = false;
    directionLocked.current = null;

    // Snap to open or closed
    if (offset < -(rightWidth * 0.4)) {
      setOffset(-rightWidth);
    } else if (offset > leftWidth * 0.4) {
      setOffset(leftWidth);
    } else {
      setOffset(0);
    }

    // Delay removing swiping state for transition
    setTimeout(() => setSwiping(false), 300);
  }, [offset, rightWidth, leftWidth]);

  // Close on tap when open
  const handleClick = useCallback(() => {
    if (offset !== 0) {
      setOffset(0);
      setTimeout(() => setSwiping(false), 300);
    }
  }, [offset]);

  if (rightActions.length === 0 && leftActions.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Left action buttons (revealed on right swipe) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex" style={{ width: `${leftWidth}px` }}>
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onAction}
              className={`flex flex-col items-center justify-center gap-1 ${action.color} ${action.textColor || "text-white"}`}
              style={{ width: `${ACTION_WIDTH}px` }}
            >
              {action.icon}
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right action buttons (revealed on left swipe) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: `${rightWidth}px` }}>
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onAction}
              className={`flex flex-col items-center justify-center gap-1 ${action.color} ${action.textColor || "text-white"}`}
              style={{ width: `${ACTION_WIDTH}px` }}
            >
              {action.icon}
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sliding content */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="relative z-10 bg-white"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping && isTracking.current ? "none" : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
