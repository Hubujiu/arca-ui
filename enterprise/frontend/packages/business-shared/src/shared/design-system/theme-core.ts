/** Brand seeds live here; feature components consume semantic CSS variables only. */
export type Appearance = {
  primary: string;
  accent: string;
  mode: "light" | "dark" | "system";
  motion: "system" | "reduced";
};
export const APPEARANCE_KEY = "docweave.appearance.v1";
export const DEFAULT_APPEARANCE: Readonly<Appearance> = Object.freeze({
  primary: "#3B3F46", accent: "#D1D3D6", mode: "light", motion: "system",
});

export function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const hex = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex)) return `#${[...hex].map(c => c + c).join("").toUpperCase()}`;
  if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toUpperCase()}`;
}
export function normalizeAppearance(value: unknown): Appearance {
  const input = value && typeof value === "object" ? value as Partial<Appearance> : {};
  return {
    primary: normalizeHex(input.primary) ?? DEFAULT_APPEARANCE.primary,
    accent: normalizeHex(input.accent) ?? DEFAULT_APPEARANCE.accent,
    mode: input.mode === "light" || input.mode === "dark" ? input.mode : DEFAULT_APPEARANCE.mode,
    motion: input.motion === "reduced" ? "reduced" : DEFAULT_APPEARANCE.motion,
  };
}
export function parseAppearance(raw: string | null): Appearance {
  try { return normalizeAppearance(raw ? JSON.parse(raw) : undefined); }
  catch { return normalizeAppearance(undefined); }
}
function rgb(hex: string): number[] {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new TypeError(`Invalid sRGB color: ${hex}`);
  return [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16));
}
export function mix(a: string, b: string, amount: number): string {
  const left = rgb(a), right = rgb(b), t = Math.max(0, Math.min(1, amount));
  return "#" + left.map((value, i) => Math.round(value + (right[i] - value) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function luminance(color: string): number {
  const values = rgb(color).map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function onColor(background: string): string {
  return contrast(background, "#000000") >= contrast(background, "#FFFFFF") ? "#000000" : "#FFFFFF";
}
/** Adjust text/focus ink, never silently replace the user's actual brand fill. */
function accessibleInk(seed: string, backgrounds: string[], dark: boolean, minimum = 4.5): string {
  for (let step = 0; step <= 100; step++) {
    const candidate = mix(seed, dark ? "#FFFFFF" : "#000000", step / 100);
    if (backgrounds.every(bg => contrast(candidate, bg) >= minimum)) return candidate;
  }
  return dark ? "#FFFFFF" : "#000000";
}
export function themeTokens(value: Appearance, dark: boolean): Record<string, string> {
  const { primary, accent } = normalizeAppearance(value);
  const canvas = dark ? "#151922" : "#F5F6F8";
  const card = dark ? "#202632" : "#FFFFFF";
  const foreground = dark ? "#EDF1F8" : "#202536";
  const background = mix(canvas, accent, dark ? 0.04 : 0.025);
  const muted = mix(card, accent, dark ? 0.1 : 0.14);
  const accentSoft = mix(card, primary, dark ? 0.14 : 0.08);
  const accentSurfaceHover = mix(card, primary, dark ? 0.18 : 0.12);
  const surfaces = [background, card, muted, accentSoft, accentSurfaceHover];
  const accentInk = accessibleInk(primary, surfaces, dark);
  const primaryHover = mix(primary, onColor(primary), 0.07);
  const accentHover = mix(accent, onColor(accent), 0.07);
  const tokens = {
    "--background": background, "--foreground": foreground,
    "--card": card, "--card-foreground": foreground,
    "--popover": card, "--popover-foreground": foreground,
    "--primary": primary, "--primary-foreground": onColor(primary),
    "--primary-hover": primaryHover, "--primary-hover-foreground": onColor(primaryHover),
    "--primary-text": accentInk,
    "--accent": accent, "--accent-foreground": onColor(accent),
    "--accent-hover": accentHover, "--accent-hover-foreground": onColor(accentHover),
    "--secondary": muted, "--secondary-foreground": onColor(muted),
    "--muted": muted, "--muted-foreground": accessibleInk(mix(foreground, card, 0.32), surfaces, dark),
    "--border": mix(card, foreground, dark ? 0.2 : 0.14),
    "--border-strong": mix(card, foreground, 0.36),
    "--input": mix(card, foreground, 0.4),
    "--ring": accessibleInk(primary, [background, card], dark, 3),
    "--sidebar": mix(card, accent, dark ? 0.06 : 0.2),
    "--sidebar-foreground": foreground,
    "--sidebar-border": mix(card, foreground, dark ? 0.2 : 0.14),
    "--destructive": dark ? "#FFABB1" : "#AA273E",
    "--success": dark ? "#8ED8BB" : "#246C52",
    "--warning": dark ? "#E5C087" : "#89580D",
  };
  return {
    ...tokens,
    "--ui-accent": primary,
    "--ui-accent-ink": accentInk,
    "--ui-accent-soft": accentSoft,
    "--ui-accent-hover": accentSurfaceHover,
    "--ui-accent-border": mix(card, primary, dark ? 0.36 : 0.24),
    "--ui-on-accent": tokens["--primary-foreground"],
    "--ui-ink": tokens["--foreground"],
    "--ui-muted-ink": tokens["--muted-foreground"],
    "--ui-surface": tokens["--card"],
    "--ui-surface-muted": muted,
    "--ui-surface-hover": mix(card, foreground, dark ? 0.08 : 0.04),
    "--ui-ground": tokens["--background"],
    "--ui-border": tokens["--border"],
    "--ui-border-strong": tokens["--border-strong"],
    "--ui-focus": tokens["--ring"],
    "--ui-status-success": accessibleInk(tokens["--success"], surfaces, dark),
    "--ui-status-warning": accessibleInk(tokens["--warning"], surfaces, dark),
    "--ui-status-danger": accessibleInk(tokens["--destructive"], surfaces, dark),
    "--ui-status-info": accentInk,
    // The exact brand fill is preserved; both strokes remain visible on that fill.
    "--ui-icon-inverse-ink": tokens["--primary-foreground"],
    "--ui-icon-inverse-accent": accessibleInk(primary, [primary, primaryHover], onColor(primary) === "#FFFFFF", 3),
    "--ui-icon-on-ink": onColor(foreground),
    "--ui-icon-accent-on-ink": accessibleInk(primary, [foreground], !dark, 3),
    "--potlab-accent": "var(--ui-accent-ink)",
    "--potlab-ink": "var(--ui-ink)",
  };
}
