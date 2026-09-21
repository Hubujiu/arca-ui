import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertIcon, CheckIcon, InfoIcon, SpinnerIcon } from "./icons";

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

export function Button({ variant = "secondary", size = "medium", icon, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "small" | "medium" | "large" | "icon"; icon?: ReactNode }) {
  return <button type="button" className={cx("ent-button", `ent-button--${variant}`, `ent-button--${size}`, className)} {...props}>{icon}{children}</button>;
}

export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <Button size="icon" aria-label={label} {...props}>{children}</Button>;
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={cx("ent-field", className)}><span className="ent-field__label">{label}</span>{children}{error ? <span className="ent-field__error">{error}</span> : hint ? <span className="ent-field__hint">{hint}</span> : null}</label>;
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cx("ent-input", className)} {...props}/>;
});

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput({ className, children, ...props }, ref) {
  return <select ref={ref} className={cx("ent-input", "ent-select", className)} {...props}>{children}</select>;
});

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return <div className="ent-switch-row"><div><label className="ent-switch-row__label" htmlFor={id}>{label}</label>{description && <p>{description}</p>}</div><button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} className="ent-switch" onClick={() => onChange(!checked)}><span><CheckIcon size={13}/></span></button></div>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("ent-card", className)}>{children}</section>;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="ent-badge">{children}</span>;
}

export function Alert({ children, title, intent = "info" }: { children?: ReactNode; title?: string; intent?: "info" | "error" }) {
  const AlertGlyph = intent === "error" ? AlertIcon : InfoIcon;
  return <div className={cx("ent-alert", `ent-alert--${intent}`)} role={intent === "error" ? "alert" : "status"}><AlertGlyph/><div>{title && <strong>{title}</strong>}{children && <div>{children}</div>}</div></div>;
}

export function Spinner({ label = "加载中" }: { label?: string }) {
  return <span className="ent-spinner" role="status"><SpinnerIcon/>{label}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="ent-empty">{icon && <span className="ent-empty__icon">{icon}</span>}<h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="ent-skeleton" aria-hidden="true">{Array.from({ length: lines }, (_, index) => <span key={index}/>)}</div>;
}

export { cx };
