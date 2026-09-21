import { MacOSSidebar } from "@/components/watermelon/macos-sidebar"

export function MacosSidebarDemo() {
  return (
    <MacOSSidebar items={["All notes", "Shared", "Archive", "Trash"]}>
      <div className="flex h-full min-h-[240px] items-center text-sm text-muted-foreground">
        Inbox
      </div>
    </MacOSSidebar>
  )
}
