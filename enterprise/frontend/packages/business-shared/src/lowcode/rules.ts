import { emptyOtherChoice, validOtherChoice, choiceLabel } from "./choices";
import { numericLookup } from "./relations";
import {formulaResultType} from "./calculations";
import type { LowcodeField } from "./field-model";
import type { Directory } from "../organization/model";

export type RuleOperator = "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "EMPTY" | "NOT_EMPTY";
export type RuleLeaf = { fieldId: string; operator: RuleOperator; value?: string | number | boolean; valueFieldId?: string };
export type RuleGroup = { operator: "AND" | "OR"; conditions: Rule[] };
export type Rule = RuleLeaf | RuleGroup;
export const ruleLimits = { depth: 4, nodes: 32, children: 8 } as const;
export const ruleOperatorLabels: Record<Rule["operator"], string> = { EQ: "等于", NE: "不等于", GT: "大于", GTE: "大于等于", LT: "小于", LTE: "小于等于", CONTAINS: "包含", EMPTY: "未填写", NOT_EMPTY: "已填写", AND: "全部满足", OR: "任一满足" };
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const scalarOperators: RuleOperator[] = ["EQ", "NE", "GT", "GTE", "LT", "LTE"];
const decorations = new Set(["heading", "divider", "remark", "displayImage", "tabs", "collapse", "queryTable"]);
const arrays = new Set(["multiselect", "members", "departments", "positions"]);
export const isRuleGroup = (rule: Rule): rule is RuleGroup => rule.operator === "AND" || rule.operator === "OR";
export function ruleEmpty(value: unknown): boolean { return value === undefined || value === null || typeof value === "string" && !value.trim() || Array.isArray(value) && value.length === 0 || emptyOtherChoice(value); }
function kind(field: LowcodeField): string {
  if(field.type==="formula")return formulaResultType(field);
  if ((["number", "progress", "rating", "formula", "summary"].includes(field.type) || numericLookup(field)) && !["idCard", "phone", "digits"].includes(field.format ?? "")) return "number";
  if (["checkbox", "select", "member", "department", "position", "date", "datetime", "time"].includes(field.type)) return field.type;
  if (arrays.has(field.type) || ["image", "attachment", "signature", "subtable", "relation", "region", "location"].includes(field.type)) return "complex";
  return "text";
}
export function ruleOperators(field?: LowcodeField): RuleOperator[] {
  if (!field || decorations.has(field.type)) return [];
  const empty: RuleOperator[] = ["EMPTY", "NOT_EMPTY"];
  if (["signature", "image", "attachment", "subtable", "relation", "region", "location"].includes(field.type)) return empty;
  if (arrays.has(field.type)) return ["CONTAINS", ...empty];
  if (["number", "date", "datetime", "time"].includes(kind(field))) return [...scalarOperators, ...empty];
  return ["EQ", "NE", ...(kind(field) === "text" ? ["CONTAINS" as const] : []), ...empty];
}
export function compatibleRuleFields(left: LowcodeField, right: LowcodeField, operator: Rule["operator"]): boolean {
  return scalarOperators.includes(operator as RuleOperator) && !decorations.has(right.type) && ruleOperators(left).includes(operator as RuleOperator) && ruleOperators(right).includes(operator as RuleOperator) && kind(left) === kind(right) && kind(left) !== "complex";
}
export function defaultRuleValue(field?: LowcodeField): string | number | boolean {
  if (!field) return "";
  if (kind(field) === "number") return 0;
  if (field.type === "checkbox") return true;
  return field.options?.[0] ?? "";
}
export function createRule(fields: LowcodeField[]): RuleLeaf { return { fieldId: fields.find((field) => !decorations.has(field.type))?.id ?? "", operator: "NOT_EMPTY" }; }
export function ruleSize(rule: Rule): number { return isRuleGroup(rule) ? 1 + rule.conditions.reduce((sum, child) => sum + ruleSize(child), 0) : 1; }
export function ruleDepth(rule: Rule): number { return isRuleGroup(rule) ? 1 + Math.max(0, ...rule.conditions.map(ruleDepth)) : 1; }
export function ruleDependencies(rule: Rule): Set<string> {
  const result = new Set<string>();
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > ruleLimits.depth) return;
    const entry = node as Record<string, unknown>;
    if (typeof entry.fieldId === "string") result.add(entry.fieldId);
    if (typeof entry.valueFieldId === "string") result.add(entry.valueFieldId);
    if (Array.isArray(entry.conditions)) entry.conditions.slice(0, ruleLimits.children).forEach((child) => visit(child, depth + 1));
  };
  visit(rule, 1); return result;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function instant(value: string): bigint | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})[Tt]([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,9}))?([Zz]|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match || !validDate(match[1]) || match[8] && (Number(match[8]) > 18 || Number(match[9]) > 59 || Number(match[8]) === 18 && Number(match[9]) > 0)) return undefined;
  const milliseconds = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}${match[6].toUpperCase()}`);
  return Number.isFinite(milliseconds) ? BigInt(milliseconds) * 1000000n + BigInt((match[5] ?? "").padEnd(9, "0")) : undefined;
}
/** Rule operands use type domains, not field min/max or display precision. */
function operand(field: LowcodeField, value: unknown): string | number | boolean | bigint | undefined {
  if (ruleEmpty(value)) return undefined;
  const category = kind(field);
  if (category === "number") return typeof value === "number" && Number.isFinite(value) && (field.type !== "rating" || Number.isInteger(value) && value >= 0 && value <= (field.ratingMax ?? 5)) ? value : undefined;
  if (category === "checkbox") return typeof value === "boolean" ? value : undefined;
  if (typeof value !== "string" || [...value].length > (field.type === "lookup" ? 20000 : 10000)) return undefined;
  if (["member", "department", "position"].includes(category)) return uuid.test(value) ? value.toLowerCase() : undefined;
  if (category === "select") return field.options?.includes(value) ? value : undefined;
  if (category === "date") return validDate(value) ? value : undefined;
  if (category === "datetime") return instant(value);
  if (category === "time") {
    if (!(field.timePrecision === "second" ? /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/ : /^(?:[01]\d|2[0-3]):[0-5]\d$/).test(value)) return undefined;
    const [hour, minute, second = "0"] = value.split(":"); return Number(hour) * 3600 + Number(minute) * 60 + Number(second);
  }
  return category === "text" ? value : undefined;
}
function itemField(field: LowcodeField): LowcodeField {
  const type = ({ multiselect: "select", members: "member", departments: "department", positions: "position" } as const)[field.type as "multiselect"];
  return type ? { ...field, type } : field;
}
export function ruleConstantValid(field: LowcodeField, value: unknown, operator: RuleOperator): boolean { return operand(operator === "CONTAINS" ? itemField(field) : field, value) !== undefined; }
export function validateRule(rule: unknown, fields: LowcodeField[]): string[] {
  const errors: string[] = [], fieldsById = new Map(fields.filter((field) => !decorations.has(field.type)).map((field) => [field.id, field]));
  let nodes = 0;
  const visit = (value: unknown, depth: number) => {
    nodes += 1;
    if (nodes > ruleLimits.nodes || depth > ruleLimits.depth) { if (!errors.includes("条件最多 32 个节点、4 层")) errors.push("条件最多 32 个节点、4 层"); return; }
    if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push("条件配置必须为对象"); return; }
    const rule = value as Record<string, unknown>;
    if (rule.operator === "AND" || rule.operator === "OR") {
      if (Object.keys(rule).some((key) => !["operator", "conditions"].includes(key))) errors.push("条件组不能包含字段或比较值");
      if (!Array.isArray(rule.conditions) || !rule.conditions.length || rule.conditions.length > ruleLimits.children) { errors.push("条件组需要 1 至 8 项"); return; }
      rule.conditions.forEach((child) => visit(child, depth + 1)); return;
    }
    if (Object.keys(rule).some((key) => !["fieldId", "operator", "value", "valueFieldId"].includes(key))) errors.push("条件包含未知配置项");
    const field = fieldsById.get(String(rule.fieldId));
    if (!field) { errors.push("请选择存在的非装饰字段"); return; }
    const operator = rule.operator as RuleOperator;
    if (!ruleOperators(field).includes(operator)) { errors.push(`${field.label}不支持此比较方式`); return; }
    const hasValue = Object.hasOwn(rule, "value"), hasField = Object.hasOwn(rule, "valueFieldId");
    if (operator === "EMPTY" || operator === "NOT_EMPTY") { if (hasValue || hasField) errors.push("空值判断不能设置比较值"); return; }
    if (hasValue === hasField) { errors.push("比较值和比较字段必须且只能设置一项"); return; }
    if (hasField) {
      const right = fieldsById.get(String(rule.valueFieldId));
      if (!right || !compatibleRuleFields(field, right, operator)) errors.push("比较字段类型不兼容");
    } else if (!ruleConstantValid(field, rule.value, operator)) errors.push(`${field.label}的比较值无效`);
  };
  visit(rule, 1); return errors;
}
export function ruleMatches(rule: Rule, data: Record<string, unknown>, fields: LowcodeField[]): boolean {
  if (validateRule(rule, fields).length) return false;
  const lookup = new Map(fields.map((field) => [field.id, field]));
  const evaluate = (rule: Rule): boolean => {
    if (isRuleGroup(rule)) return rule.operator === "AND" ? rule.conditions.every(evaluate) : rule.conditions.some(evaluate);
    const field = lookup.get(rule.fieldId)!, value = data[field.id];
    if (rule.operator === "EMPTY") return ruleEmpty(value);
    if (rule.operator === "NOT_EMPTY") return !ruleEmpty(value);
    if (rule.operator === "CONTAINS" && arrays.has(field.type)) {
      if (!Array.isArray(value) || !value.length || value.length > 100) return false;
      const item = itemField(field), expected = operand(item, rule.value), normalized = value.map((entry) => operand(item, entry));
      return expected !== undefined && normalized.every((entry,index) => entry !== undefined || field.type === "multiselect" && validOtherChoice(field,value[index])) && normalized.includes(expected);
    }
    const rightField = rule.valueFieldId ? lookup.get(rule.valueFieldId)! : field;
    const left = operand(field, value), right = operand(rightField, rule.valueFieldId ? data[rule.valueFieldId] : rule.value);
    if (left === undefined || right === undefined || typeof left !== typeof right) return false;
    if (rule.operator === "CONTAINS") return typeof left === "string" && typeof right === "string" && left.includes(right);
    switch (rule.operator) {
      case "EQ": return left === right;
      case "NE": return left !== right;
      case "GT": return left > right;
      case "GTE": return left >= right;
      case "LT": return left < right;
      case "LTE": return left <= right;
    }
  };
  return evaluate(rule);
}
export function ruleSummary(rule: Rule, fields: LowcodeField[], directory?: Directory): string {
  if (!rule || typeof rule !== "object") return "待设置条件";
  if (isRuleGroup(rule)) return `（${rule.conditions.map((child) => ruleSummary(child, fields, directory)).join(rule.operator === "AND" ? "，并且 " : "，或者 ")}）`;
  const field = fields.find((entry) => entry.id === rule.fieldId), label = field?.label ?? "已删除字段";
  if (["EMPTY", "NOT_EMPTY"].includes(rule.operator)) return `${label}${ruleOperatorLabels[rule.operator]}`;
  let value = String(rule.value ?? "待填写");
  if (rule.valueFieldId) value = `字段「${fields.find((entry) => entry.id === rule.valueFieldId)?.label ?? "已删除字段"}」`;
  else if (field && ["select","multiselect"].includes(field.type)) value = choiceLabel(field,rule.value);
  else if (typeof rule.value === "boolean") value = rule.value ? "是" : "否";
  else if (field && directory) {
    const type = itemField(field).type;
    if (type === "member") value = directory.people.find((entry) => entry.id.toLowerCase() === value.toLowerCase())?.displayName ?? value;
    if (type === "department") value = directory.units.find((entry) => entry.id.toLowerCase() === value.toLowerCase())?.name ?? value;
    if (type === "position") value = directory.positions.find((entry) => entry.id.toLowerCase() === value.toLowerCase())?.name ?? value;
  }
  return `${label} ${ruleOperatorLabels[rule.operator]} ${value}`;
}
