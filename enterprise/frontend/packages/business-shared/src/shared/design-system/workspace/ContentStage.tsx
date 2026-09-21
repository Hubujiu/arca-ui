import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMotionPreference } from "@/lib/motion-preference";

gsap.registerPlugin(useGSAP);
export const STAGE = { pendingDelay: 180, placeholderMinimum: 220, enter: 0.3 } as const;

/** Only this region has animation ownership. Its parent must not fade/translate.
 * Short requests skip the skeleton. A shown skeleton stays long enough to read.
 * Loading/error/empty are distinct; old-resource data is never kept on screen.
 */
export function ContentStage({ ready, error, identity = "default", children, placeholder, minHeight = 480 }: {
  ready: boolean; error?: ReactNode; identity?: string; children: ReactNode; placeholder?: ReactNode; minHeight?: number;
}) {
  const [stage, setStage] = useState<{ identity: string; phase: "pending" | "skeleton" | "ready"; since: number }>({ identity, phase: ready ? "ready" : "pending", since: 0 });
  const current = useRef(stage); current.current = stage;
  const root = useRef<HTMLDivElement>(null);
  const reduce = useMotionPreference();
  const displayed = stage.identity === identity ? stage.phase : "pending";
  const visible = ready && displayed === "ready";
  const previousVisible = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (error) return;
    const value = current.current.identity === identity ? current.current : { identity, phase: "pending" as const, since: 0 };
    if (value.identity !== current.current.identity) setStage(value);
    if (!ready) {
      if (value.phase !== "skeleton") {
        setStage({ identity, phase: "pending", since: 0 });
        timer = setTimeout(() => setStage({ identity, phase: "skeleton", since: performance.now() }), STAGE.pendingDelay);
      }
    } else if (value.phase !== "ready") {
      const wait = value.phase === "skeleton" ? Math.max(0, STAGE.placeholderMinimum - (performance.now() - value.since)) : 0;
      if (wait) timer = setTimeout(() => setStage({ identity, phase: "ready", since: 0 }), wait);
      else setStage({ identity, phase: "ready", since: 0 });
    }
    return () => clearTimeout(timer);
  }, [ready, identity, error]);
  useGSAP(() => {
    const wasVisible = previousVisible.current; previousVisible.current = visible;
    if (!visible || wasVisible || reduce || !root.current || document.hidden) return;
    // No row stagger, blur, scale or parent opacity multiplication.
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: STAGE.enter, ease: "power2.out", clearProps: "opacity" });
  }, { scope: root, dependencies: [visible, reduce, identity], revertOnUpdate: true });
  return <div className="dw-content-stage" data-content-stage={error ? "error" : visible ? "ready" : displayed} aria-busy={!ready && !error} style={{ "--stage-min-height": `${minHeight}px` } as CSSProperties}>
    {error ? <div role="alert" className="p-8">{error}</div> : visible ? <div ref={root} data-stage-content>{children}</div> : <div aria-label="正在加载内容" role="status" className="dw-stage-placeholder dw-content-stage">
      {displayed === "skeleton" ? placeholder ?? <TablePlaceholder /> : <span className="sr-only">正在准备内容</span>}
    </div>}
  </div>;
}
export function TablePlaceholder() {
  return <div data-table-placeholder aria-hidden="true"><div className="dw-skeleton-heading" />{Array.from({ length: 7 }, (_, index) => <div className="dw-skeleton-row" key={index}><i /><span /><span /><span /></div>)}</div>;
}
export function RoutePlaceholder() { return <ContentStage ready={false}><span /></ContentStage>; }
