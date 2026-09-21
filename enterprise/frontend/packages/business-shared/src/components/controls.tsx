/** HTML-contract adapters for existing forms and navigation surfaces.
 * Unlike display buttons, these preserve native form events, file selection,
 * autofill, radio groups, option semantics and document table spans.
 */
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const entry = "w-full min-w-0 rounded-control border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const TextEntry = forwardRef<HTMLInputElement, ComponentProps<"input">>(function TextEntry({ className, type, ...props }, ref) {
  const compact = type === "checkbox" || type === "radio";
  return <input {...props} ref={ref} type={type} className={cn(compact ? "size-4 shrink-0 accent-primary disabled:opacity-50" : entry, className)} />;
});
export const SelectEntry = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function SelectEntry({ className, ...props }, ref) {
  return <select {...props} ref={ref} className={cn(entry, className)} />;
});
export const MultilineEntry = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function MultilineEntry({ className, ...props }, ref) {
  return <textarea {...props} ref={ref} className={cn(entry, "min-h-24 resize-y", className)} />;
});

type ActionSurfaceProps = ComponentProps<"button"> & { active?: boolean; intent?: "default" | "danger"; children?: ReactNode };
/** Content-sized action for navigation rows and cards. Standard toolbar/form
 * submission actions continue to use Button and its size/variant API.
 */
export const ActionSurface = forwardRef<HTMLButtonElement, ActionSurfaceProps>(function ActionSurface({ className, active, intent = "default", type = "button", ...props }, ref) {
  active ??= props['aria-pressed'] === true || props['aria-pressed'] === 'true' || props['aria-selected'] === true || props['aria-selected'] === 'true';
  return <button {...props} ref={ref} type={type} data-active={active || undefined}
    className={cn("inline-flex min-h-8 items-center gap-2 rounded-control px-3 py-2 text-left text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      active ? "bg-primary/10 text-primary" : intent === "danger" ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted", className)} />;
});

/** Native document tables retain rowSpan/colSpan and their semantic structure. */
export const DataTable = forwardRef<HTMLTableElement, ComponentProps<"table">>(function DataTable({ className, ...props }, ref) {
  return <table {...props} ref={ref} className={cn("w-full border-collapse text-left text-body", className)} />;
});

export const RichTextSurface = forwardRef<HTMLDivElement, ComponentProps<"div">>(function RichTextSurface({ className, ...props }, ref) {
  return <div {...props} ref={ref} role="textbox" className={cn(entry, "min-h-24 break-words [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc", className)} />;
});

/** Document graphics carry user-authored strokes, not interface icon artwork. */
export const VectorDocument = forwardRef<SVGSVGElement, ComponentProps<"svg">>(function VectorDocument({ className, ...props }, ref) {
  return <svg {...props} ref={ref} className={cn("w-full touch-none rounded-control border border-border bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive", className)} />;
});

export function ColorSwatch({ color, ...props }: Omit<ComponentProps<"button">, "color"> & { color: string }) {
  return <button {...props} type="button" className="dw-color-swatch size-8 shrink-0 rounded-full border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-ring"
    style={{ "--swatch-color": color } as import("@/lib/data-style").DataStyle} />;
}

export const OptionList = forwardRef<HTMLDivElement, ComponentProps<"div">>(function OptionList({ onKeyDown, ...props }, ref) {
  return <div {...props} ref={ref} role="listbox" onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)')];
    if (!options.length) return;
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
    event.preventDefault(); options[next].focus();
  }} />;
});
