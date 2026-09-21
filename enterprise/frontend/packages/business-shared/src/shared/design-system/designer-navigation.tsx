import { useCallback } from "react";
import { Link, useHref, type LinkProps } from "react-router-dom";
import { toast } from "@/shared/toast";
import { designerUrl, isDesignerPath, navigateDesignerWindow, reserveDesignerWindow } from "./designer-window-core";
export { reserveDesignerWindow } from "./designer-window-core";

export function useDesignerNavigation() {
  const baseHref = useHref("/");
  return useCallback((to: string, reserved?: Window | null): boolean => {
    try {
      const href = designerUrl(to, baseHref, window.location.origin);
      const child = reserved === undefined ? reserveDesignerWindow() : reserved;
      if (navigateDesignerWindow(child, href)) return true;
      toast.error("配置窗口未能打开。请允许此站点弹出窗口，然后重新点击设计入口；原页面已保留。");
    } catch (error) {
      reserved?.close();
      toast.error(error instanceof Error ? error.message : "无法打开配置窗口");
    }
    return false;
  }, [baseHref]);
}
/** Launch links only; internal editor navigation stays in its existing window. */
export function DesignerLink({ to, children, onClick, ...props }: LinkProps) {
  const openDesigner = useDesignerNavigation();
  const path = typeof to === "string" ? to.split(/[?#]/)[0] : to.pathname ?? "";
  const launches = isDesignerPath(path);
  const destination = typeof to === "string" ? to : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
  return <Link {...props} to={to} target={launches ? "_blank" : props.target} rel={launches ? "noopener noreferrer" : props.rel} onClick={event => {
    onClick?.(event);
    if (!launches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDesigner(destination);
  }}>{children}{launches && <span className="sr-only">（在新窗口打开）</span>}</Link>;
}
