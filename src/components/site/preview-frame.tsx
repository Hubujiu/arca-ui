import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PreviewFrame({
  children,
  className,
  toolbar = true,
}: {
  children: ReactNode
  className?: string
  toolbar?: boolean
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border border-border bg-muted/40 shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {toolbar ? (
        <div className="flex h-10 items-center gap-2 border-b border-border/80 bg-muted/70 px-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
      ) : null}
      <div className="flex min-h-48 items-center justify-center bg-background p-6">
        {children}
      </div>
    </div>
  )
}
