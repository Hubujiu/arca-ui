/** Only editor routes may be launched. No arbitrary/external URLs or token copying. */
export function isDesignerPath(path: string): boolean {
  return /^\/forms\/(?:new|[^/]+\/edit)\/?$/.test(path) || /^\/apps\/[^/]+\/tables\/[^/]+\/(?:design|workflow)\/?$/.test(path);
}
export function designerUrl(to: string, baseHref: string, origin: string): string {
  if (!to.startsWith("/") || to.startsWith("//") || to.includes("\\")) throw new Error("无效的编辑器地址");
  const route = new URL(to, origin);
  if (route.origin !== origin || !isDesignerPath(route.pathname)) throw new Error("只能打开本站的表单或审批编辑器");
  const base = new URL(baseHref, origin);
  if (base.origin !== origin) throw new Error("编辑器必须与应用同源");
  base.pathname = base.pathname.replace(/\/$/, "") + route.pathname;
  base.search = route.search;
  base.hash = route.hash;
  return base.href;
}
export function reserveDesignerWindow(): Window | null {
  const width = Math.max(320, window.screen.availWidth || window.innerWidth);
  const height = Math.max(320, window.screen.availHeight || window.innerHeight);
  const display = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = display.availLeft ?? 0, top = display.availTop ?? 0;
  // Reserve synchronously during the gesture, especially before a create-table request.
  // Do not pass noopener as a feature: some browsers then return null even on success.
  const child = window.open("about:blank", "_blank", `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  if (child) {
    child.opener = null;
    child.document.title = "正在打开配置窗口 · DocWeave";
    child.document.body.textContent = "正在准备编辑器…";
  }
  return child;
}
export function navigateDesignerWindow(child: Window | null, href: string): boolean {
  if (!child || child.closed) return false;
  try { child.location.replace(href); child.focus(); return true; }
  catch { try { child.close(); } catch { /* The browser owns the window. */ } return false; }
}
