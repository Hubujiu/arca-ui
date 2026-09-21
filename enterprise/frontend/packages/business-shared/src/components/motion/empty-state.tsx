"use client";

import type { ReactNode } from "react";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  loading = false,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  loading?: boolean;
  action?: ReactNode;
  className?: string;
}) {

  return (
    <div
      role={loading ? "status" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-control border border-border bg-card px-8 py-16 text-center",
        className,
      )}
    >
      {loading ? <span className="dw-delayed-status"><Loader variant="dots" size={20} label={title} /></span> : null}
      <strong className="text-body font-medium text-foreground">{title}</strong>
      {children ? <div className="max-w-sm text-body leading-6 text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
