import { MultilineEntry, SelectEntry } from "@/components/controls";
import { Input } from "@/shared/ui";
import { DatePicker } from "@/components/date-picker";
import { type FormField, type Values } from "./model";

export function FormRenderer({
  fields,
  value,
  onChange,
  errors = {},
  readOnly = false,
}: {
  fields: FormField[];
  value: Values;
  onChange: (value: Values) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
}) {
  function change(id: string, next: string | number | boolean | undefined) {
    const values = { ...value };
    if (next === undefined || next === "") delete values[id];
    else values[id] = next;
    onChange(values);
  }
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => {
        const label = field.label + (field.required ? " *" : ""),
          id = `runtime-${field.id}`;
        if (readOnly)
          return (
            <dl key={field.id}>
              <dt className="text-body text-muted-foreground">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-body leading-6">
                {typeof value[field.id] === "boolean"
                  ? value[field.id]
                    ? "是"
                    : "否"
                  : (value[field.id] ?? "未填写")}
              </dd>
            </dl>
          );
        return (
          <div key={field.id}>
            {field.type === "textarea" ? (
              <>
                <label
                  className="mb-1.5 block text-body font-medium"
                  htmlFor={id}
                >
                  {label}
                </label>
                <MultilineEntry
                  id={id}
                  className={""}
                  rows={4}
                  maxLength={10000}
                  placeholder={field.placeholder}
                  value={String(value[field.id] ?? "")}
                  onChange={(e) => change(field.id, e.target.value)}
                  aria-required={field.required}
                  aria-invalid={!!errors[field.id]}
                  aria-describedby={
                    errors[field.id] ? `${id}-error` : undefined
                  }
                />
              </>
            ) : field.type === "select" || field.type === "checkbox" ? (
              <>
                <label
                  className="mb-1.5 block text-body font-medium"
                  htmlFor={id}
                >
                  {label}
                </label>
                <SelectEntry
                  id={id}
                  className={""}
                  value={String(value[field.id] ?? "")}
                  onChange={(e) =>
                    change(
                      field.id,
                      e.target.value === ""
                        ? undefined
                        : field.type === "checkbox"
                          ? e.target.value === "true"
                          : e.target.value,
                    )
                  }
                  aria-required={field.required}
                  aria-invalid={!!errors[field.id]}
                  aria-describedby={
                    errors[field.id] ? `${id}-error` : undefined
                  }
                >
                  <option value="">请选择</option>
                  {field.type === "checkbox" ? (
                    <>
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </>
                  ) : (
                    field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </SelectEntry>
              </>
            ) : field.type === "date" ? (
              <DatePicker
                id={id}
                label={label}
                placeholder={field.placeholder || "选择日期"}
                value={String(value[field.id] ?? "")}
                onChange={(v) => change(field.id, v)}
                aria-required={field.required}
                aria-invalid={!!errors[field.id]}
                aria-describedby={
                  errors[field.id] ? `${id}-error` : undefined
                }
              />
            ) : (
              <Input
                id={id}
                label={label}
                type={field.type === "number" ? "number" : "text"}
                step={field.type === "number" ? "any" : undefined}
                min={field.minimum}
                max={field.maximum}
                maxLength={1000}
                placeholder={field.placeholder}
                value={String(value[field.id] ?? "")}
                onChange={(v) =>
                  change(
                    field.id,
                    v === ""
                      ? undefined
                      : field.type === "number"
                        ? Number(v)
                        : v,
                  )
                }
                aria-required={field.required}
                aria-invalid={!!errors[field.id]}
                aria-describedby={errors[field.id] ? `${id}-error` : undefined}
              />
            )}
            {errors[field.id] && (
              <p
                id={`${id}-error`}
                role="alert"
                className="mt-1 text-caption text-destructive"
              >
                {errors[field.id]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
