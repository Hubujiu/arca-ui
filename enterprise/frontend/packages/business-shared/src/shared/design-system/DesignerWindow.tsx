import { MOTION } from "@/lib/motion-tokens";
import { MotionOutlet } from "@/shared/design-system/motion/PageMotion";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PotlabIcon } from "@/shared/icons";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button, EmptyState } from "@/shared/ui";
import { useTheme } from "./ThemeProvider";

gsap.registerPlugin(useGSAP);
/** Reused outside portal/form/lowcode chrome, without changing API permission checks. */
export function DesignerWindow() {
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [error, setError] = useState("");
  const { reducedMotion } = useTheme();
  const previousMotion = useRef(reducedMotion);
  const workflow = /\/workflow\/?$/.test(location.pathname);
  const title = workflow ? "审批流程配置" : "表单配置";
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · DocWeave`;
    heading.current?.focus({ preventScroll: true });
    return () => { document.title = previous; };
  }, [title]);
  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useGSAP(() => {
    const preferenceChanged = previousMotion.current !== reducedMotion;
    previousMotion.current = reducedMotion;
    if (reducedMotion || preferenceChanged || document.hidden) return;
    // ThemeProvider already combines OS + user preference. One scoped context
    // handles cancellation; changing a preference never replays an entrance.
    gsap.from("[data-editor-toolbar]", {
      opacity: 0, y: -MOTION.distance.menu, duration: MOTION.duration.modal,
      ease: "power2.out", clearProps: "opacity,transform",
    });
  }, { scope: root, dependencies: [reducedMotion], revertOnUpdate: true });
  async function toggleFullscreen() {
    setError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setError("此浏览器不支持原生全屏；编辑器已使用完整页面空间。");
    } catch { setError("浏览器未允许进入全屏；你仍可在当前独立窗口中完成配置。"); }
  }
  return <div ref={root} className="flex min-h-dvh w-full min-w-0 flex-col bg-ui-ground text-ui-ink">
    <header data-editor-toolbar className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ui-border bg-ui-surface px-4 py-3 sm:px-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-control bg-accent text-accent-foreground">
          <PotlabIcon name={workflow ? "Branch" : "FilePen"} size={20} />
        </span>
        <div>
          <h1 ref={heading} tabIndex={-1} className="text-title font-semibold outline-none">{title}</h1>
          <p className="text-caption text-ui-muted">独立编辑窗口 · 未保存内容将在离开时提醒</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => void toggleFullscreen()}>
          <PotlabIcon name={fullscreen ? "Zoom Out" : "Maximize"} size={16} />
          {fullscreen ? "退出全屏" : "进入全屏"}
        </Button>
      </div>
    </header>
    {error && <p role="status" className="border-b border-ui-border px-4 py-3 text-body text-ui-muted">{error}</p>}
    <main className="min-w-0 flex-1"><Suspense fallback={<div className="p-8"><EmptyState loading title="正在打开配置画布…" /></div>}><MotionOutlet /></Suspense></main>
  </div>;
}
