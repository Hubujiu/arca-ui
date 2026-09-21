import { useState, type ReactNode } from "react";
import { CenterMorphModal, CenterMorphModalContent } from "@/components/motion/center-morph-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { cn } from "@/lib/utils";

export { Button, StatefulButton } from "@/components/motion/button";
export { Input } from "@/components/motion/input";
export { EmptyState } from "@/components/motion/empty-state";
export { AlertBanner } from "@/components/motion/alert-banner";
export { ErrorState } from "@/components/motion/status-page";

const ALL = "__all__";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="px-1 text-body font-medium text-foreground">{label}</span> : null}
      {children}
      {hint ? <small className="px-1 text-caption leading-5 text-muted-foreground">{hint}</small> : null}
    </div>
  );
}

function Options({ options }: { options: SelectOption[] }) {
  return (
    <>
      {options.map((option) => (
        <SelectItem key={option.value || ALL} value={option.value || ALL} disabled={option.disabled}>
          {option.label}
        </SelectItem>
      ))}
    </>
  );
}

export function FieldSelect({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Field label={label}>
      <Select
        value={value || ALL}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        className={cn(open && "", className)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <Options options={options} />
        </SelectContent>
      </Select>
    </Field>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Select
      value={value || ALL}
      onValueChange={(next) => onChange(next === ALL ? "" : next)}
      open={open}
      onOpenChange={setOpen}
      className={cn("", open && "")}
    >
      <SelectTrigger >
        <span className="flex min-w-0 items-center gap-1">
          <span className="text-muted-foreground">{label}</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <Options options={options} />
      </SelectContent>
    </Select>
  );
}

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissible = true,
  footer,
  className,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  dismissible?: boolean;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <CenterMorphModal open={open} onOpenChange={onOpenChange}>
      <CenterMorphModalContent
        ariaLabel={title}
        dismissible={dismissible}
        showCloseButton={dismissible}
        closeButtonLabel="关闭"
        className={cn("max-w-lg p-6", className)}
      >
        <div className="mb-5 pr-8">
          <h2 className="text-title font-medium tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-body leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <div className={cn(footer ? "max-h-dialog-body" : "max-h-dialog-content", "overflow-y-auto px-1.5 py-2", bodyClassName)}>{children}</div>
        {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
