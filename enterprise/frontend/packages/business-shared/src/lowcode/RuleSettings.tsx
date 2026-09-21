import { PlusAction, TrashAction } from "@/shared/icons/motion";
import { Button, FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import type { Directory } from "@/organization/model";
import type { LowcodeField, ValidationRule, WarningRule } from "./field-model";
import { RuleEditor } from "./RuleEditor";
import { createRule, ruleSummary } from "./rules";

const newId = () => `r${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
export function FieldRuleSettings({ field, fields, onChange, directory, disabled }: { field: LowcodeField; fields: LowcodeField[]; onChange: (patch: Partial<LowcodeField>) => void; directory: Directory; disabled: boolean }) {
  const otherFields = fields.filter((entry) => entry.id !== field.id && !["heading", "divider"].includes(entry.type));
  const warnings = field.warningRules ?? [];
  function updateWarning(index: number, patch: Partial<WarningRule>) { onChange({ warningRules: warnings.map((warning, at) => at === index ? { ...warning, ...patch } : warning) }); }
  return <section className="space-y-4 border-t border-border pt-4" aria-label="字段联动规则">
    <h3 className="text-caption font-semibold text-muted-foreground">字段联动规则</h3>
    <div className="space-y-3"><Checkbox checked={!!field.visibleWhen} disabled={disabled || !otherFields.length} label="按条件显示" onCheckedChange={(checked) => onChange({ visibleWhen: checked ? createRule(otherFields) : undefined })} />
      {field.visibleWhen && <RuleEditor value={field.visibleWhen} onChange={(visibleWhen) => onChange({ visibleWhen })} fields={otherFields} directory={directory} disabled={disabled} />}
      <p className="text-caption leading-5 text-muted-foreground">条件隐藏时恢复原记录或默认内容，免除必填。显示条件不能引用自身或互相依赖成环。</p>
    </div>
    <div className="space-y-3"><Checkbox checked={!!field.requiredWhen} disabled={disabled} label="按条件追加必填" onCheckedChange={(checked) => onChange({ requiredWhen: checked ? createRule(fields) : undefined })} />
      {field.requiredWhen && <RuleEditor value={field.requiredWhen} onChange={(requiredWhen) => onChange({ requiredWhen })} fields={fields} directory={directory} disabled={disabled} />}
      <p className="text-caption leading-5 text-muted-foreground">固定必填或条件满足时需要填写；条件隐藏优先。</p>
    </div>
    <div className="space-y-3"><h4 className="text-caption font-medium">非阻断提示 · {warnings.length}/3</h4>
      {warnings.map((warning, index) => <details key={warning.id} open className="min-w-0 rounded-card border border-border p-3">
        <summary className="cursor-pointer break-words text-caption font-medium">提示 {index + 1}：{warning.message || "待填写提示"}</summary>
        <div className="mt-3 space-y-3"><Input label="提示文字" value={warning.message} maxLength={200} onChange={(message) => updateWarning(index, { message })} />
          <FieldSelect label="提示级别" value={warning.color} options={[{ value: "amber", label: "提醒" }, { value: "red", label: "警示" }, { value: "blue", label: "说明" }]} onChange={(color) => updateWarning(index, { color: color as WarningRule["color"] })} />
          <RuleEditor value={warning.condition} onChange={(condition) => updateWarning(index, { condition })} fields={fields} directory={directory} disabled={disabled} />
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ warningRules: warnings.filter((_, at) => at !== index) })}><TrashAction size={14} />移除此提示</Button>
        </div>
      </details>)}
      <Button variant="outline" size="sm" disabled={disabled || warnings.length >= 3} onClick={() => onChange({ warningRules: [...warnings, { id: newId(), condition: { fieldId: field.id, operator: "NOT_EMPTY" }, message: "请确认填写内容", color: "amber" }] })}><PlusAction size={14} />添加提示</Button>
    </div>
  </section>;
}

export function FormRuleSettings({ value, onChange, fields, directory, disabled }: { value: ValidationRule[]; onChange: (value: ValidationRule[]) => void; fields: LowcodeField[]; directory: Directory; disabled: boolean }) {
  const eligible = fields.filter((field) => !["heading", "divider"].includes(field.type));
  function update(index: number, patch: Partial<ValidationRule>) {
    onChange(value.map((rule, at) => { if (at !== index) return rule; const next = { ...rule, ...patch }; if (next.when === undefined) delete next.when; if (next.fieldId === undefined) delete next.fieldId; return next; }));
  }
  return <section className="space-y-4" aria-label="表单提交校验">
    <p className="text-caption leading-5 text-muted-foreground">完整提交必须满足下列规则。可比较两个字段，例如结束日期不早于开始日期。保存草稿时不阻断。</p>
    {value.map((rule, index) => <details key={rule.id} open className="min-w-0 rounded-card border border-border p-3">
      <summary className="cursor-pointer break-words text-body font-medium">校验 {index + 1}：{rule.message || "待填写错误提示"}</summary>
      <div className="mt-3 space-y-3"><Input label="不满足时的错误提示" value={rule.message} maxLength={200} onChange={(message) => update(index, { message })} />
        <FieldSelect label="错误显示位置" value={rule.fieldId ?? "form"} options={[{ value: "form", label: "表单顶部" }, ...eligible.map((field) => ({ value: field.id, label: field.label }))]} onChange={(fieldId) => update(index, { fieldId: fieldId === "form" ? undefined : fieldId })} />
        <Checkbox checked={!!rule.when} disabled={disabled} label="仅在指定条件下检查" onCheckedChange={(checked) => update(index, { when: checked ? createRule(eligible) : undefined })} />
        {rule.when && <div className="space-y-2"><h4 className="text-caption font-medium">检查前提</h4><RuleEditor value={rule.when} onChange={(when) => update(index, { when })} fields={fields} directory={directory} disabled={disabled} /></div>}
        <div className="space-y-2"><h4 className="text-caption font-medium">必须满足的条件</h4><RuleEditor value={rule.condition} onChange={(condition) => update(index, { condition })} fields={fields} directory={directory} disabled={disabled} /></div>
        <p className="break-words text-caption text-muted-foreground">{ruleSummary(rule.condition, fields, directory)}</p>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(value.filter((_, at) => at !== index))}><TrashAction size={14} />删除校验</Button>
      </div>
    </details>)}
    <Button variant="outline" size="sm" disabled={disabled || value.length >= 20 || !eligible.length} onClick={() => onChange([...value, { id: newId(), condition: createRule(eligible), message: "请检查填写内容" }])}><PlusAction size={14} />添加提交校验 · {value.length}/20</Button>
  </section>;
}
