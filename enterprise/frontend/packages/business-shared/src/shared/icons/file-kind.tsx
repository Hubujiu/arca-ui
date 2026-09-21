import type { HTMLAttributes } from "react";
import { PotlabIcon } from "@approved/potlab-icons";
import { cn } from "@/lib/utils";

const NAMES: Record<string, string> = {
  PDF: "Article",
  DOCX: "Article",
  XLSX: "Article",
  PPTX: "Article",
  IMAGE: "Image",
  TXT: "Article",
  MD: "Article",
  HTML: "Article",
};
/** Existing document-dock consumers use this tint; it now follows user theme tokens. */
export function fileKindStyle(kind: string) {
  return { fill: "var(--primary)", fold: "var(--accent)", letter: kind.slice(0, 1) };
}
export function FileKindIcon({ kind, size = 18, className, ...props }: { kind: string; size?: number } & HTMLAttributes<HTMLSpanElement>) {
  return <PotlabIcon name={NAMES[kind] ?? "Article"} size={size} className={cn("shrink-0", className)} {...props} />;
}
