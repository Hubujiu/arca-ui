"use client";

import { useTheme } from "@/shared/design-system/ThemeProvider";

import {
  type ComponentType,
  type HTMLAttributes,
  type RefAttributes,
  useEffect,
  useRef,
} from "react";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export type ActionIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type ActionIconGlyphProps = {
  size?: number;
  duration?: number;
  isAnimated?: boolean;
  color?: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "color">;

export type ActionGlyph = ComponentType<
  ActionIconGlyphProps & RefAttributes<ActionIconHandle>
>;

/** Enterprise micro-feedback: short enough to read as confirmation, not decoration. */
export const ACTION_DURATION = 0.55;

const HOST_SELECTOR =
  "button, a, [role='button'], [role='menuitem'], [data-action-icon-host]";

export function ActionIcon({
  icon: Icon,
  size = 16,
  duration = ACTION_DURATION,
  className,
  color,
}: {
  icon: ActionGlyph;
  size?: number;
  duration?: number;
  className?: string;
  color?: string;
}) {
  const glyphRef = useRef<ActionIconHandle>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const { reducedMotion: reduce } = useTheme();
  const canHover = useHoverCapable();

  useEffect(() => {
    if (reduce) return;
    const node = hostRef.current;
    if (!node) return;
    const target =
      (node.closest(HOST_SELECTOR) as HTMLElement | null) ?? node;
    let settle: number | undefined;

    const start = () => {
      if (settle) window.clearTimeout(settle);
      glyphRef.current?.startAnimation();
    };
    const stop = () => {
      if (settle) window.clearTimeout(settle);
      glyphRef.current?.stopAnimation();
    };
    const press = () => {
      start();
      if (canHover) return;
      settle = window.setTimeout(stop, duration * 1000);
    };

    if (canHover) {
      target.addEventListener("pointerenter", start);
      target.addEventListener("pointerleave", stop);
    }
    target.addEventListener("pointerdown", press);
    return () => {
      if (settle) window.clearTimeout(settle);
      target.removeEventListener("pointerenter", start);
      target.removeEventListener("pointerleave", stop);
      target.removeEventListener("pointerdown", press);
    };
  }, [canHover, duration, reduce]);

  return (
    <span
      ref={hostRef}
      className={cn(
        "inline-flex shrink-0 items-center justify-center [&>div]:flex",
        className,
      )}
      aria-hidden="true"
    >
      <Icon
        ref={glyphRef}
        size={size}
        duration={duration}
        color={color}
        isAnimated={!reduce}
      />
    </span>
  );
}
