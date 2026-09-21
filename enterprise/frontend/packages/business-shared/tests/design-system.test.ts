import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, normalizeHex, normalizeAppearance, parseAppearance, themeTokens, contrast } from "../src/shared/design-system/theme-core";
import { designerUrl, isDesignerPath, navigateDesignerWindow } from "../src/shared/design-system/designer-window-core";

test("default brand colors remain exact and preferences are versioned", () => {
  assert.equal(DEFAULT_APPEARANCE.primary, "#3B3F46");
  assert.equal(DEFAULT_APPEARANCE.accent, "#D1D3D6");
  assert.equal(APPEARANCE_KEY, "docweave.appearance.v1");
  for (const dark of [true, false]) {
    const t = themeTokens({ ...DEFAULT_APPEARANCE }, dark);
    assert.equal(t["--primary"], DEFAULT_APPEARANCE.primary);
    assert.equal(t["--accent"], DEFAULT_APPEARANCE.accent);
  }
});
test("hex normalization rejects CSS injection and malformed storage recovers", () => {
  assert.equal(normalizeHex(" abc "), "#AABBCC");
  assert.equal(normalizeHex("#a1B2c3"), "#A1B2C3");
  for (const value of ["red", "url(https://example.com)", "#12345678", "#x01234", 0, null, "var(--x)"]) assert.equal(normalizeHex(value), undefined);
  for (const raw of [null, "bad JSON", "null", '"string"', "[]"]) assert.deepEqual(parseAppearance(raw), DEFAULT_APPEARANCE);
  assert.deepEqual(normalizeAppearance({ primary: "#abc", accent: "invalid", mode: "dark", motion: "reduced" }), { ...DEFAULT_APPEARANCE, primary: "#AABBCC", mode: "dark", motion: "reduced" });
});
test("text and focus contrast hold for extremes and 256 deterministic custom palettes", () => {
  const values = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#265BFF", "#C0C4C3"];
  let seed = 739;
  for (let i = 0; i < 256; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; values.push("#" + (seed & 0xffffff).toString(16).padStart(6, "0")); }
  for (const dark of [false, true]) for (let i = 0; i < values.length; i++) {
    const t = themeTokens({ ...DEFAULT_APPEARANCE, primary: values[i], accent: values[(i + 73) % values.length] }, dark);
    for (const role of ["primary", "accent", "primary-hover", "accent-hover", "secondary"]) assert.ok(contrast(t[`--${role}`], t[`--${role}-foreground`]) >= 4.5, `${role} text: ${values[i]}`);
    for (const surface of ["background", "card", "muted"]) for (const ink of ["primary-text", "muted-foreground", "foreground"]) assert.ok(contrast(t[`--${ink}`], t[`--${surface}`]) >= 4.5, `${ink} on ${surface}`);
    for (const surface of ["background", "card"]) assert.ok(contrast(t["--ring"], t[`--${surface}`]) >= 3);
    for (const surface of ["background", "card", "muted", "ui-accent-soft", "ui-accent-hover"]) {
      for (const ink of ["ui-accent-ink", "ui-muted-ink", "ui-status-success", "ui-status-warning", "ui-status-danger", "ui-status-info"]) {
        assert.ok(contrast(t[`--${ink}`], t[`--${surface}`]) >= 4.5, `${ink} on ${surface}: ${values[i]}`);
      }
    }
    for (const surface of ["primary", "primary-hover"]) {
      assert.ok(contrast(t["--ui-icon-inverse-accent"], t[`--${surface}`]) >= 3, `inverse accent on ${surface}: ${values[i]}`);
    }
    assert.ok(contrast(t["--ui-icon-accent-on-ink"], t["--foreground"]) >= 3);
    assert.equal(t["--potlab-accent"], "var(--ui-accent-ink)");
  }
});
test("editor paths are narrowly scoped; data entry stays in its original window", () => {
  for (const path of ["/forms/new", "/forms/f/edit", "/apps/a/tables/t/design", "/apps/a/tables/t/workflow"]) assert.ok(isDesignerPath(path));
  for (const path of ["/forms/f/fill", "/apps/a", "/workflows/w", "/forms/manage", "/apps/a/tables/t/design/other", "//example.com"]) assert.equal(isDesignerPath(path), false);
});
test("designer URL keeps the host basename but cannot launch an external destination", () => {
  assert.equal(designerUrl("/apps/a/tables/t/design?panel=automation", "/portal/", "https://example.com"), "https://example.com/portal/apps/a/tables/t/design?panel=automation");
  assert.equal(designerUrl("/forms/new", "/", "https://example.com"), "https://example.com/forms/new");
  for (const path of ["https://evil.com/forms/new", "//evil.com/forms/new", "/\\evil.com/forms/new", "/admin"]) assert.throws(() => designerUrl(path, "/", "https://example.com"));
  assert.throws(() => designerUrl("/forms/new", "https://evil.com/", "https://example.com"));
});
test("blocked, closed or inaccessible popups fail safely without changing the parent", () => {
  assert.equal(navigateDesignerWindow(null, "https://example.com/forms/new"), false);
  assert.equal(navigateDesignerWindow({ closed: true } as Window, "https://example.com/forms/new"), false);
  const events: string[] = [];
  const child = { closed: false, location: { replace: (href: string) => events.push(href) }, focus: () => events.push("focus") } as unknown as Window;
  assert.equal(navigateDesignerWindow(child, "https://example.com/forms/new"), true);
  assert.deepEqual(events, ["https://example.com/forms/new", "focus"]);
});
test("icon adapters have no filled family and editor routes are separated from portal chrome", () => {
  const readShared = (path: string) => readFileSync(`frontend/packages/business-shared/src/${path}`, "utf8");
  for (const path of ["shared/icons/index.tsx", "shared/icons/file-kind.tsx", "shared/icons/motion/stateful.tsx"]) assert.doesNotMatch(readShared(path), /fill-current|assets\/filled|dangerouslySetInnerHTML/);
  const formsApp = readFileSync("frontend/modules/forms/src/App.tsx", "utf8");
  const workspace = readFileSync("frontend/modules/forms/src/features/apps/AppWorkspace.tsx", "utf8");
  assert.match(formsApp, /<Route element=\{<DesignerWindow \/>\}>/);
  assert.match(workspace, /reserveDesignerWindow\(\)/);
  assert.doesNotMatch(workspace, /navigate\(`\/apps\/[^`]+\/(?:design|workflow)`\)/);
});
