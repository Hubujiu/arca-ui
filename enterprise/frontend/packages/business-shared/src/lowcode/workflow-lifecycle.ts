import { defaultAppearance, validateValues, type LowcodeField, type TableSchema } from "./field-model";
import type { TreeModel } from "./workflow-model";

export type LifecycleOutcome = "APPROVED" | "REJECTED" | "WITHDRAWN";
export type LifecycleMapping = { fieldId: string; source: "FIXED"; value: unknown } | { fieldId: string; source: "FIELD"; sourceFieldId: string };
export type LifecycleMappings = Partial<Record<LifecycleOutcome, LifecycleMapping[]>>;
export const lifecycleOutcomes: Record<LifecycleOutcome, string> = { APPROVED: "通过", REJECTED: "拒绝", WITHDRAWN: "撤回" };
const types = new Set(["text", "textarea", "number", "progress", "rating", "date", "datetime", "time", "select", "multiselect", "checkbox", "email", "phone", "url", "idCard"]);
const text = new Set(["text", "textarea", "email", "phone", "url", "idCard"]), numeric = new Set(["number", "progress", "rating"]);
const visible = (field: LowcodeField) => !field.hidden && !["alwaysHidden", "createHidden"].includes(field.visibility ?? "") && field.visibleWhen == null;
export const lifecycleWritable = (field: LowcodeField) => types.has(field.type) && !field.readOnly && visible(field);
export const lifecycleReadableSource = (tree: TreeModel, field: LowcodeField) => types.has(field.type) && visible(field)
  && !tree.nodes.some(node => node.fieldPermissions?.[field.id]?.access === "HIDDEN");
export const lifecycleCompatible = (target: LowcodeField, source: LowcodeField) => target.type === source.type
  || text.has(target.type) && text.has(source.type) || numeric.has(target.type) && numeric.has(source.type);
export function lifecycleValueField(field: LowcodeField): LowcodeField {
  const next = { ...field, width: 12, column: 1, label: "写入值" };
  for (const key of ["defaultValue", "defaultSource", "defaultConfig", "visibleWhen", "requiredWhen", "warningRules", "help", "designNote"] as const) delete next[key];
  return next;
}
export function lifecycleMappingIssues(tree: TreeModel, schema?: TableSchema): string[] {
  const config = tree.lifecycleMappings;
  if (config == null) return [];
  if (typeof config !== "object" || Array.isArray(config)) return ["生命周期映射必须为对象"];
  const issues: string[] = [];
  for (const [outcome, mappings] of Object.entries(config)) {
    if (!Object.hasOwn(lifecycleOutcomes, outcome)) { issues.push("不支持的流程结果映射"); continue; }
    const prefix = `${lifecycleOutcomes[outcome as LifecycleOutcome]}映射：`;
    if (!Array.isArray(mappings) || mappings.length > 20) { issues.push(`${prefix}最多设置 20 项`); continue; }
    const ids = new Set<string>();
    for (const mapping of mappings) {
      if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) { issues.push(`${prefix}配置必须为对象`); continue; }
      if (typeof mapping.fieldId !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(mapping.fieldId) || ["constructor", "prototype", "__proto__"].includes(mapping.fieldId) || ids.has(mapping.fieldId)) issues.push(`${prefix}目标字段需要有效且不重复`);
      ids.add(mapping.fieldId);
      if (!["FIXED", "FIELD"].includes(mapping.source)) { issues.push(`${prefix}请选择固定值或来源字段`); continue; }
      if (Object.keys(mapping).some(key => !(mapping.source === "FIXED" ? ["fieldId", "source", "value"] : ["fieldId", "source", "sourceFieldId"]).includes(key))
        || mapping.source === "FIXED" && (!("value" in mapping) || mapping.value === undefined)
        || mapping.source === "FIELD" && (typeof mapping.sourceFieldId !== "string" || !mapping.sourceFieldId)) { issues.push(`${prefix}来源配置包含未知属性或缺少必填值`); continue; }
      if (!schema) continue;
      const target = schema.fields.find(field => field.id === mapping.fieldId);
      if (!target || !lifecycleWritable(target)) { issues.push(`${prefix}目标需要可填写、始终可见的普通字段`); continue; }
      if (mapping.source === "FIELD") {
        const source = schema.fields.find(field => field.id === mapping.sourceFieldId);
        if (!source || !lifecycleReadableSource(tree, source) || !lifecycleCompatible(target, source)) issues.push(`${prefix}来源需要可见且类型兼容的普通字段`);
      } else {
        const check = { name: "生命周期映射", description: "", fields: [lifecycleValueField(target)], appearance: defaultAppearance };
        const errors = validateValues(check, mapping.value === null ? {} : { [target.id]: mapping.value }, true, { mode: "edit" });
        for (const message of Object.values(errors)) issues.push(`${prefix}${target.label}：${message}`);
      }
    }
  }
  return issues;
}
