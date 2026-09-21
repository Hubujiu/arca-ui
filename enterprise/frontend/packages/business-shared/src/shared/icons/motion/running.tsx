"use client";
import type { CSSProperties } from "react";

import { useTheme } from "@/shared/design-system/ThemeProvider";

import { cn } from "@/lib/utils";

/** Continuous motion is reserved for an operation that is actually in flight. */
export function RunningIcon({
  running,
  size = 16,
  className,
  label = "加载中",
}: {
  running: boolean;
  size?: number;
  className?: string;
  label?: string;
}) {
  const { reducedMotion: reduce } = useTheme();

  if (!running) return null;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
    >
      <span
        className={cn(
          "dw-running-indicator rounded-full border-2 border-current border-t-transparent",
          !reduce && "animate-spin",
        )}
        style={{ "--indicator-size": `${size}px` } as CSSProperties}
      />
    </span>
  );
}
