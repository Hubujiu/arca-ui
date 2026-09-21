import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOTION, pageKind, routeMotionKey, staggerDelay, surfaceMotion } from "../src/lib/motion-tokens";

test("functional motion has a bounded timing hierarchy and faster exits", () => {
  assert.ok(MOTION.duration.menu < MOTION.duration.modal);
  assert.ok(MOTION.duration.modal < MOTION.duration.drawer);
  for (const kind of ["menu", "modal", "drawer", "disclosure", "tooltip"] as const) assert.ok(MOTION.exit[kind] < MOTION.duration[kind]);
  assert.ok(Math.max(...Object.values(MOTION.duration)) <= 0.3);
});
test("stagger stops at six items and never queues a long list", () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(5), 0.12);
  assert.equal(staggerDelay(6), 0);
  assert.equal(staggerDelay(10000), 0);
  assert.equal(staggerDelay(-1), 0);
  assert.ok(MOTION.duration.content + MOTION.stagger.budget <= 0.42);
});
test("reduced overlays are immediately visible, stable and have zero exit duration", () => {
  for (const kind of ["menu", "modal"] as const) {
    const profile = surfaceMotion(kind, true);
    assert.equal(profile.initial, false);
    assert.equal(profile.transition.duration, 0);
    assert.equal(profile.exit.transition.duration, 0);
    assert.equal(profile.exit.scale, 1);
    assert.equal(profile.exit.y, 0);
  }
  assert.ok((surfaceMotion("menu", false, "top").initial as { y: number }).y > 0);
  assert.ok((surfaceMotion("menu", false, "bottom").initial as { y: number }).y < 0);
});
test("route families distinguish document reading, editors and detail", () => {
  assert.equal(pageKind("/documents/12"), "document");
  assert.equal(pageKind("/forms/new"), "editor");
  assert.equal(pageKind("/apps/a/tables/t/workflow"), "editor");
  assert.equal(pageKind("/workflows/w"), "detail");
  assert.equal(pageKind("/approvals/mine"), "workspace");
  assert.equal(routeMotionKey("/forms/manage/"), "/forms/manage");
});
test("leaf route motion does not keep stale routes or remount form state", () => {
  const source = readFileSync("frontend/packages/business-shared/src/shared/design-system/motion/PageMotion.tsx", "utf8");
  assert.doesNotMatch(source, /key=|AnimatePresence|MutationObserver|ScrollTrigger|setTimeout/);
  assert.match(source, /revertOnUpdate: true/);
  assert.match(source, /const \{ pathname \} = useLocation/);
  assert.match(source, /\.slice\(0, MOTION.stagger.limit\)/);
  assert.match(source, /if \(!node \|\| !ready \|\| reduce/);
});
test("dense business overlays no longer use clip or blur entrance reveals", () => {
  for (const file of ["center-morph-modal.tsx", "context-menu.tsx", "animated-toast-stack.tsx", "tooltip.tsx"]) {
  const source = readFileSync(`frontend/packages/business-shared/src/components/motion/${file}`, "utf8");
    assert.doesNotMatch(source, /clipPath:|filter:.*blur\(/, file);
  }
  const preference = readFileSync("frontend/packages/business-shared/src/lib/motion-preference.tsx", "utf8");
  assert.match(preference, /requested \|\| Boolean\(system\)/);
});

test("context menu portal container does not cast shadow when closed", () => {
  const source = readFileSync("frontend/packages/business-shared/src/components/motion/context-menu.tsx", "utf8");
  // The outer fixed container should not have shadow-tactile, or shadow should be on the menu content / conditioned on open
  assert.doesNotMatch(source, /className=\{\s*cn\(\s*"fixed z-100 shadow-tactile"/);
});

