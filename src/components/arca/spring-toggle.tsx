import { Toggle } from "@/components/transitions/toggle"

export function SpringToggleDemo() {
  return (
    <div className="[&_.t-toggle]:h-[22px] [&_.t-toggle]:w-[36px] [&_.t-toggle]:cursor-pointer [&_.t-toggle]:rounded-full [&_.t-toggle]:border-0 [&_.t-toggle]:bg-neutral-300 [&_.t-toggle]:p-[2px] [&_.t-toggle]:dark:bg-neutral-700 [&_.t-toggle[data-on=true]]:bg-neutral-950 [&_.t-toggle[data-on=true]]:dark:bg-white [&_.t-toggle-thumb]:block [&_.t-toggle-thumb]:size-[18px] [&_.t-toggle-thumb]:rounded-full [&_.t-toggle-thumb]:bg-white [&_.t-toggle[data-on=true]_.t-toggle-thumb]:dark:bg-neutral-950">
      <Toggle />
    </div>
  )
}
