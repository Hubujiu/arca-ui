"use client";
import { useMotionPreference as useReducedMotion } from "@/lib/motion-preference";

import { IconClose, IconInfo, IconWarning } from "../../shared/icons";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type AlertStatus = "danger" | "warning" | "info";

const STATUS_CLASS: Record<AlertStatus, string> = {
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-status-warning/30 bg-status-warning/10 text-status-warning dark:text-status-warning",
  info: "border-primary/30 bg-primary/10 text-primary",
};

const STATUS_ICON: Record<AlertStatus, ReactNode> = {
  danger: <IconClose size={16} />,
  warning: <IconWarning size={16} />,
  info: <IconInfo size={16} />,
};

export function AlertBanner({
  title,
  children,
  status = "danger",
  className,
}: {
  title: string;
  children?: ReactNode;
  status?: AlertStatus;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      role="alert"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.36, ease: EASE_OUT }}
      className={cn("flex gap-3 rounded-panel border px-5 py-4", STATUS_CLASS[status], className)}
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-background/70">
        {STATUS_ICON[status]}
      </span>
      <div className="min-w-0">
        <strong className="block text-body font-medium text-current">{title}</strong>
        {children ? <div className="mt-1 text-body leading-6 text-current/80">{children}</div> : null}
      </div>
    </motion.div>
  );
}
