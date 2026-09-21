/** Seconds, pixels and bounded choreography. Product rules, not per-page guesses. */
export const MOTION = Object.freeze({
  duration: { feedback: 0.09, tooltip: 0.1, menu: 0.14, content: 0.28, page: 0.3, modal: 0.22, drawer: 0.26, disclosure: 0.2 },
  exit: { tooltip: 0.08, menu: 0.09, modal: 0.14, drawer: 0.18, disclosure: 0.14 },
  ease: { enter: [0.16, 1, 0.3, 1], exit: [0.4, 0, 1, 1], change: [0.4, 0, 0.2, 1] },
  distance: { page: 8, detail: 12, menu: 4, modal: 8, toast: 12 },
  stagger: { step: 0.024, limit: 6, budget: 0.12 },
  tooltipIntent: 280,
} as const);
export type PageKind = 'workspace' | 'detail' | 'editor' | 'document';
export function pageKind(path: string): PageKind {
  if (/^\/documents\/[^/]+/.test(path)) return 'document';
  if (/^\/forms\/(?:new|[^/]+\/edit)\/?$/.test(path) || /^\/apps\/[^/]+\/tables\/[^/]+\/(design|workflow)\/?$/.test(path)) return 'editor';
  if (/^\/(?:workflows|approvals)\/[^/]+/.test(path) && !path.endsWith('/mine')) return 'detail';
  return 'workspace';
}
/** Query/hash edits are not navigation animations; they must preserve input focus. */
export function routeMotionKey(pathname: string): string { return pathname.replace(/\/$/, '') || '/'; }
export function staggerDelay(index: number): number {
  return index >= 0 && index < MOTION.stagger.limit ? Math.min(index * MOTION.stagger.step, MOTION.stagger.budget) : 0;
}
export function surfaceMotion(kind: 'modal' | 'menu', reduced: boolean, side: 'top' | 'bottom' = 'bottom') {
  const distance = kind === 'modal' ? MOTION.distance.modal : MOTION.distance.menu * (side === 'top' ? 1 : -1);
  return {
    initial: reduced ? false as const : { opacity: 0, y: distance, scale: kind === 'modal' ? 0.985 : 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: reduced ? 0 : distance / 2, scale: reduced ? 1 : 0.99,
      transition: { duration: reduced ? 0 : MOTION.exit[kind], ease: MOTION.ease.exit } },
    transition: { duration: reduced ? 0 : MOTION.duration[kind], ease: MOTION.ease.enter },
  };
}
