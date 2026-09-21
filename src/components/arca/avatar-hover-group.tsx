import { AvatarGroup } from "@/components/transitions/avatar-group"

const PEOPLE = ["AL", "BT", "GH", "LT", "MH"]

export function AvatarHoverGroupDemo() {
  return (
    <div className="flex items-end py-6 [&>div]:flex [&>div]:items-end [&_.t-avatar]:-ml-2 [&_.t-avatar:first-child]:ml-0">
      <AvatarGroup
        items={PEOPLE.map((initials) => (
          <div
            key={initials}
            className="flex size-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white ring-2 ring-background dark:bg-neutral-100 dark:text-neutral-900"
          >
            {initials}
          </div>
        ))}
      />
    </div>
  )
}
