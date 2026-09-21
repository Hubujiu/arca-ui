import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceUIProvider, useWorkspaceUI, type ResourceTableProps } from "../src/shared/design-system/workspace/WorkspaceUI";

test("workspace renderers are replaceable without changing a feature's data contract", () => {
  const Replacement = ({ items }: ResourceTableProps) => createElement("section", { "data-adapter": "replacement" }, `items:${items.length}`);
  function Consumer() { const UI = useWorkspaceUI(); return createElement(UI.ResourceTable, { items: [] }); }
  const html = renderToStaticMarkup(createElement(WorkspaceUIProvider, { components: { ResourceTable: Replacement } }, createElement(WorkspaceUIProvider, null, createElement(Consumer))));
  assert.match(html, /data-adapter="replacement"/);
  assert.match(html, /items:0/);
});
test("one staged data surface owns knowledge entry, not the entire page and every row", () => {
  const page = readFileSync("frontend/modules/knowledge/src/features/knowledge/KnowledgePage.tsx", "utf8");
  assert.match(page, /<ContentStage ready=\{dataReady\}/);
  assert.match(page, /<UI.ResourceTable items=\{items\}/);
  assert.doesNotMatch(page, /MorphingSearch|MotionRegion|initial=|animate=/);
  const motion = readFileSync("frontend/packages/business-shared/src/shared/design-system/motion/PageMotion.tsx", "utf8");
  assert.doesNotMatch(motion, /fromTo\(node,/);
});
test("appearance is fixed by the module host and absent from business settings", () => {
  const provider = readFileSync("frontend/packages/business-shared/src/shared/design-system/ThemeProvider.tsx", "utf8");
  assert.match(provider, /mode: "light"/);
  assert.match(provider, /const dark = false/);
  assert.doesNotMatch(readFileSync("frontend/modules/knowledge/src/features/knowledge/SettingsPage.tsx", "utf8"), /ThemeSettingsPanel/);
  for (const path of ["frontend/modules/forms/src/features/forms/FormLayout.tsx", "frontend/packages/business-shared/src/lowcode/common.tsx"]) assert.doesNotMatch(readFileSync(path, "utf8"), /ThemeSettingsButton/);
});
test("catalog generations are cancelable, session-scoped and have explicit ready/error states", () => {
  const source = readFileSync("frontend/modules/knowledge/src/features/knowledge/KnowledgeSession.tsx", "utf8");
  assert.match(source, /AbortController/);
  assert.match(source, /epoch !== generation.current/);
  assert.match(source, /documentsInSpace\(selected, signal\)/);
  assert.match(source, /portal-permissions-changed/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
