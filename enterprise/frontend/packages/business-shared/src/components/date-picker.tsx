"use client";
// ui.watermelon.sh/components/date-picker

import { useId, useMemo, useState } from "react";
import { ChevronDownIcon, X } from "@/shared/icons/catalog";
import * as Popover from "@radix-ui/react-popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const triggerClass =
  "flex h-11 w-full items-center justify-between rounded-panel border border-border/60 bg-background px-3.5 text-body font-normal shadow-tactile outline-none transition-colors hover:bg-accent/10 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const timeClass =
  "h-11 w-full appearance-none rounded-panel border border-border/60 bg-background px-3.5 text-body shadow-tactile outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:hidden";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseValue(value?: string, withTime?: boolean): Date | undefined {
  if (!value) return undefined;
  if (!withTime) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function combine(date: Date, time: string) {
  const [hours = "0", minutes = "0", seconds = "0"] = time.split(":");
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return next;
}

function parseBound(value?: string | number): Date | undefined {
  if (value === undefined || value === "") return undefined;
  return parseValue(String(value), String(value).includes("T"));
}

export function DatePicker({
  id: idProp,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  min,
  max,
  withTime = false,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  label?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | boolean;
  min?: string | number;
  max?: string | number;
  withTime?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
}) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const timeId = `${id}-time`;
  const [open, setOpen] = useState(false);
  const selected = parseValue(value, withTime);
  const time = selected ? toTimeValue(selected) : "00:00:00";
  const invalid = Boolean(error) || ariaInvalid;
  const minDate = useMemo(() => parseBound(min), [min]);
  const maxDate = useMemo(() => parseBound(max), [max]);
  const emptyLabel = placeholder || (withTime ? "选择日期和时间" : "选择日期");

  function emit(date: Date | undefined, nextTime = time) {
    if (!date) {
      onChange?.(undefined);
      return;
    }
    onChange?.(withTime ? combine(date, nextTime).toISOString() : toDateValue(date));
  }

  return (
    <div className={cn("w-full space-y-2", withTime && "max-w-none")}>
      {label ? (
        <label htmlFor={id} className="px-1 text-body font-medium">
          {label}
        </label>
      ) : null}
      <div className={cn("flex gap-3", withTime ? "flex-col sm:flex-row" : "")}>
        <Popover.Root modal open={open} onOpenChange={setOpen}>
          <div className="relative min-w-0 flex-1">
            <Popover.Trigger asChild>
              <button
                type="button"
                id={id}
                disabled={disabled}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                aria-required={ariaRequired}
                aria-invalid={invalid || undefined}
                className={cn(triggerClass, invalid && "border-destructive")}
              >
                <span className={selected ? "text-foreground" : "text-muted-foreground"}>
                  {selected
                    ? selected.toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : emptyLabel}
                </span>
                <span className="inline-flex size-4 text-muted-foreground/80"><ChevronDownIcon  /></span>
              </button>
            </Popover.Trigger>
            {selected && !disabled ? (
              <button
                type="button"
                className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="清除日期"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  emit(undefined);
                }}
              >
                <span className="inline-flex size-3.5"><X  /></span>
              </button>
            ) : null}
          </div>
          <Popover.Portal>
            <Popover.Content data-dw-surface="popover"
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className="z-110 w-auto overflow-hidden rounded-panel border border-border/60 bg-popover p-0 text-popover-foreground shadow-tactile"
            >
              <Calendar
                mode="single"
                selected={selected}
                defaultMonth={selected}
                disabled={[
                  ...(minDate ? [{ before: minDate }] : []),
                  ...(maxDate ? [{ after: maxDate }] : []),
                ]}
                onSelect={(date) => {
                  emit(date);
                  setOpen(false);
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {withTime ? (
          <div className="sm:w-40">
            <input
              id={timeId}
              type="time"
              step={1}
              disabled={disabled || !selected}
              aria-label="时间"
              value={time}
              onChange={(event) => {
                if (!selected) return;
                emit(selected, event.target.value || "00:00:00");
              }}
              className={cn(timeClass, invalid && "border-destructive")}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
