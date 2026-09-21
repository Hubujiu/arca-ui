"use client";
import { MOTION } from "@/lib/motion-tokens";
import { useMotionPreference as useReducedMotion } from "@/lib/motion-preference";

import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  cloneElement,
  isValidElement,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useDismiss } from "@/lib/hooks/use-dismiss";
import { useHoverGesture } from "@/lib/hooks/use-hover-gesture";
import { useTapGesture } from "@/lib/hooks/use-tap-gesture";
import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: Side;
  /** Delay before showing (ms). Default 280. */
  delay?: number;
  className?: string;
  /** Classes for the outer wrapper span. Use to fix baseline / fill parent. */
  wrapperClassName?: string;
}

// Gap between trigger and tooltip, in px.
const GAP = 8;
const VIEWPORT_PAD = 8;
const SIZE_FALLBACK = { width: 120, height: 36 };

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function spaceOn(side: Side, trigger: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  switch (side) {
    case "top":
      return trigger.top - GAP - VIEWPORT_PAD;
    case "bottom":
      return vh - trigger.bottom - GAP - VIEWPORT_PAD;
    case "left":
      return trigger.left - GAP - VIEWPORT_PAD;
    case "right":
      return vw - trigger.right - GAP - VIEWPORT_PAD;
  }
}

function needOn(side: Side, size: { width: number; height: number }) {
  return side === "top" || side === "bottom" ? size.height : size.width;
}

function pickSide(
  preferred: Side,
  trigger: DOMRect,
  size: { width: number; height: number },
): Side {
  if (spaceOn(preferred, trigger) >= needOn(preferred, size)) return preferred;
  const opposite = OPPOSITE[preferred];
  if (spaceOn(opposite, trigger) >= needOn(opposite, size)) return opposite;
  const order: Side[] = [preferred, opposite, "bottom", "top", "right", "left"];
  return order.reduce((best, next) =>
    spaceOn(next, trigger) - needOn(next, size) >
    spaceOn(best, trigger) - needOn(best, size)
      ? next
      : best,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coordsFor(
  side: Side,
  trigger: DOMRect,
  size: { width: number; height: number },
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = trigger.left + trigger.width / 2;
  const cy = trigger.top + trigger.height / 2;
  if (side === "top" || side === "bottom") {
    const half = size.width / 2;
    const left = clamp(cx, VIEWPORT_PAD + half, vw - VIEWPORT_PAD - half);
    return {
      top: side === "top" ? trigger.top - GAP : trigger.bottom + GAP,
      left,
    };
  }
  const half = size.height / 2;
  const top = clamp(cy, VIEWPORT_PAD + half, vh - VIEWPORT_PAD - half);
  return {
    top,
    left: side === "left" ? trigger.left - GAP : trigger.right + GAP,
  };
}

// Centering transform for the fixed-positioned anchor point, per side.
const anchorTransform: Record<Side, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};

const transformOrigin: Record<Side, string> = {
  top: "center bottom",
  bottom: "center top",
  left: "right center",
  right: "left center",
};

// Offset is in the direction *away* from the trigger — content originates near
// the trigger and rises into resting position.
const offsetFrom: Record<Side, { x?: number; y?: number }> = {
  top: { y: 8 },
  bottom: { y: -8 },
  left: { x: 8 },
  right: { x: -8 },
};

function buildVariants(side: Side): Variants {
  const offset = offsetFrom[side];
  return {
    initial: { opacity: 0, x: (offset.x ?? 0) / 2, y: (offset.y ?? 0) / 2 },
    animate: { opacity: 1, x: 0, y: 0, transition: { duration: MOTION.duration.tooltip, ease: MOTION.ease.enter } },
    exit: { opacity: 0, transition: { duration: MOTION.exit.tooltip, ease: MOTION.ease.exit } },
  };
}
const REDUCED_VARIANTS: Variants = {
  initial: { opacity: 1, x: 0, y: 0 },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// Once any tooltip has just closed, neighbouring tooltips open without the
// initial delay — moving along a toolbar feels instant after the first one.
const WARM_WINDOW_MS = 300;
let lastHiddenAt = 0;

export function Tooltip({
  content,
  children,
  side = "top",
  delay = MOTION.tooltipIntent,
  className,
  wrapperClassName,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [resolvedSide, setResolvedSide] = useState<Side>(side);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef(SIZE_FALLBACK);
  const hover = useHoverGesture();
  const reduce = useReducedMotion();

  // Anchor point in viewport coords, on the edge of the trigger facing the
  // side that still fits. Position:fixed means these viewport coords place the
  // tooltip directly, so it escapes every ancestor's stacking context and overflow.
  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const trigger = el.getBoundingClientRect();
    const box = tooltipRef.current;
    const size = box
      ? { width: box.offsetWidth, height: box.offsetHeight }
      : sizeRef.current;
    if (box) sizeRef.current = size;
    const nextSide = pickSide(side, trigger, size);
    const nextCoords = coordsFor(nextSide, trigger, size);
    setResolvedSide((prev) => (prev === nextSide ? prev : nextSide));
    setCoords((prev) =>
      prev && prev.top === nextCoords.top && prev.left === nextCoords.left
        ? prev
        : nextCoords,
    );
  }, [side]);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const warm = Date.now() - lastHiddenAt < WARM_WINDOW_MS;
    timer.current = setTimeout(
      () => {
        place();
        setOpen(true);
      },
      warm ? 0 : delay,
    );
  }, [delay, place]);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (open) lastHiddenAt = Date.now();
    setOpen(false);
  }, [open]);

  // A finger never hovers, and Safari does not focus a button on tap either, so
  // the label is only reachable if the tap itself opens the tooltip. A click
  // carries no pointerType, so the pointerdown that preceded it is what says
  // whether this was a tap; keyboard activation arrives with no pointerdown at
  // all, and focus has already shown the label there.
  const tap = useTapGesture<boolean>();

  const toggleOnTap = useCallback(() => {
    const gesture = tap.take();
    if (!gesture || gesture.pointerType === "mouse") return;
    if (gesture.state) {
      hide();
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    place();
    setOpen(true);
  }, [hide, place, tap]);

  // ...and closed again by the next tap that lands somewhere else. The label
  // covers nothing interactive, so that tap passes through to what it hit.
  useDismiss(open, hide, anchorRef);

  // Keep the tooltip pinned to the trigger while it's open and the page scrolls
  // or resizes (fixed coords are viewport-relative).
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place, content]);

  const variants = useMemo(
    () => (reduce ? REDUCED_VARIANTS : buildVariants(resolvedSide)),
    [reduce, resolvedSide],
  );

  if (!isValidElement(children)) return children;

  // The label describes the trigger, so it has to name the trigger itself.
  // Everything else the tooltip needs is read off the anchor below instead of
  // cloned on: a handler written onto the child is the child's handler as far
  // as that child can tell, and a component that owns its activation —
  // hard-wiring onClick and spreading the rest of its props over it, as
  // ThemeToggle does — then runs the tooltip's instead of its own. Composing
  // with `props.onClick` cannot save it either, because a component element's
  // props hold nothing the component does internally.
  const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
    "aria-describedby": id,
  });

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the anchor is not a
          control — it observes the trigger it wraps. Every event listed reaches
          it on its own (pointerdown/click/keydown/pointercancel bubble, focus
          and blur arrive as focusin/focusout, and enter/leave are derived from
          pointerover/pointerout along a path the anchor is on), so the trigger
          keeps every handler it came with. */}
      <span
        ref={anchorRef}
        className={cn("relative inline-flex align-middle", wrapperClassName)}
        // Pointer events, not the mouse pair: a tap fires compatibility
        // mouseenter/mouseleave that carry no pointerType, which raced the tap
        // path into opening and closing the same label.
        onPointerEnter={(event: PointerEvent) => {
          if (hover.enter(event)) show();
        }}
        onPointerLeave={(event: PointerEvent) => {
          if (hover.leave(event)) hide();
        }}
        onFocus={show}
        onBlur={hide}
        onPointerDown={(event: PointerEvent) => tap.start(event, open)}
        // A gesture the platform took away sends no click, and a key press
        // starts an activation that never had a pointer behind it. Either way
        // the record has to go, or the next click reads a finger that has long
        // since lifted.
        onPointerCancel={tap.drop}
        onKeyDown={tap.drop}
        onClick={toggleOnTap}
      >
        {trigger}
      </span>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && coords ? (
                <span
                  aria-hidden
                  className="pointer-events-none fixed z-9999"
                  style={{
                    top: coords.top,
                    left: coords.left,
                    transform: anchorTransform[resolvedSide],
                  }}
                >
                  <motion.span
                    ref={tooltipRef}
                    id={id}
                    role="tooltip"
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ transformOrigin: transformOrigin[resolvedSide] }}
                    className={cn(
                      "block whitespace-nowrap rounded-control border border-border bg-background px-2.5 py-1 text-caption font-medium text-foreground shadow-tactile",
                      className,
                    )}
                  >
                    {content}
                  </motion.span>
                </span>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
