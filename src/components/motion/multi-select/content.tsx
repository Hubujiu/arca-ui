"use client";
// beui.dev/components/motion/multi-select

import type { ReactNode } from "react";
import { DropdownPanel } from "@/components/motion/dropdown-panel";
import { useMultiSelectContext } from "./context";

export interface MultiSelectContentProps {
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  avoidCollisions?: boolean;
  className?: string;
}

export function MultiSelectContent({
  children,
  className,
}: MultiSelectContentProps) {
  const context = useMultiSelectContext("MultiSelectContent");

  return (
    <DropdownPanel
      open={context.open}
      reduce={context.reduce}
      placement={context.placement}
      setPlacement={context.setPlacement}
      triggerId={context.triggerId}
      labelledBy={context.triggerId}
      contentRef={context.contentRef}
      className={className}
    >
      {children}
    </DropdownPanel>
  );
}
