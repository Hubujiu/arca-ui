import { SkeletonReveal } from "@/components/transitions/skeleton-reveal"

export function SkeletonRevealDemo() {
  return (
    <div className="flex flex-col items-center gap-4 [&_.t-skel]:h-[52px] [&_.t-skel]:w-[240px] [&_button]:rounded-full [&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs [&_button]:font-medium">
      <SkeletonReveal
        skeleton={
          <div className="flex w-[240px] items-center gap-3">
            <div className="size-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-3 w-40 rounded bg-muted" />
            </div>
          </div>
        }
      >
        <div className="flex w-[240px] items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
            AL
          </div>
          <div>
            <p className="text-sm font-medium">Ada Lovelace</p>
            <p className="text-xs text-muted-foreground">Product engineer</p>
          </div>
        </div>
      </SkeletonReveal>
    </div>
  )
}
