"use client";
// ui.watermelon.sh/animated-components/pin-item

import { motion } from "motion/react";
import { PinMorph } from "@/shared/icons/motion";
import { cn } from "@/lib/utils";

export function PinButton({
  pinned,
  onClick,
  label,
}: {
  pinned: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pinned}
      className={cn(
        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
        pinned
          ? "bg-primary text-primary-foreground opacity-100"
          : "bg-muted text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
      )}
    >
      <PinMorph pinned={pinned} size={16} />
    </motion.button>
  );
}
