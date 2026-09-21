import { useRef, type ReactNode } from "react";

// ── Styles ──────────────────────────────────────────────
// Auto-injected on first import. Idempotent (guarded by
// the element id) and SSR-safe (no-ops without document).
const __TRANSITION_STYLES = `
:root {
  --avatar-lift: -4px;
  --avatar-dur: 320ms;
  --avatar-scale: 1.05;
  --avatar-falloff: 0.45;
  --avatar-ease-in: cubic-bezier(0.22, 1, 0.36, 1);
  --avatar-ease-out: cubic-bezier(0.34, 3.85, 0.64, 1);
}

/* Hover-spring transition only — bring your own avatar/chip
   styling (size, shape, border, stacking, background). */
.t-avatar {
  transform-origin: center;
  /* translateY before scale so scale doesn't amplify the lift offset. */
  transform:
    translateY(var(--shift, 0px))
    scale(var(--scale-active, 1));
  transition: transform var(--avatar-dur) var(--avatar-ease-in);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .t-avatar { transition: none !important; transform: none !important; }
}
`;
if (typeof document !== "undefined" && !document.getElementById("transitions-p11")) {
  const __style = document.createElement("style");
  __style.id = "transitions-p11";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

// Pair with the CSS from the CSS tab.
// `items` is any list of React nodes (avatars, chips, badges, etc.) —
// this hook only owns the hover-spring transition. Each item is wrapped
// in a .t-avatar so it picks up the transform/transition rules from CSS.
//
// On mouseenter of any sibling, we write per-item:
//   --shift         = lift * pow(falloff, distance from hovered)
//   --scale-active  = scale on the hovered item, 1 elsewhere
// Direction-aware easing: we set transition-timing-function inline
// BEFORE the variable writes so the lift uses --avatar-ease-in
// (clean) and the return uses --avatar-ease-out (bouncy spring).
export function AvatarGroup({ items }: { items: ReactNode[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const setShifts = (activeIdx: number | null, phase: "in" | "out") => {
    if (!rootRef.current) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name: string, fb: string) =>
      cs.getPropertyValue(name).trim() || fb;

    const lift    = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale   = num("--avatar-scale", 1.05);
    const tf      = phase === "out"
      ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
      : ease("--avatar-ease-in",  "cubic-bezier(0.22, 1, 0.36, 1)");

    const els = rootRef.current.querySelectorAll<HTMLElement>(".t-avatar");
    els.forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty(
        "--shift",
        (lift * Math.pow(falloff, d)).toFixed(3) + "px"
      );
      el.style.setProperty(
        "--scale-active",
        i === activeIdx ? String(scale) : "1"
      );
    });
  };

  return (
    <div
      ref={rootRef}
      onMouseLeave={() => setShifts(null, "out")}
    >
      {items.map((node, i) => (
        <div
          key={i}
          className="t-avatar"
          onMouseEnter={() => setShifts(i, "in")}
        >
          {node}
        </div>
      ))}
    </div>
  );
}
