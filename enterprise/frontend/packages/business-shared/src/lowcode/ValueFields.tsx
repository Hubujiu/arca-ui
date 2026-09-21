import type { DataStyle } from "@/lib/data-style";
import { TextEntry } from "@/components/controls";
import { choiceLabel } from "./choices";
import { useState } from "react";
import { ChevronRight, Star } from "@/shared/icons/catalog";
import { Input } from "@/components/motion/input";
import { Button } from "@/components/motion/button";
import { cn } from "@/lib/utils";
import type { LowcodeField } from "./field-model";

type ValueProps = { field: LowcodeField; id: string; value: unknown; disabled: boolean; describedBy?: string; invalid: boolean };

export function NumericField({ field, id, value, disabled, describedBy, invalid, onChange }: ValueProps & { onChange: (value: number | string | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const config = field.numericConfig;
  const unit = config?.unit ?? (field.format === "percent" ? "%" : "");
  const digits = config?.decimalPlaces ?? (field.format === "currency" ? 2 : undefined);
  const display = typeof value === "number" ? value.toLocaleString("zh-CN", { useGrouping: config?.thousandsSeparator ?? false, minimumFractionDigits: digits ?? 0, maximumFractionDigits: 20 }) : typeof value === "string" ? value : "";
  return <Input id={id} aria-label={field.label} type="text" inputMode={field.format === "integer" ? "numeric" : "decimal"} disabled={disabled} error={invalid} aria-required={field.required} aria-invalid={invalid} aria-describedby={describedBy}
    value={draft ?? display} placeholder={field.placeholder} rightIcon={unit ? <span className="max-w-24 truncate pr-3 text-caption" title={unit}>{unit}</span> : undefined}
    onBlur={() => setDraft(null)}
    onChange={(text) => {
      setDraft(text);
      const normalized = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:[eE][+-]?\d+)?$/.test(text) ? text.replaceAll(",", "") : text;
      if (!text) onChange(undefined);
      else if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized) && Number.isFinite(Number(normalized))) onChange(Number(normalized));
      else onChange(text);
    }} />;
}

export function RatingField({ field, id, value, disabled, describedBy, invalid, onChange }: ValueProps & { onChange: (value: number | undefined) => void }) {
  const max = field.ratingMax ?? 5, current = typeof value === "number" ? value : 0;
  return <div id={id} role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-required={field.required}>
    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={field.label}>
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => <label key={score} className={cn("relative cursor-pointer rounded-control p-1.5 focus-within:ring-2 focus-within:ring-ring", disabled && "cursor-not-allowed opacity-50")}>
        <TextEntry type="radio" name={id} value={score} checked={current === score} disabled={disabled} aria-label={`${score} 分`} className="absolute inset-0 h-full w-full cursor-auto opacity-0" onChange={() => onChange(score)} />
        <span className={["inline-flex", cn("pointer-events-none size-6", score <= current ? "fill-status-warning text-status-warning" : "text-muted-foreground/40")].filter(Boolean).join(" ")}><Star aria-hidden  /></span>
      </label>)}
      <span className="ml-2 text-caption tabular-nums text-muted-foreground">{current} / {max}{field.numericConfig?.unit}</span>
      <Button size="sm" variant="ghost" disabled={disabled || value === undefined} onClick={() => onChange(undefined)}>清空</Button>
    </div>
  </div>;
}

export function InlineChoiceField({ field, id, value, disabled, describedBy, invalid, onChange }: ValueProps & { onChange: (value: string | string[]) => void }) {
  const multiple = field.type === "multiselect", selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const style = field.choiceConfig?.style;
  return <div id={id} role={multiple ? "group" : "radiogroup"} aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-required={field.required} className={cn("flex gap-2", style === "vertical" ? "flex-col" : "flex-wrap")}>
    {(field.options ?? []).map((option, index) => {
      const checked = selected.includes(option), color = field.choiceConfig?.colors?.[option];
      return <label key={option} className={cn("flex min-w-0 cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-body focus-within:ring-2 focus-within:ring-ring", checked ? "border-primary bg-primary/5" : "border-border", disabled && "cursor-not-allowed opacity-50")}>
        <TextEntry type={multiple ? "checkbox" : "radio"} name={id} value={option} checked={checked} disabled={disabled} className="size-4" onChange={() => onChange(multiple ? checked ? selected.filter((item) => item !== option) : [...selected, option] : option)} />
        {color && <span aria-hidden className="dw-data-value-fields-1 size-2.5 shrink-0 rounded-full" style={({ "--dw-data-value-fields-1-background-color": color }) as DataStyle} />}
        <span className="break-words">{style === "stages" && <span className="mr-1.5 text-caption text-muted-foreground">{index + 1}.</span>}{choiceLabel(field,option)}</span>
        {style === "stages" && index < (field.options?.length ?? 0) - 1 && <span className="inline-flex size-3.5 shrink-0 text-muted-foreground"><ChevronRight aria-hidden  /></span>}
      </label>;
    })}
    {!multiple && <Button variant="ghost" size="sm" disabled={disabled || !selected.length} onClick={() => onChange("")}>清空</Button>}
  </div>;
}
