import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
        A
      </span>
      <span className="text-sm font-semibold tracking-[0.18em]">ARCA</span>
    </span>
  )
}
