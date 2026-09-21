"use client";
// beui.dev/components/motion/drawer — reuse the installed Radix focus/scroll substrate.
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useMotionPreference } from "@/lib/motion-preference";
import { MOTION } from "@/lib/motion-tokens";
import { PresenceGate } from "@/lib/presence-gate";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  ariaLabel?: string;
  /** Disallow both outside dismissal and Escape while a critical action runs. */
  dismissable?: boolean;
}
export function Drawer({ open, onOpenChange, side = "right", children, className, backdropClassName, ariaLabel = "侧边面板", dismissable = true }: DrawerProps) {
  const reduce = useMotionPreference();
  const previousFocus = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && !panel.current?.contains(document.activeElement)) previousFocus.current = document.activeElement;
  }, [open]);
  const offscreen = side === "right" ? "100%" : "-100%";
  return <Dialog.Root open={open} onOpenChange={next => { if (next || dismissable) onOpenChange(next); }}>
    <AnimatePresence>
      {open && <Dialog.Portal key="drawer" forceMount>
        <PresenceGate>{({ gate }) => <>
          <Dialog.Overlay forceMount asChild>
            <motion.div {...gate} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : MOTION.exit.modal } }}
              transition={{ duration: reduce ? 0 : MOTION.duration.menu }}
              className={cn("fixed inset-0 z-50 bg-foreground/20", backdropClassName)} />
          </Dialog.Overlay>
          <Dialog.Content forceMount asChild aria-describedby={undefined}
            onEscapeKeyDown={event => { if (!dismissable) event.preventDefault(); }}
            onInteractOutside={event => { if (!dismissable) event.preventDefault(); }}
            onCloseAutoFocus={event => {
              event.preventDefault();
              const active = document.activeElement;
              // Do not steal focus from an element the user selected during the exit.
              if ((!active || active === document.body || panel.current?.contains(active)) && previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
            }}>
            <motion.aside {...gate} ref={panel} data-dw-drawer={side}
              initial={reduce ? false : { x: offscreen }} animate={{ x: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { x: offscreen, transition: { duration: MOTION.exit.drawer, ease: MOTION.ease.exit } }}
              transition={{ duration: reduce ? 0 : MOTION.duration.drawer, ease: MOTION.ease.enter }}
              className={cn("fixed inset-y-0 z-50 flex w-80 max-w-context-menu flex-col overflow-y-auto bg-card text-card-foreground shadow-tactile", side === "right" ? "right-0 border-l border-border" : "left-0 border-r border-border", className)}>
              <Dialog.Title className="sr-only">{ariaLabel}</Dialog.Title>
              {children}
            </motion.aside>
          </Dialog.Content>
        </>}</PresenceGate>
      </Dialog.Portal>}
    </AnimatePresence>
  </Dialog.Root>;
}
