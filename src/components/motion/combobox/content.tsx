"use client";

import type { ReactNode } from "react";
import { DropdownPanel } from "@/components/motion/dropdown-panel";
import { useComboboxContext } from "./context";

export interface ComboboxContentProps {
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  avoidCollisions?: boolean;
  className?: string;
}

export function ComboboxContent({
  children,
  className,
}: ComboboxContentProps) {
  const context = useComboboxContext("ComboboxContent");

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
