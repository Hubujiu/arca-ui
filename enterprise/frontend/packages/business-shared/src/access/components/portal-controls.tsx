import {
  useId,
  type ReactNode,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ComponentProps,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, LoaderCircle } from "../shared/icons";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  appearance?: "primary" | "secondary" | "transparent";
  icon?: ReactNode;
  mobileOnly?: boolean;
};

export function Button({
  appearance = "secondary", icon, className = "", mobileOnly = false, children, ...props
}: ButtonProps) {
  const classes = [
    "button", `button-${appearance}`, mobileOnly && "mobile-menu",
    icon && !children && "button-icon-only", className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      data-icon-tone={appearance === "primary" ? "inverse" : undefined}
      {...props}
    >
      {icon}{children}
    </button>
  );
}

export function Field({ label, required, hint, children, className = "" }: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}{required && <span aria-hidden="true"> *</span>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="input" {...props} />
);

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="input" {...props} />
);

export function Checkbox({ label, onChange, checked, name, disabled }: {
  label: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: unknown, data: { checked: boolean }) => void;
}) {
  const id = useId();
  return (
    <div className="checkbox-field">
      <CheckboxPrimitive.Root
        className="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onChange?.(undefined, { checked: value === true })}
      >
        <CheckboxPrimitive.Indicator><Check size={14} /></CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function Badge({ children, color = "brand" }: {
  children: ReactNode;
  color?: string;
  appearance?: string;
}) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function MessageBar({ children, intent }: { children: ReactNode; intent: string }) {
  return (
    <div className={`message message-${intent}`} role={intent === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export const MessageBarBody = ({ children }: { children: ReactNode }) => <>{children}</>;

export function Spinner({ label }: { label: string; size?: string }) {
  return <span className="spinner" role="status"><LoaderCircle aria-hidden="true" />{label}</span>;
}

export function ActionSurface({ active, navigation, depth, className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    navigation?: boolean;
    depth?: number;
  }
) {
  return (
    <button
      {...props}
      type="button"
      className={[
        navigation ? "nav-item" : "tree-row",
        active ? (navigation ? "active" : "selected") : "",
        className,
      ].filter(Boolean).join(" ")}
      style={{ "--tree-indent": `${16 + Math.max(0, depth ?? 0) * 20}px` } as CSSProperties}
    />
  );
}

export function DataTable({ className = "", ...props }: ComponentProps<"table">) {
  return <table className={`portal-data-table ${className}`} {...props} />;
}
