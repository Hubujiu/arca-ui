import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "../src/lib/utils";
import { Button } from "../src/components/motion/button/base";

test("every declared typography size preserves semantic foreground colours in either order", () => {
  const theme = readFileSync("shared/design-system/potlab/theme.css", "utf8");
  const sizes = [...theme.matchAll(/--text-([\w-]+):/g)].map(match => `text-${match[1]}`);
  assert.ok(sizes.length > 0);
  for (const size of sizes) for (const color of ["text-primary-foreground", "text-foreground", "text-muted-foreground", "text-status-danger"]) {
    assert.equal(cn(color, size), `${color} ${size}`);
    assert.equal(cn(size, color), `${size} ${color}`);
    assert.equal(cn(`md:${color}`, `md:${size}`), `md:${color} md:${size}`);
  }
  assert.equal(cn("text-body text-primary-foreground", "text-caption"), "text-primary-foreground text-caption");
  assert.equal(cn("text-body text-foreground", "text-muted-foreground"), "text-body text-muted-foreground");
});

test("real Button variants retain foreground and typography after class merging", () => {
  for (const variant of ["primary", "accent", "secondary", "ghost", "outline"] as const) {
    const color = variant === "ghost" ? "text-muted-foreground" : variant === "outline" ? "text-foreground" : `text-${variant}-foreground`;
    for (const size of ["sm", "md", "lg"] as const) {
      const markup = renderToStaticMarkup(createElement(Button, { variant, size }, "保存"));
      const classes = /class="([^"]+)"/.exec(markup)?.[1].split(" ") ?? [];
      assert.ok(classes.includes(color), `${variant}/${size} preserves ${color}`);
      assert.ok(classes.includes(size === "sm" ? "text-caption" : "text-body"));
    }
  }
});
