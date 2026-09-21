import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

test("workflow chrome and nodes consume semantic colors instead of a private palette", () => {
  const source = readFileSync("frontend/packages/business-shared/src/lowcode/WorkflowDesigner.tsx", "utf8");
  assert.doesNotMatch(source, /#[\da-f]{3,8}\b/i);
  assert.doesNotMatch(source, /(?:bg|text|border)-(?:violet|purple|blue|amber|emerald)-\d/);
  for (const token of ["primary-text", "warning", "success", "muted-foreground"]) assert.ok(source.includes(`var(--${token})`), `${token} is a semantic role`);
});
test("interface source files cannot reintroduce legacy filled SVG imports", () => {
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.tsx?$/.test(entry.name)) assert.doesNotMatch(readFileSync(path, "utf8"), /(?:from\s*|import\s*\()["'][^"']*assets\/filled\//, path);
    }
  }
  visit("frontend/packages/business-shared/src");
  visit("frontend/modules");
});
