/** Stable application-facing entry point; compose the existing primitives, do not fork them. */
export { Button, StatefulButton, Input, Field, FieldSelect, AppModal, EmptyState, ErrorState } from "@/shared/ui";
export { PotlabIcon } from "@/shared/icons";
export { ThemeProvider, useTheme } from "./ThemeProvider";
export { DesignerWindow } from "./DesignerWindow";
export { DesignerLink, useDesignerNavigation, reserveDesignerWindow } from "./designer-navigation";
export { DEFAULT_APPEARANCE, APPEARANCE_KEY, normalizeAppearance, themeTokens, contrast } from "./theme-core";
export type { Appearance } from "./theme-core";

export { PageMotion, MotionOutlet, MotionRegion } from "./motion/PageMotion";
export { MOTION } from "@/lib/motion-tokens";

export { WorkspaceUIProvider, useWorkspaceUI } from "./workspace/WorkspaceUI";
export type { WorkspaceComponents, ResourceItem, ResourceTableProps, PageHeaderProps, AppFrameProps } from "./workspace/WorkspaceUI";
export { ContentStage } from "./workspace/ContentStage";
