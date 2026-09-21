import {formulaResultType} from "./calculations";
import { Ungroup } from "@/shared/icons/catalog";
import { PlusAction, TrashAction } from "@/shared/icons/motion";
import { Button, FieldSelect } from "@/shared/ui";
import type { Directory } from "@/organization/model";
import type { LowcodeField } from "./field-model";
import { defaultAppearance } from "./field-model";
import { numericLookup } from "./relations";
import { FieldRenderer } from "./FieldRenderer";
import { compatibleRuleFields, createRule, defaultRuleValue, isRuleGroup, ruleDepth, ruleLimits, ruleOperatorLabels, ruleOperators, ruleSize, validateRule, type Rule, type RuleLeaf, type RuleOperator } from "./rules";

export type RuleEditorProps = { value: Rule; onChange: (rule: Rule) => void; fields: LowcodeField[]; directory: Directory; disabled?: boolean };
function comparisonField(field: LowcodeField, operator: RuleOperator): LowcodeField {
  const type = field.type==="formula"?formulaResultType(field)==="text"?"textarea":formulaResultType(field):["summary"].includes(field.type) || numericLookup(field) ? "number" : field.type === "lookup" ? "textarea" : operator === "CONTAINS" ? ({ multiselect: "select", members: "member", departments: "department", positions: "position" } as Record<string, LowcodeField["type"]>)[field.type] ?? field.type : field.type;
  return { id: field.id, label: "比较值", type, options: field.options, ...(["select","multiselect"].includes(type) ? {choiceConfig: { displayLabels: field.choiceConfig?.displayLabels, colors: field.choiceConfig?.colors }} : {}), timePrecision: field.timePrecision, ratingMax: field.ratingMax, width: 12, ...(field.type === "lookup" && !numericLookup(field) ? { maxLength: 20000 } : {}), help: "", placeholder: "填写比较值", ...(field.type === "number" && ["idCard", "phone", "digits"].includes(field.format ?? "") ? { type: "text" } : {}), ...(operator === "CONTAINS" && !["select", "member", "department", "position"].includes(type) ? { type: "text" } : {}) };
}
export function RuleEditor({ value, onChange, fields, directory, disabled = false }: RuleEditorProps) {
  const eligible = fields.filter((field) => !["heading", "divider"].includes(field.type));
  const total = ruleSize(value), errors = validateRule(value, fields);
  function leafWithOperator(leaf: RuleLeaf, operator: RuleOperator): RuleLeaf {
    const field = eligible.find((entry) => entry.id === leaf.fieldId);
    if (operator === "EMPTY" || operator === "NOT_EMPTY") return { fieldId: leaf.fieldId, operator };
    if (leaf.valueFieldId && field && compatibleRuleFields(field, fields.find((entry) => entry.id === leaf.valueFieldId) ?? field, operator)) return { fieldId: leaf.fieldId, operator, valueFieldId: leaf.valueFieldId };
    return { fieldId: leaf.fieldId, operator, value: leaf.value ?? defaultRuleValue(field) };
  }
  function render(rule: Rule, change: (rule: Rule) => void, depth: number) {
    if (isRuleGroup(rule)) return <div className="min-w-0 space-y-3 rounded-card border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-end gap-2"><div className="min-w-32 flex-1"><FieldSelect label="匹配方式" value={rule.operator} options={[{ value: "AND", label: "全部满足（并且）" }, { value: "OR", label: "任一满足（或者）" }]} onChange={(operator) => change({ ...rule, operator: operator as "AND" | "OR" })} /></div>
        {rule.conditions.length === 1 && <Button variant="ghost" size="sm" disabled={disabled} onClick={() => change(rule.conditions[0])}><span className="inline-flex size-3.5"><Ungroup  /></span>取消分组</Button>}
      </div>
      {rule.conditions.map((child, index) => <div key={index} className="min-w-0 space-y-2 border-l-2 border-border pl-3">
        <div className="flex items-center justify-between"><span className="text-caption text-muted-foreground">条件 {index + 1}</span><Button variant="ghost" size="icon" aria-label={`删除条件 ${index + 1}`} disabled={disabled || rule.conditions.length <= 1} onClick={() => change({ ...rule, conditions: rule.conditions.filter((_, at) => at !== index) })}><TrashAction size={14} /></Button></div>
        {render(child, (next) => change({ ...rule, conditions: rule.conditions.map((entry, at) => at === index ? next : entry) }), depth + 1)}
      </div>)}
      <Button size="sm" variant="outline" disabled={disabled || !eligible.length || rule.conditions.length >= ruleLimits.children || total >= ruleLimits.nodes || depth >= ruleLimits.depth} onClick={() => change({ ...rule, conditions: [...rule.conditions, createRule(eligible)] })}><PlusAction size={14} />添加条件</Button>
    </div>;
    const field = eligible.find((entry) => entry.id === rule.fieldId), empty = ["EMPTY", "NOT_EMPTY"].includes(rule.operator);
    const compatible = field ? eligible.filter((right) => compatibleRuleFields(field, right, rule.operator)) : [];
    return <div className="min-w-0 space-y-3">
      <FieldSelect label="判断字段" value={rule.fieldId} options={eligible.map((field) => ({ value: field.id, label: field.label }))} onChange={(fieldId) => change({ fieldId, operator: "NOT_EMPTY" })} />
      <FieldSelect label="比较方式" value={rule.operator} options={ruleOperators(field).map((operator) => ({ value: operator, label: ruleOperatorLabels[operator] }))} onChange={(operator) => change(leafWithOperator(rule, operator as RuleOperator))} />
      {!empty && field && <>
        <FieldSelect label="比较对象" value={rule.valueFieldId ? "field" : "constant"} options={[{ value: "constant", label: "固定值" }, ...(compatible.length ? [{ value: "field", label: "另一字段" }] : [])]} onChange={(source) => change(source === "field" ? { fieldId: rule.fieldId, operator: rule.operator, valueFieldId: compatible[0].id } : { fieldId: rule.fieldId, operator: rule.operator, value: defaultRuleValue(field) })} />
        {rule.valueFieldId ? <FieldSelect label="比较字段" value={rule.valueFieldId} options={compatible.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(valueFieldId) => change({ ...rule, valueFieldId })} />
          : <FieldRenderer schema={{ name: "", description: "", fields: [comparisonField(field, rule.operator)], appearance: { ...defaultAppearance, columns: 1, density: "compact" } }} value={rule.value === undefined ? {} : { [field.id]: rule.value }} onChange={(next) => change({ fieldId: rule.fieldId, operator: rule.operator, value: (next[field.id] ?? "") as RuleLeaf["value"] })} directory={directory} disabled={disabled} />}
      </>}
      <Button size="sm" variant="ghost" disabled={disabled || total >= ruleLimits.nodes || depth + ruleDepth(rule) > ruleLimits.depth} onClick={() => change({ operator: "AND", conditions: [rule] })}><PlusAction size={14} />组合更多条件</Button>
    </div>;
  }
  return <fieldset disabled={disabled} className="min-w-0 space-y-2" aria-label="规则编辑器">
    {eligible.length ? render(value, onChange, 1) : <p className="text-caption text-muted-foreground">先添加可填写字段，再设置条件。</p>}
    {!!errors.length && <p role="alert" className="text-caption text-destructive">{errors[0]}</p>}
    <p className="text-caption leading-5 text-muted-foreground">最多 4 层、32 个条件节点，每组 8 项。未填写的值不参与比较。</p>
  </fieldset>;
}
