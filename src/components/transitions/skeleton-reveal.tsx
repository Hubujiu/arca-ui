import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Styles ──────────────────────────────────────────────
// Auto-injected on first import. Idempotent (guarded by
// the element id) and SSR-safe (no-ops without document).
const __TRANSITION_STYLES = `
:root {
  --pulse-dur: 1000ms;
  --pulse-count: 1;
  --pulse-min: 0.5;
  --reveal-dur: 400ms;
  --reveal-blur: 2px;
  --reveal-ease: ease-in-out;
}

/* The wrap stacks two layers on the same coordinates. The
   skeleton owns the cold pulse + the fade-out side of the
   reveal; the content owns the fade-in side. They share the
   same duration / ease so the swap reads as one motion. */
.t-skel { position: relative; }
.t-skel-skeleton,
.t-skel-content {
  position: absolute;
  inset: 0;
}

.t-skel-skeleton {
  z-index: 1;
  opacity: 1;
  filter: blur(0);
  transition:
    opacity var(--reveal-dur) var(--reveal-ease),
    filter  var(--reveal-dur) var(--reveal-ease);
}
.t-skel-content {
  z-index: 2;
  opacity: 0;
  filter: blur(var(--reveal-blur));
  transition:
    opacity var(--reveal-dur) var(--reveal-ease),
    filter  var(--reveal-dur) var(--reveal-ease);
}
.t-skel.is-revealed .t-skel-skeleton {
  opacity: 0;
  filter: blur(var(--reveal-blur));
}
.t-skel.is-revealed .t-skel-content {
  opacity: 1;
  filter: blur(0);
}
/* Snap-back when replaying: kill transitions so the reverse
   (revealed → skeleton) is instant. Drop ".is-resetting"
   after a forced reflow and the next reveal animates again. */
.t-skel.is-resetting .t-skel-skeleton,
.t-skel.is-resetting .t-skel-content {
  transition: none !important;
}

/* Pulse: place the animation on the bar/avatar children, not
   on the skeleton itself, so the skeleton's opacity / filter
   stay free for the cross-fade transition above. */
.t-skel-skeleton.is-pulsing > * {
  animation: t-skel-pulse var(--pulse-dur) ease-in-out var(--pulse-count);
}
@keyframes t-skel-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: var(--pulse-min); }
}

@media (prefers-reduced-motion: reduce) {
  .t-skel-skeleton, .t-skel-content {
    transition: none !important;
  }
  .t-skel-skeleton.is-pulsing > * { animation: none !important; }
}
`;
if (typeof document !== "undefined" && !document.getElementById("transitions-p14")) {
  const __style = document.createElement("style");
  __style.id = "transitions-p14";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

// Pair with the CSS from the CSS tab.
// `loading` is yours to drive (data fetch, route change, etc.).
// On every fresh load → ready cycle, call `replay()` to flash the
// skeleton again before revealing the content.
export function SkeletonReveal({
  skeleton,
  children,
}: {
  skeleton: ReactNode
  children: ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const skelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const dur = readMs("--pulse-dur", 1000);
    const count = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--pulse-count")
    ) || 1;
    timerRef.current = window.setTimeout(() => {
      setRevealed(true);
      timerRef.current = null;
    }, dur * count);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const replay = () => {
    const wrap = wrapRef.current;
    const skel = skelRef.current;
    if (!wrap || !skel) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // Snap-back: kill transitions for one frame so the reverse
    // (revealed → skeleton) is instant.
    wrap.classList.add("is-resetting");
    setRevealed(false);
    skel.classList.remove("is-pulsing");
    void skel.offsetWidth;
    wrap.classList.remove("is-resetting");
    skel.classList.add("is-pulsing");
    const dur = readMs("--pulse-dur", 1000);
    const count = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--pulse-count")
    ) || 1;
    timerRef.current = window.setTimeout(() => {
      setRevealed(true);
      timerRef.current = null;
    }, dur * count);
  };

  return (
    <>
      <button type="button" onClick={replay}>Animate</button>
      <div
        ref={wrapRef}
        className={"t-skel" + (revealed ? " is-revealed" : "")}
      >
        <div ref={skelRef} className="t-skel-skeleton is-pulsing" aria-hidden="true">
          {skeleton}
        </div>
        <div className="t-skel-content">{children}</div>
      </div>
    </>
  );
}

function readMs(name: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}
