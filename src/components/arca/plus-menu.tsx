import { FilePlus, ImagePlus, Link2 } from "lucide-react"

import { PlusMenu } from "@/components/transitions/plus-menu"

export function PlusMenuDemo() {
  return (
    <div className="[&_.t-morph]:bg-white [&_.t-morph]:text-neutral-950 [&_.t-morph]:shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:[&_.t-morph]:bg-neutral-950 dark:[&_.t-morph]:text-white dark:[&_.t-morph]:shadow-none">
      <PlusMenu>
        <div className="flex h-full flex-col p-3 pt-3.5">
          <p className="px-2 pb-2 text-xs font-medium opacity-50">Create</p>
          {[
            { label: "Document", icon: FilePlus },
            { label: "Image", icon: ImagePlus },
            { label: "Link", icon: Link2 },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </PlusMenu>
    </div>
  )
}
