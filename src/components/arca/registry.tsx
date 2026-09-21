import type { ComponentType } from "react"

import { PressButtonDemo } from "@/components/arca/press-button"
import { StatefulButtonDemo } from "@/components/arca/stateful-button"
import { ShimmerButtonDemo } from "@/components/arca/shimmer-button"
import { DeleteButtonDemo } from "@/components/arca/delete-button"
import { SplitButtonDemo } from "@/components/arca/split-button"
import { OverflowActionsDemo } from "@/components/arca/overflow-actions"
import { TimeUndoDemo } from "@/components/arca/time-undo"
import { BloomMenuDemo } from "@/components/arca/bloom-menu"
import { PlusMenuDemo } from "@/components/arca/plus-menu"
import { OtpInputDemo } from "@/components/arca/otp-input"
import { FloatingInputDemo } from "@/components/arca/floating-input"
import { AdaptiveStepperDemo } from "@/components/arca/adaptive-stepper"
import { CounterStepperDemo } from "@/components/arca/counter-stepper"
import { SwitchControlDemo } from "@/components/arca/switch-control"
import { SpringToggleDemo } from "@/components/arca/spring-toggle"
import { SignaturePadDemo } from "@/components/arca/signature-pad"
import { RangeSliderDemo } from "@/components/arca/range-slider"
import { DatetimePickerDemo } from "@/components/arca/datetime-picker"
import { SwapFormDemo } from "@/components/arca/swap-form"
import { SelectMenuDemo } from "@/components/arca/select-menu"
import { SearchComboboxDemo } from "@/components/arca/search-combobox"
import { MultiSelectDemo } from "@/components/arca/multi-select"
import { TabsBarDemo } from "@/components/arca/tabs-bar"
import { MorphingTabsDemo } from "@/components/arca/morphing-tabs"
import { ContextMenuDemo } from "@/components/arca/context-menu"
import { IconPopoverDemo } from "@/components/arca/icon-popover"
import { IconTooltipDemo } from "@/components/arca/icon-tooltip"
import { BreadcrumbNavDemo } from "@/components/arca/breadcrumb-nav"
import { MacosSidebarDemo } from "@/components/arca/macos-sidebar"
import { TreeMenuDemo } from "@/components/arca/tree-menu"
import { FileTreeDemo } from "@/components/arca/file-tree"
import { CommandSearchDemo } from "@/components/arca/command-search"
import { NotificationBellDemo } from "@/components/arca/notification-bell"
import { ToastStackDemo } from "@/components/arca/toast-stack"
import { AnimatedBadgeDemo } from "@/components/arca/animated-badge"
import { LoaderDemo } from "@/components/arca/loader"
import { SkeletonRevealDemo } from "@/components/arca/skeleton-reveal"
import { NotFoundDemo } from "@/components/arca/not-found"
import { TextScrambleDemo } from "@/components/arca/text-scramble"
import { DigitSwapDemo } from "@/components/arca/digit-swap"
import { AvatarStatusDemo } from "@/components/arca/avatar-status"
import { AvatarInboxDemo } from "@/components/arca/avatar-inbox"
import { AvatarGroupDemo } from "@/components/arca/avatar-group"
import { AvatarHoverGroupDemo } from "@/components/arca/avatar-hover-group"
import { AvatarStackDemo } from "@/components/arca/avatar-stack"
import { DataTableDemo } from "@/components/arca/data-table"
import { MetricChartsDemo } from "@/components/arca/metric-charts"
import { AnimatedChartDemo } from "@/components/arca/animated-chart"
import { KanbanBoardDemo } from "@/components/arca/kanban-board"
import { FeatureCardsDemo } from "@/components/arca/feature-cards"
import { FlowchartDemo } from "@/components/arca/flowchart"
import { ExpandDetailsDemo } from "@/components/arca/expand-details"
import { MorphModalDemo } from "@/components/arca/morph-modal"
import { AttachmentUploadDemo } from "@/components/arca/attachment-upload"
import { SmoothScrollDemo } from "@/components/arca/smooth-scroll"
import { InlineDisclosureDemo } from "@/components/arca/inline-disclosure"

export const DEMOS: Record<string, ComponentType> = {
  "press-button": PressButtonDemo,
  "stateful-button": StatefulButtonDemo,
  "shimmer-button": ShimmerButtonDemo,
  "delete-button": DeleteButtonDemo,
  "split-button": SplitButtonDemo,
  "overflow-actions": OverflowActionsDemo,
  "time-undo": TimeUndoDemo,
  "bloom-menu": BloomMenuDemo,
  "plus-menu": PlusMenuDemo,
  "otp-input": OtpInputDemo,
  "floating-input": FloatingInputDemo,
  "adaptive-stepper": AdaptiveStepperDemo,
  "counter-stepper": CounterStepperDemo,
  "switch-control": SwitchControlDemo,
  "spring-toggle": SpringToggleDemo,
  "signature-pad": SignaturePadDemo,
  "range-slider": RangeSliderDemo,
  "datetime-picker": DatetimePickerDemo,
  "swap-form": SwapFormDemo,
  "select-menu": SelectMenuDemo,
  "search-combobox": SearchComboboxDemo,
  "multi-select": MultiSelectDemo,
  "tabs-bar": TabsBarDemo,
  "morphing-tabs": MorphingTabsDemo,
  "context-menu": ContextMenuDemo,
  "icon-popover": IconPopoverDemo,
  "icon-tooltip": IconTooltipDemo,
  "breadcrumb-nav": BreadcrumbNavDemo,
  "macos-sidebar": MacosSidebarDemo,
  "tree-menu": TreeMenuDemo,
  "file-tree": FileTreeDemo,
  "command-search": CommandSearchDemo,
  "notification-bell": NotificationBellDemo,
  "toast-stack": ToastStackDemo,
  "animated-badge": AnimatedBadgeDemo,
  loader: LoaderDemo,
  "skeleton-reveal": SkeletonRevealDemo,
  "not-found": NotFoundDemo,
  "text-scramble": TextScrambleDemo,
  "digit-swap": DigitSwapDemo,
  "avatar-status": AvatarStatusDemo,
  "avatar-inbox": AvatarInboxDemo,
  "avatar-group": AvatarGroupDemo,
  "avatar-hover-group": AvatarHoverGroupDemo,
  "avatar-stack": AvatarStackDemo,
  "data-table": DataTableDemo,
  "metric-charts": MetricChartsDemo,
  "animated-chart": AnimatedChartDemo,
  "kanban-board": KanbanBoardDemo,
  "feature-cards": FeatureCardsDemo,
  flowchart: FlowchartDemo,
  "expand-details": ExpandDetailsDemo,
  "morph-modal": MorphModalDemo,
  "attachment-upload": AttachmentUploadDemo,
  "smooth-scroll": SmoothScrollDemo,
  "inline-disclosure": InlineDisclosureDemo,
}

export function getDemo(slug: string): ComponentType | null {
  return DEMOS[slug] ?? null
}
