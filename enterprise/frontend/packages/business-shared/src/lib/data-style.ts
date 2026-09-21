import type { CSSProperties } from "react";
export type DataStyle = CSSProperties & { [key: `--${string}`]: string | number | undefined };

/** CSS variables do not add px to numeric values the way React's width/height
 * properties do. Preserve units when serializing measured document geometry. */
export function cssLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? Number.isFinite(value) ? `${value}px` : undefined : value;
}
