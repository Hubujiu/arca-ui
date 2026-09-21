import { useRef, type HTMLAttributes, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useMotionPreference } from '@/lib/motion-preference';
import { MOTION, pageKind, routeMotionKey, staggerDelay } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP);

/** Animate the leaf surface, never hold an old route or key/remount a live editor. */
export function PageMotion({ children, className }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation();
  const key = routeMotionKey(pathname);
  const kind = pageKind(pathname);
  const root = useRef<HTMLDivElement>(null);
  const reduce = useMotionPreference();
  const previous = useRef({ key, reduce });
  useGSAP(() => {
    const node = root.current;
    const preferenceChanged = previous.current.key === key && previous.current.reduce !== reduce;
    previous.current = { key, reduce };
    if (!node || reduce || preferenceChanged || document.hidden) return;
    node.dataset.dwAnimating = 'true';
    // Only opt-in headings/rails are translated. The page wrapper is opacity-only:
    // a transformed ancestor would change fixed drawers into element-relative ones.
    const targets = Array.from(node.querySelectorAll<HTMLElement>('[data-dw-enter]'))
      .filter(target => target.closest('[data-dw-route]') === node && !target.parentElement?.closest('[data-dw-enter]'));
    const timeline = gsap.timeline({ onComplete: () => { node.dataset.dwAnimating = 'false'; } });
    // The shell/page never fades: ContentStage owns each asynchronous surface.
    if (!targets.length) node.dataset.dwAnimating = 'false';
    for (const target of targets) {
      const role = target.dataset.dwEnter;
      const x = 0;
      const y = role === 'header' && kind !== 'document' ? Math.min(3, MOTION.distance.page) : 0;
      timeline.fromTo(target, { opacity: 0.8, x, y }, {
        opacity: 1, x: 0, y: 0, duration: MOTION.duration.page, ease: 'power2.out', clearProps: 'opacity,transform',
      }, role === 'rail' ? 0.02 : 0);
    }
    return () => { delete node.dataset.dwAnimating; };
  }, { scope: root, dependencies: [key, reduce], revertOnUpdate: true });
  return <div ref={root} data-dw-route={kind} className={cn('flex min-h-0 min-w-0 w-full flex-1 flex-col gap-inherit', className)}>{children}</div>;
}
export function MotionOutlet() { return <PageMotion><Outlet /></PageMotion>; }

type RegionProps = HTMLAttributes<HTMLDivElement> & {
  motionKey?: string | number;
  ready?: boolean;
  kind?: 'content' | 'stagger' | 'inspector';
};
/** Explicit Data ready / State change boundary. No DOM observers or delayed requests. */
export function MotionRegion({ motionKey = 'initial', ready = true, kind = 'content', children, className, ...props }: RegionProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useMotionPreference();
  const previous = useRef(reduce);
  useGSAP(() => {
    const preferenceChanged = previous.current !== reduce;
    previous.current = reduce;
    const node = root.current;
    if (!node || !ready || reduce || preferenceChanged || document.hidden || node.closest('[data-content-stage]')) return;
    // Protect chart/virtual-list transforms: this component owns only its wrapper
    // or its own direct children, never arbitrary descendants.
    const targets = kind === 'stagger'
      ? Array.from(node.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
        .filter(child => { const rect = child.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0; })
        .slice(0, MOTION.stagger.limit)
      : [node];
    node.dataset.dwAnimating = 'true';
    const timeline = gsap.timeline({ onComplete: () => { node.dataset.dwAnimating = 'false'; } });
    targets.forEach((target, index) => timeline.fromTo(target,
      { opacity: 0.6, ...(kind === 'stagger' ? { y: 2 } : {}) },
      { opacity: 1, ...(kind === 'stagger' ? { y: 0 } : {}), duration: MOTION.duration.content,
        ease: 'power2.out', clearProps: kind === 'stagger' ? 'opacity,transform' : 'opacity' },
      kind === 'stagger' ? staggerDelay(index) : 0));
    return () => { delete node.dataset.dwAnimating; };
  }, { scope: root, dependencies: [motionKey, ready, kind, reduce], revertOnUpdate: true });
  return <div {...props} ref={root} data-dw-region={kind} className={className}>{children}</div>;
}
