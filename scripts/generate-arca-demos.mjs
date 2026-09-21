import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const previewDir = join(root, "tmp", "originals", "beui-previews")
const arcaDir = join(root, "src", "components", "arca")

function wrapPreview(source, demoName) {
  const renamed = source
    .replace(/^"use client";\n\n/, "")
    .replace(/export function (\w+)\(/, `function $1(`)
  const previewFn = source.match(/export function (\w+)/)?.[1]
  if (!previewFn) throw new Error(`no preview fn in ${demoName}`)
  return `${renamed}\n\nexport function ${demoName}() {\n  return <${previewFn} />\n}\n`
}

async function writeArca(name, contents) {
  await writeFile(join(arcaDir, `${name}.tsx`), contents)
}

const beuiMap = [
  ["press-button", "PressButtonDemo", 1],
  ["stateful-button", "StatefulButtonDemo", 2],
  ["adaptive-stepper", "AdaptiveStepperDemo", 0],
  ["tabs-bar", "TabsBarDemo", 0],
  ["switch-control", "SwitchControlDemo", 0],
  ["select-menu", "SelectMenuDemo", 0],
  ["search-combobox", "SearchComboboxDemo", 0],
  ["multi-select", "MultiSelectDemo", 0],
  ["file-tree", "FileTreeDemo", 0],
  ["icon-tooltip", "IconTooltipDemo", 0],
  ["context-menu", "ContextMenuDemo", 0],
  ["icon-popover", "IconPopoverDemo", 0],
  ["morph-modal", "MorphModalDemo", 0],
  ["text-scramble", "TextScrambleDemo", 0],
  ["digit-swap", "DigitSwapDemo", 0],
  ["animated-badge", "AnimatedBadgeDemo", 0],
  ["toast-stack", "ToastStackDemo", 0],
  ["smooth-scroll", "SmoothScrollDemo", 0],
  ["range-slider", "RangeSliderDemo", 0],
  ["loader", "LoaderDemo", 0],
  ["morphing-tabs", "MorphingTabsDemo", 0],
  ["overflow-actions", "OverflowActionsDemo", 0],
  ["attachment-upload", "AttachmentUploadDemo", 0],
  ["bloom-menu", "BloomMenuDemo", 0],
  ["not-found", "NotFoundDemo", 0],
  ["data-table", "DataTableDemo", 0],
  ["async-table", "AsyncTableDemo", 2],
]

for (const [slug, demoName, index] of beuiMap) {
  const json = JSON.parse(await readFile(join(previewDir, `${slug}.json`), "utf8"))
  const block = json.blocks[index]
  if (!block) throw new Error(`missing block ${index} for ${slug}`)
  await writeArca(slug, wrapPreview(block, demoName))
  console.log("beui", slug)
}

const wrappers = {
  "shimmer-button": `import { ShimmerButton } from "@/components/watermelon/shimmer-button"

export function ShimmerButtonDemo() {
  return <ShimmerButton>Get Started</ShimmerButton>
}
`,
  "filter-disclosure": `import { FilterDisclosure } from "@/components/watermelon/filter-disclosure"

export function FilterDisclosureDemo() {
  return <FilterDisclosure />
}
`,
  "counter-stepper": `import { Stepper } from "@/components/watermelon/stepper"

export function CounterStepperDemo() {
  return <Stepper defaultValue={0} />
}
`,
  "time-undo": `import { TimedUndoAction } from "@/components/watermelon/time-undo-action"

export function TimeUndoDemo() {
  return <TimedUndoAction />
}
`,
  "split-button": `import SplitButton from "@/components/watermelon/split-button"

export function SplitButtonDemo() {
  return <SplitButton />
}
`,
  "inline-disclosure": `import { InlineDisclosureMenu } from "@/components/watermelon/inline-disclosure-menu"

export function InlineDisclosureDemo() {
  return <InlineDisclosureMenu />
}
`,
  "signature-pad": `import { DrawSignatureComponent } from "@/components/watermelon/draw-signature"

export function SignaturePadDemo() {
  return <DrawSignatureComponent />
}
`,
  "floating-input": `import { FloatingInput } from "@/components/watermelon/floating-input"

export function FloatingInputDemo() {
  return (
    <div className="w-[280px]">
      <FloatingInput label="Email" />
    </div>
  )
}
`,
  "swap-form": `import { useState } from "react"
import { SwapForm } from "@/components/watermelon/swap-form"

export function SwapFormDemo() {
  const [isSignIn, setIsSignIn] = useState(true)
  return <SwapForm isSignIn={isSignIn} onModeChange={setIsSignIn} />
}
`,
  "tags-filter": `import { Tags } from "@/components/watermelon/tags"

export function TagsFilterDemo() {
  return <Tags />
}
`,
  "pin-item": `import { PinItemComponent } from "@/components/watermelon/pin-item"

export function PinItemDemo() {
  return <PinItemComponent />
}
`,
  "expand-details": `import ExpandDetails from "@/components/watermelon/expand-details"

export function ExpandDetailsDemo() {
  return <ExpandDetails />
}
`,
  "inline-edit": `import { useState } from "react"
import { InlineEditCard, type EventData } from "@/components/watermelon/inline-edit"

const INITIAL: EventData = {
  event: "Design review",
  date: "Sep 18",
  start: "10:00",
  end: "11:30",
  location: "Studio",
  url: "https://meet.arca.ui",
  desc: "Walk through the new component set and motion tokens.",
}

export function InlineEditDemo() {
  const [data, setData] = useState(INITIAL)
  return <InlineEditCard data={data} onDataChange={setData} />
}
`,
  "macos-sidebar": `import { MacOSSidebar } from "@/components/watermelon/macos-sidebar"

export function MacosSidebarDemo() {
  return (
    <MacOSSidebar items={["All notes", "Shared", "Archive", "Trash"]}>
      <div className="flex h-full min-h-[240px] items-center text-sm text-neutral-500">
        Inbox
      </div>
    </MacOSSidebar>
  )
}
`,
  "tree-menu": `import { TreeMenu } from "@/components/watermelon/tree-menu"

const MENU = [
  {
    id: "product",
    label: "Product",
    children: [
      { id: "overview", label: "Overview" },
      {
        id: "features",
        label: "Features",
        children: [
          { id: "auth", label: "Auth" },
          { id: "billing", label: "Billing" },
        ],
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    children: [
      { id: "about", label: "About" },
      { id: "careers", label: "Careers" },
    ],
  },
  { id: "blog", label: "Blog" },
]

export function TreeMenuDemo() {
  return <TreeMenu menuData={MENU} />
}
`,
  "pagination-bar": `import { Pagination } from "@/components/watermelon/pagination"
import { ContinuousPagination } from "@/components/watermelon/continuous-pagination"

export function PaginationBarDemo() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Pagination totalPages={15} defaultValue={1} />
      <ContinuousPagination />
    </div>
  )
}
`,
  "avatar-status": `import Avatar7 from "@/components/watermelon/avatar-7"

export function AvatarStatusDemo() {
  return <Avatar7 />
}
`,
  "avatar-inbox": `import Avatar9 from "@/components/watermelon/avatar-9"

export function AvatarInboxDemo() {
  return <Avatar9 />
}
`,
  "avatar-group": `import Avatar14 from "@/components/watermelon/avatar-14"
import Avatar18 from "@/components/watermelon/avatar-18"
import Avatar19 from "@/components/watermelon/avatar-19"

export function AvatarGroupDemo() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Avatar18 />
      <Avatar19 />
      <Avatar14 />
    </div>
  )
}
`,
  "breadcrumb-nav": `import Breadcrumb3 from "@/components/watermelon/breadcrumb-3"
import Breadcrumb8 from "@/components/watermelon/breadcrumb-8"

export function BreadcrumbNavDemo() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Breadcrumb3 />
      <Breadcrumb8 />
    </div>
  )
}
`,
  "command-search": `import { CommandSearch } from "@/components/spectrum/command-search"

export function CommandSearchDemo() {
  return (
    <div className="w-full max-w-md">
      <CommandSearch />
    </div>
  )
}
`,
  "datetime-picker": `import DatetimePickerDemoOriginal from "@/components/spectrum/datetime-picker-demo"

export function DatetimePickerDemo() {
  return <DatetimePickerDemoOriginal />
}
`,
  "avatar-stack": `import { AvatarStack } from "@/components/spectrum/avatar-stack"

const PEOPLE = [
  { name: "Ada Lovelace", src: "https://assets.watermelon.sh/wm_olivia.png" },
  { name: "Alan Turing", src: "https://assets.watermelon.sh/wm_ben.png" },
  { name: "Grace Hopper", src: "https://assets.watermelon.sh/wm_emma.png" },
  { name: "Linus Torvalds", src: "https://assets.watermelon.sh/wm_josh.png" },
  { name: "Margaret Hamilton" },
  { name: "Katherine Johnson" },
]

export function AvatarStackDemo() {
  return <AvatarStack items={PEOPLE} />
}
`,
  "animated-chart": `import { Chart } from "@/components/spectrum/animateddemo"

export function AnimatedChartDemo() {
  return <Chart />
}
`,
  "kanban-board": `import KanbanBoard from "@/components/spectrum/kanbanboard"

export function KanbanBoardDemo() {
  return (
    <div className="w-full overflow-x-auto">
      <KanbanBoard />
    </div>
  )
}
`,
  "notification-bell": `import { useState } from "react"
import NotificationBell from "@/components/rare-ui/notification-bell"

export function NotificationBellDemo() {
  const [count, setCount] = useState(3)
  return (
    <NotificationBell
      count={count}
      onClick={() => setCount((value) => (value === 0 ? 3 : 0))}
    />
  )
}
`,
  "delete-button": `import { DeleteButton } from "@/components/rare-ui/delete-button"

export function DeleteButtonDemo() {
  return <DeleteButton />
}
`,
  "otp-input": `import OtpInput from "@/components/rare-ui/otp-input"

export function OtpInputDemo() {
  return <OtpInput length={6} />
}
`,
  flowchart: `import Flowchart from "@/components/beautifului/Flowchart"

export function FlowchartDemo() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl">
      <Flowchart />
    </div>
  )
}
`,
}

for (const [slug, contents] of Object.entries(wrappers)) {
  await writeArca(slug, contents)
  console.log("wrap", slug)
}

console.log("done")
