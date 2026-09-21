"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { zhCN } from "date-fns/locale";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@/shared/icons/catalog";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type DayPickerProps,
} from "react-day-picker";
import { cn } from "@/lib/utils";

const navButton =
  "inline-flex size-(--cell-size) items-center justify-center rounded-full p-0 text-muted-foreground select-none hover:bg-muted hover:text-foreground aria-disabled:opacity-50";

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale = zhCN,
  components,
  formatters,
  ...props
}: DayPickerProps) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      {...props}
      className={cn(
        "group/calendar bg-background p-3 calendar-cell-size",
        className,
      )}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("zh-CN", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(navButton, defaultClassNames.button_previous),
        button_next: cn(navButton, defaultClassNames.button_next),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        caption_label: cn("select-none text-body font-medium", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-control text-caption font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          defaultClassNames.day,
        ),
        today: cn(
          "rounded-full bg-muted/60 text-foreground data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          defaultClassNames.today,
        ),
        outside: cn("text-muted-foreground", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        day_button: cn(
          "rounded-full hover:rounded-full data-[selected-single=true]:rounded-full data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
          defaultClassNames.day_button,
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClass, orientation, ...rest }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : ChevronDownIcon;
          return <Icon className={cn("size-4", chevronClass)} {...rest} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString("zh-CN")}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) items-center justify-center rounded-full font-normal leading-none",
        "hover:bg-muted",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-3 group-data-[focused=true]/day:ring-ring/50",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}
