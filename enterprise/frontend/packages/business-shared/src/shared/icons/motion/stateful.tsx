"use client";

import { useTheme } from "@/shared/design-system/ThemeProvider";

import type { ReactNode } from "react";
import { Pin } from "@/shared/icons/catalog";
import { motion } from "motion/react";
import { SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** Reversible A/B morph. Rest poses stay in the same static family. */
export function StatefulMorph({
  active,
  off,
  on,
  className,
}: {
  active: boolean;
  off: ReactNode;
  on: ReactNode;
  className?: string;
}) {
  const { reducedMotion: reduce } = useTheme();

  return (
    <span
      className={cn("relative inline-grid place-items-center", className)}
      aria-hidden="true"
    >
      <motion.span
        className="col-start-1 row-start-1 inline-flex"
        animate={
          reduce
            ? { opacity: active ? 0 : 1 }
            : {
                opacity: active ? 0 : 1,
                scale: active ? 0.62 : 1,
                rotate: active ? -90 : 0,
              }
        }
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        {off}
      </motion.span>
      <motion.span
        className="col-start-1 row-start-1 inline-flex"
        animate={
          reduce
            ? { opacity: active ? 1 : 0 }
            : {
                opacity: active ? 1 : 0,
                scale: active ? 1 : 0.62,
                rotate: active ? 0 : 90,
              }
        }
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        {on}
      </motion.span>
    </span>
  );
}

export function PinMorph({
  pinned,
  size = 16,
  className,
}: {
  pinned: boolean;
  size?: number;
  className?: string;
}) {
  const { reducedMotion: reduce } = useTheme();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("inline-flex", className)}
      animate={reduce ? undefined : { rotate: pinned ? 0 : -45 }}
      transition={reduce ? { duration: 0 } : SPRING_SWAP}
    >
      <Pin size={size} fill="none" />
    </motion.span>
  );
}
