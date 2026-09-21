import { fieldReferenceIssues, mergeReferenceFields, mergeReferenceValues, referenceLookupQuery } from "./field-reference-context";
import { fieldEventIssues, type FieldEvent } from "./field-events";
import { choiceLabel, choiceConfigError, choiceValueError, choiceJsonSchema, type ChoiceConfig, type OtherChoice } from "./choices";
import {advancedConfigError,advancedPattern,advancedValueError,advancedRowsError,type AdvancedFieldConfig} from "./advanced-fields";
import {validateFormLayouts, type FormLayout} from "./form-layouts";
import { defaultConfigIssues, defaultDependencies, defaultValidationValues, initializeFieldDefaults, type DefaultConfig } from "./field-defaults";
import { regionConfigError, regionError, regionJsonSchema, type RegionConfig, type RegionValue } from "./regions";
import { validateRecordPresentation } from "./record-presentation";
import { richTextLabel, validLocation, validateExtendedFields, type LocationBounds, type LayoutSection } from "./extended-fields";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { signatureJsonSchema, validSignature } from "./signature-model";
import { defaultSerialTemplate, serialTemplateError } from "./serial-template";
import type { CSSProperties } from "react";
import type { Directory } from "@/organization/model";
import { ruleDependencies, ruleEmpty, ruleMatches, validateRule, type Rule } from "./rules";
import { calculationDependencies, computedField, evaluateCalculation, numericField, formulaResultType, validateFormula, validateSummary, type FormulaConfig, type SummaryConfig } from "./calculations";

import { normalizeLookupValue, relationCount, relationLimit, type QueryConfig, type LookupConfig, type LookupResolver, type RelationConfig } from "./relations";

export type WarningRule = { id: string; condition: Rule; message: string; color: "amber" | "red" | "blue" };
export type ValidationRule = { id: string; condition: Rule; message: string; fieldId?: string; when?: Rule };
export type ValueContext = { mode?: "create" | "edit"; existing?: Record<string, unknown>; lookupResolver?: LookupResolver; referenceFields?: LowcodeField[]; referenceValues?: Record<string,unknown> };

export const fieldTypes = [
  { type: "queryTable", label: "查询表", group: "展示" },
  { type: "richtext", label: "富文本", group: "基础" },
  { type: "location", label: "定位", group: "基础" },
  { type: "region", label: "地区", group: "选择" },
  { type: "chineseAmount", label: "大写金额", group: "展示" },
  { type: "remark", label: "富文本备注", group: "展示" },
  { type: "displayImage", label: "展示图片", group: "展示" },
  { type: "tabs", label: "标签页", group: "布局" },
  { type: "collapse", label: "折叠面板", group: "布局" },
  { type: "text", label: "单行文本", group: "基础" },
  { type: "textarea", label: "多行文本", group: "基础" },
  { type: "number", label: "数字", group: "基础" },
  { type: "idCard", label: "身份证", group: "基础" },
  { type: "serial", label: "格式化编号", group: "基础" },
  { type: "signature", label: "电子签名", group: "基础" },
  { type: "date", label: "日期", group: "基础" },
  { type: "datetime", label: "日期时间", group: "基础" },
  { type: "time", label: "时间", group: "基础" },
  { type: "rating", label: "评分", group: "基础" },
  { type: "image", label: "图片", group: "基础" },
  { type: "attachment", label: "附件", group: "基础" },
  { type: "subtable", label: "明细子表", group: "基础" },
  { type: "relation", label: "关联记录", group: "选择" },
  { type: "lookup", label: "查询字段", group: "展示" },
  { type: "select", label: "单选", group: "选择" },
  { type: "multiselect", label: "多选", group: "选择" },
  { type: "checkbox", label: "勾选确认", group: "选择" },
  { type: "member", label: "成员", group: "选择" },
  { type: "members", label: "多位成员", group: "选择" },
  { type: "department", label: "部门", group: "选择" },
  { type: "departments", label: "多个部门", group: "选择" },
  { type: "position", label: "岗位", group: "选择" },
  { type: "positions", label: "多个岗位", group: "选择" },
  { type: "email", label: "邮箱", group: "联系" },
  { type: "phone", label: "电话", group: "联系" },
  { type: "url", label: "网址", group: "联系" },
  { type: "progress", label: "进度", group: "展示" },
  { type: "formula", label: "计算公式", group: "展示" },
  { type: "summary", label: "子表汇总", group: "展示" },
  { type: "heading", label: "分组标题", group: "展示" },
  { type: "divider", label: "分隔线", group: "展示" },
] as const;

export type FieldType = (typeof fieldTypes)[number]["type"];
export type LowcodeField = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  minimum?: number | string;
  maximum?: number | string;
  width?: number;
  column?: number;
  rows?: number;
  codeTemplate?: string;
  maxLength?: number;
  defaultValue?: string | number | boolean | OtherChoice | (string | OtherChoice)[];
  defaultSource?: "custom" | "initiator" | "currentDate" | "currentTime" | "currentYear";
  defaultConfig?: DefaultConfig;
  readOnly?: boolean;
  hidden?: boolean;
  visibility?: "visible" | "createHidden" | "alwaysHidden";
  helpDisplay?: "inline" | "tooltip";
  designNote?: string;
  unique?: boolean;
  numericConfig?: { decimalPlaces?: number; unit?: string; thousandsSeparator?: boolean };
  choiceConfig?: ChoiceConfig;
  timePrecision?: "minute" | "second";
  ratingMax?: number;
  signatureHeight?: number;
  sequenceReset?: "never" | "year" | "month" | "day";
  advancedConfig?: AdvancedFieldConfig;
  fileConfig?: { maxFiles?: number; maxSizeMb?: number; accept?: string[] };
  selectionScope?: { departmentIds?: string[]; positionIds?: string[] };
  visibleWhen?: Rule;
  requiredWhen?: Rule;
  warningRules?: WarningRule[];
  subtableConfig?: { fields: LowcodeField[]; minRows?: number; maxRows?: number; validationRules?: ValidationRule[] };
  formulaConfig?: FormulaConfig;
  summaryConfig?: SummaryConfig;
  relationConfig?: RelationConfig;
  lookupConfig?: LookupConfig;
  queryConfig?: QueryConfig;
  richContent?: string;
  imageConfig?: { fileIds: string[]; layout?: "grid" | "row"; widthPercent?: number };
  layoutConfig?: { sections: LayoutSection[]; style?: "tabs" | "navigation" };
  amountConfig?: { sourceFieldId: string; unit?: "元" | "圆" };
  locationConfig?: { bounds?: LocationBounds };
  regionConfig?: RegionConfig;
  format?: "number" | "integer" | "currency" | "percent" | "idCard" | "phone" | "digits";
};
export type Appearance = {
  columns: 1 | 2 | 3 | 4;
  accent: "slate" | "blue" | "teal" | "violet" | "amber" | "rose";
  cover: "none" | "paper" | "ocean" | "meadow" | "sunset";
  density: "comfortable" | "compact";
  submitLabel: string;
};
export type TableSchema = {
  schemaVersion?: 1 | 2;
  name: string;
  description: string;
  fields: LowcodeField[];
  appearance?: Appearance;
  validationRules?: ValidationRule[];
  titleFieldId?: string;
  detailConfig?: import("./record-presentation").DetailConfig;
  printConfig?: import("./record-presentation").PrintConfig;
  printTemplates?: import("./record-presentation").PrintTemplate[];
  defaultPrintTemplateId?: string;
  layouts?: FormLayout[];
  defaultLayoutId?: string;
  fieldEvents?: FieldEvent[];
};
export type SubtableRow = { id: string; values: Record<string, unknown> };
export function subtableSchema(field: LowcodeField): TableSchema { return { name: "", description: "", fields: field.subtableConfig?.fields ?? [], validationRules: field.subtableConfig?.validationRules }; }

export const defaultAppearance: Appearance = {
  columns: 2, accent: "blue", cover: "none", density: "comfortable", submitLabel: "提交",
};
export const accentPresets = [
  { value: "slate", label: "石墨", color: "#475569" },
  { value: "blue", label: "湖蓝", color: "#2563eb" },
  { value: "teal", label: "青绿", color: "#0f766e" },
  { value: "violet", label: "紫藤", color: "#7c3aed" },
  { value: "amber", label: "琥珀", color: "#b45309" },
  { value: "rose", label: "玫瑰", color: "#be123c" },
] as const;
export const coverPresets = [
  { value: "none", label: "无封面", className: "bg-transparent" },
  { value: "paper", label: "素纸", className: "bg-stone-200 dark:bg-stone-700" },
  { value: "ocean", label: "海岸", className: "bg-status-info/10 dark:bg-status-info/10" },
  { value: "meadow", label: "草地", className: "bg-status-success/10 dark:bg-status-success/10" },
  { value: "sunset", label: "落日", className: "bg-orange-100 dark:bg-orange-950" },
] as const;
export const controlClass = "w-full rounded-card border border-border bg-background px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50";
export function isDecoration(field: LowcodeField) { return ["heading", "divider", "remark", "displayImage", "tabs", "collapse", "queryTable"].includes(field.type); }
export function isFieldVisible(field: LowcodeField, mode: "create" | "edit" = "create", readOnly = false) {
  return field.visibility !== "alwaysHidden" && !(field.visibility === "createHidden" && mode === "create" && !readOnly) && (readOnly || !field.hidden);
}
export function scopedDirectory(field: LowcodeField, directory: Directory): Directory {
  const scope = field.selectionScope;
  if (!scope) return directory;
  return { ...directory, people: directory.people.filter((person) =>
    (!scope.departmentIds?.length || scope.departmentIds.some((id) => id.toLowerCase() === person.orgUnitId?.toLowerCase())) &&
    (!scope.positionIds?.length || scope.positionIds.some((id) => id.toLowerCase() === person.positionId?.toLowerCase()))) };
}
export const safeImageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
export function textLimit(type: FieldType) {
  return type === "richtext" ? 20000 : type === "textarea" ? 10000 : type === "email" ? 254 : type === "phone" ? 40 : type === "url" ? 2048 : 1000;
}
export function createField(type: FieldType): LowcodeField {
  const field: LowcodeField = {
    id: `f${crypto.randomUUID().replaceAll("-", "")}`,
    type, label: fieldTypes.find((entry) => entry.type === type)?.label ?? "字段",
    required: false, width: ["textarea", "richtext", "signature", "heading", "divider", "remark", "displayImage", "tabs", "collapse", "queryTable"].includes(type) ? 12 : 6,
    placeholder: "", help: "",
  };
  if (type === "textarea") field.rows = 4;
  if (type === "serial") { field.codeTemplate = defaultSerialTemplate; field.readOnly = true; field.required = true; }
  if (["text", "textarea", "richtext", "email", "phone", "url"].includes(type)) field.maxLength = textLimit(type);
  if (type === "select" || type === "multiselect") field.options = ["选项一", "选项二"];
  if (type === "progress") { field.minimum = 0; field.maximum = 100; }
  if (type === "subtable") { field.width = 12; field.subtableConfig = { fields: [createField("text")], minRows: 0, maxRows: 50 }; }
  if (type === "formula") { field.readOnly = true; field.formulaConfig = { resultType: "number", expression: { op: "CONST", value: 0 } }; }
  if (type === "summary") { field.readOnly = true; field.summaryConfig = { subtableId: "", operation: "COUNT" }; }
  if (type === "relation") field.relationConfig = { tableId: "", multiple: false, maxRecords: 1 };
  if (type === "lookup") { field.readOnly = true; field.lookupConfig = { relationFieldId: "", targetFieldId: "", resultType: "text" }; }
  if (type === "queryTable") field.queryConfig = {tableId:"",columnIds:[],pageSize:10};
  if (type === "remark") field.richContent = "<p>填写说明</p>";
  if (type === "displayImage") field.imageConfig = { fileIds: [], layout: "grid", widthPercent: 100 };
  if (type === "tabs" || type === "collapse") field.layoutConfig = { sections: [{ id: "section1", title: "分区一", fieldIds: [], collapsed: false }], style: "tabs" };
  if (type === "chineseAmount") { field.readOnly = true; field.amountConfig = { sourceFieldId: "", unit: "元" }; }
  return field;
}
export function appearanceStyle(appearance?: Appearance): Record<"--primary" | "--primary-foreground" | "--ring" | "--lc-accent", string> {
  const color = accentPresets.find((preset) => preset.value === appearance?.accent)?.color ?? "#2563eb";
  return { "--primary": color, "--primary-foreground": "#ffffff", "--ring": color, "--lc-accent": color };
}
export function fieldWidth(field: LowcodeField): number {
  if (isDecoration(field)) return 12;
  return Math.min(12, Math.max(1, Number.isInteger(field.width) ? field.width! : 6));
}
export function fieldColumn(field: LowcodeField): number {
  if (isDecoration(field)) return 1;
  return Math.min(12, Math.max(1, Number.isInteger(field.column) ? field.column! : 1));
}
export function renderFieldSpan(field: LowcodeField, columns: number): number {
  if (columns === 1 || isDecoration(field)) return 12;
  return Math.min(12, Math.max(1, field.width ?? 12 / columns));
}
export function fieldGridStyle(span: number, column = 1): CSSProperties {
  const start = Math.min(Math.max(1, column), Math.max(1, 13 - span));
  return { gridColumn: `${start} / span ${span}` };
}
export function placeFieldAt(field: LowcodeField, column: number, width: number): LowcodeField {
  const next = { ...field };
  const start = Math.min(12, Math.max(1, column));
  next.width = Math.min(12, Math.max(1, width), 13 - start);
  if (start <= 1) delete next.column;
  else next.column = start;
  return next;
}
export const fieldWidthSteps = [3, 4, 6, 8, 9, 12] as const;
export function snapFieldWidth(units: number): number {
  const clamped = Math.min(12, Math.max(3, units));
  return fieldWidthSteps.reduce((best, step) => Math.abs(step - clamped) < Math.abs(best - clamped) ? step : best);
}
export type FieldDropEdge = "left" | "right" | "before" | "after";
export function placeField(fields: LowcodeField[], draggedId: string, targetId: string, edge: FieldDropEdge): LowcodeField[] {
  if (draggedId === targetId) return fields;
  const from = fields.findIndex((field) => field.id === draggedId);
  const targetAt = fields.findIndex((field) => field.id === targetId);
  if (from < 0 || targetAt < 0) return fields;
  const next = fields.map((field) => ({ ...field }));
  const [moved] = next.splice(from, 1);
  const index = next.findIndex((field) => field.id === targetId);
  let dragged = moved;
  let target = next[index];
  const share = (edge === "left" || edge === "right") && !isDecoration(target) && !isDecoration(dragged);
  if (share) {
    const targetCol = fieldColumn(target);
    const targetSpan = fieldWidth(target);
    if (edge === "right") {
      const start = targetCol + targetSpan;
      if (start <= 10) dragged = placeFieldAt(dragged, start, Math.min(fieldWidth(dragged), 13 - start));
      else {
        target = placeFieldAt(target, 1, 6);
        dragged = placeFieldAt(dragged, 7, 6);
      }
    } else if (targetCol >= 4) {
      const span = Math.min(fieldWidth(dragged), targetCol - 1);
      dragged = placeFieldAt(dragged, targetCol - span, span);
    } else {
      dragged = placeFieldAt(dragged, 1, 6);
      target = placeFieldAt(target, 7, 6);
    }
  } else dragged = placeFieldAt(dragged, 1, fieldWidth(dragged));
  next[index] = target;
  next.splice(edge === "left" || edge === "before" ? index : index + 1, 0, dragged);
  return next;
}
export function fieldRows(fields: LowcodeField[]): LowcodeField[][] {
  const rows: LowcodeField[][] = [];
  for (const field of fields) {
    if (!rows.length || isDecoration(field) || fieldColumn(field) <= 1) rows.push([field]);
    else rows[rows.length - 1].push(field);
  }
  return rows;
}
/** Call for new records only; defaults never overwrite existing record values. */
export type DefaultUser = { id: string; displayName: string };
export function initialValues(schema: TableSchema, user?: DefaultUser, now = new Date(), linkedDefaults = true): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  for (const field of schema.fields) {
    if (isDecoration(field) || ["serial", "signature", "image", "attachment", "subtable", "formula", "summary", "relation", "lookup"].includes(field.type)) continue;
    let value: unknown = field.defaultValue ?? (field.type === "checkbox" && !field.defaultConfig ? false : undefined);
    if (field.defaultSource === "initiator") value = !user ? undefined : field.type === "members" ? [user.id] : field.type === "member" ? user.id : user.displayName;
    if (field.defaultSource === "currentDate") value = today;
    if (field.defaultSource === "currentTime") value = field.type === "time" ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", ...(field.timePrecision === "second" ? { second: "2-digit" as const } : {}), hourCycle: "h23" }).format(now) : now.toISOString();
    if (field.defaultSource === "currentYear") value = field.type === "number" ? Number(today.slice(0, 4)) : today.slice(0, 4);
    if (value !== undefined) values[field.id] = Array.isArray(value) ? [...value] : value;
  }
  return linkedDefaults ? initializeFieldDefaults(schema, values, { user }).values : values;
}
export function isIdentifier(field: LowcodeField) { return field.type === "idCard" || ["idCard", "phone", "digits"].includes(field.format ?? ""); }
export const inputFormats = [
  { value: "number", label: "普通数字" }, { value: "integer", label: "整数" },
  { value: "currency", label: "金额（最多两位小数）" }, { value: "percent", label: "百分比" },
  { value: "phone", label: "手机号码（11 位）" },
  { value: "digits", label: "数字编号（保留前导零）" },
];
export const formatPatterns: Record<string, string> = { idCard: "^[1-9][0-9]{16}[0-9Xx]$", phone: "^1[3-9][0-9]{9}$", digits: "^[0-9]+$" };
export function fieldValueLabel(field: LowcodeField, value: unknown, directory: Directory): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "未填写";
  if (["select", "multiselect"].includes(field.type)) return choiceLabel(field,value) || "未填写";
  if (field.type === "richtext") return richTextLabel(String(value)) || "未填写";
  if (field.type === "location") return validLocation(value) ? [value.address, `${value.latitude}, ${value.longitude}`].filter(Boolean).join(" · ") : "未填写";
  if (field.type === "region") { const region = value as RegionValue; return Array.isArray(region?.names) ? [...region.names, region.address].filter(Boolean).join(" / ") : "未填写"; }
  if (field.type === "signature") return validSignature(value) ? "已签名" : "未签名";
  if (field.type === "checkbox") return value === true ? "是" : "否";
  if (field.type === "member" || field.type === "members") {
    return (Array.isArray(value) ? value : [value]).map((id) => {
      const person = directory.people.find((entry) => entry.id.toLowerCase() === String(id).toLowerCase());
      return person ? `${person.displayName}${person.enabled ? "" : "（已停用）"}` : `未知成员（${String(id).slice(0, 8)}）`;
    }).join("、");
  }
  if (["department", "departments", "position", "positions"].includes(field.type)) {
    const department = field.type === "department" || field.type === "departments";
    const entries = department ? directory.units : directory.positions;
    return (Array.isArray(value) ? value : [value]).map((id) => entries.find((entry) => entry.id.toLowerCase() === String(id).toLowerCase())?.name ?? `未知${department ? "部门" : "岗位"}（${String(id).slice(0, 8)}）`).join("、");
  }
  if (["image", "attachment"].includes(field.type)) return Array.isArray(value) ? `${value.length} 个${field.type === "image" ? "图片" : "附件"}` : "未填写";
  if (field.type === "relation") return Array.isArray(value) ? `已关联 ${value.length} 条` : "未关联";
  if (field.type === "subtable") return Array.isArray(value) ? `共 ${value.length} 行` : "未填写";
  if (field.type === "rating") return `${value} / ${field.ratingMax ?? 5}${field.numericConfig?.unit ?? ""}`;
  if ((field.numericConfig || computedField(field)) && typeof value === "number") {
    const config = { ...(computedField(field) ? { decimalPlaces: 2 } : {}), ...field.numericConfig };
    return value.toLocaleString("zh-CN", { useGrouping: config.thousandsSeparator ?? false, minimumFractionDigits: config.decimalPlaces ?? (field.format === "currency" ? 2 : 0), maximumFractionDigits: config.decimalPlaces ?? (field.format === "currency" ? 2 : 20) }) + (config.unit ?? (field.type === "progress" || field.format === "percent" ? "%" : ""));
  }
  if (field.type === "progress" && typeof value === "number") return `${value}%`;
  if (field.format === "percent" && typeof value === "number") return `${value}%`;
  if (field.format === "currency" && typeof value === "number") return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (field.type === "datetime" && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("zh-CN", { hour12: false });
  }
  return Array.isArray(value) ? value.join("、") : String(value);
}

const uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
const datetimePattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:[Zz]|[+-][0-9]{2}:[0-9]{2})$";
const FIELD_KEY_LABELS: Record<string, string> = {
  column: "列位置",
  selectionScope: "可选成员范围",
  numericConfig: "数字显示",
  choiceConfig: "选项外观",
  timePrecision: "时间精度",
  ratingMax: "评分上限",
  signatureHeight: "手写区域高度",
  helpDisplay: "说明显示方式",
  designNote: "设计备注",
  visibility: "字段可见性",
  unique: "值不可重复",
  sequenceReset: "流水号重置周期",
  fileConfig: "文件限制", advancedConfig: "高级字段参数",
  schemaVersion: "表单版本",
  visibleWhen: "条件显示", requiredWhen: "条件必填", warningRules: "字段提示", validationRules: "提交校验",
  relationConfig: "关联记录", lookupConfig: "查询字段", subtableConfig: "明细子表", formulaConfig: "计算公式", summaryConfig: "子表汇总",
};
const CORE_FIELD_KEYS = new Set("id label type required placeholder help options minimum maximum width rows maxLength defaultValue defaultSource defaultConfig readOnly hidden format codeTemplate".split(" "));
function formatConfigKeys(keys: string[]) {
  return keys.map((key) => FIELD_KEY_LABELS[key] ? `${FIELD_KEY_LABELS[key]}（${key}）` : key).join("、");
}
/** When the server withholds the key names, name the field and item from the draft. */
export function clarifySchemaRejection(schema: TableSchema, serverMessage: string): string {
  const local = Object.values(validateFieldConfigs(schema));
  if (local.length) return local[0];
  if (!serverMessage.includes("包含不支持的配置项") || serverMessage.includes("：")) return serverMessage;
  const parts: string[] = [];
  const extraRoot = Object.keys(schema).filter((key) => !["name", "description", "fields", "appearance", "schemaVersion", "validationRules", "titleFieldId", "detailConfig", "printConfig", "printTemplates", "defaultPrintTemplateId"].includes(key)).sort();
  if (serverMessage.startsWith("表单配置") && extraRoot.length) parts.push(`表单配置包含不支持的配置项：${formatConfigKeys(extraRoot)}`);
  for (const field of schema.fields) {
    const extra = Object.keys(field).filter((key) => !CORE_FIELD_KEYS.has(key)).sort();
    if (extra.length) parts.push(`字段「${field.label || field.id}」包含不支持的配置项：${formatConfigKeys(extra)}`);
  }
  return parts.join("；") || serverMessage;
}
/** Closed configuration validation, including nested objects. Server remains authoritative. */
export function validateFieldConfigs(schema: TableSchema, child = false, referenceFields?: LowcodeField[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const availableReferences=mergeReferenceFields(Array.isArray(schema.fields)?schema.fields:[],referenceFields);
  const fieldKeys = new Set("id label type required placeholder help options minimum maximum width column rows codeTemplate maxLength defaultValue defaultSource defaultConfig readOnly hidden format numericConfig choiceConfig timePrecision ratingMax signatureHeight helpDisplay designNote visibility unique sequenceReset fileConfig selectionScope visibleWhen requiredWhen warningRules subtableConfig formulaConfig summaryConfig relationConfig lookupConfig richContent imageConfig layoutConfig amountConfig locationConfig queryConfig regionConfig advancedConfig".split(" "));
  const present = (value: unknown) => value !== undefined;
  const integer = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
  const object = (value: unknown, keys: string[]) => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key));
  const uuidList = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every((id) => typeof id === "string" && new RegExp(uuidPattern).test(id)) && new Set(value.map((id) => String(id).toLowerCase())).size === value.length;
  const eventIssues=fieldEventIssues(schema,child); if(eventIssues.length) errors._form=eventIssues[0];
  const schemaKeys = ["name", "description", "fields", "appearance", "schemaVersion", "validationRules", "titleFieldId", "detailConfig", "printConfig", "printTemplates", "defaultPrintTemplateId", "layouts", "defaultLayoutId", "fieldEvents"];
  const extra = Object.keys(schema).filter((key) => !schemaKeys.includes(key)).sort();
  if (extra.length) errors._form = `表单配置包含不支持的配置项：${formatConfigKeys(extra)}`;
  else if (!object(schema, schemaKeys) || present(schema.schemaVersion) && ![1, 2].includes(schema.schemaVersion!)) errors._form = "表单配置包含未知属性或不支持的版本";
  if (!Array.isArray(schema.fields) || schema.fields.length > (child ? 20 : 100) || child && !schema.fields.length) return { _form: child ? "子表需要 1 至 20 个字段" : "表单字段最多一百个" };
  if (!child && schema.fields.length + schema.fields.reduce((total, field) => total + (Array.isArray(field.subtableConfig?.fields) ? field.subtableConfig.fields.length : 0), 0) > 200) errors._form = "根与子表字段合计最多 200 个";
  if (schema.appearance !== undefined) {
    const appearance = schema.appearance;
    if (!object(appearance, ["columns", "accent", "cover", "density", "submitLabel"]) || appearance.columns !== undefined && !integer(appearance.columns, 1, 4) || appearance.accent !== undefined && !accentPresets.some((preset) => preset.value === appearance.accent) || appearance.cover !== undefined && !coverPresets.some((preset) => preset.value === appearance.cover) || appearance.density !== undefined && !["comfortable", "compact"].includes(appearance.density) || appearance.submitLabel !== undefined && (typeof appearance.submitLabel !== "string" || !appearance.submitLabel.trim() || [...appearance.submitLabel].length > 24)) errors._form = "表单外观配置无效";
  }
  Object.assign(errors, validateExtendedFields(schema, child));
  const presentationError=validateRecordPresentation(schema,child);if(presentationError)errors._form=presentationError;
  const layoutError=validateFormLayouts(schema,child);if(layoutError)errors._form=layoutError;
  const ids = new Set<string>();
  for (const field of schema.fields) {
    const fail = (message: string) => { errors[field.id] ??= `${field.label}：${message}`; };
    const advancedIssue = advancedConfigError(field); if (advancedIssue) fail(advancedIssue);
    const regionConfigIssue = regionConfigError(field); if (regionConfigIssue) fail(regionConfigIssue);
    const unknown = Object.keys(field).filter((key) => !fieldKeys.has(key)).sort();
    if (unknown.length) fail(`包含不支持的配置项：${formatConfigKeys(unknown)}`);
    if (!/^[a-z][a-zA-Z0-9]{0,63}$/.test(field.id) || ["constructor", "prototype", "__proto__"].includes(field.id) || ids.has(field.id)) fail("字段标识无效或重复");
    ids.add(field.id);
    if (!fieldTypes.some((type) => type.type === field.type)) fail("不支持的字段类型");
    if (child && (["subtable", "summary", "serial", "tabs", "collapse"].includes(field.type) || field.unique !== undefined)) fail("子字段不支持嵌套子表、汇总、编号或唯一值");
    for (const [key, max] of [["label", 128], ["placeholder", 200], ["help", 2000], ["designNote", 2000]] as const) {
      const value = field[key];
      if (present(value) && (typeof value !== "string" || [...value].length > max)) fail(`${key === "designNote" ? "设计备注" : "文本属性"}格式或长度不正确`);
    }
    if (!field.label?.trim()) fail("字段名称不能为空");
    for (const key of ["required", "readOnly", "hidden", "unique"] as const) if (present(field[key]) && typeof field[key] !== "boolean") fail("状态设置必须为是否值");
    if (field.width !== undefined && !integer(field.width, 1, 12)) fail("字段宽度必须为 1 至 12");
    if (field.column !== undefined && !integer(field.column, 1, 12)) fail("字段列位置必须为 1 至 12");
    if (isDecoration(field) && (field.required || field.defaultValue !== undefined || field.defaultSource !== undefined || field.readOnly !== undefined || field.hidden !== undefined)) fail("标题和分隔线不支持必填、默认值、只读或隐藏");
    if (field.rows !== undefined && (field.type !== "textarea" || !integer(field.rows, 1, 20))) fail("文本行数必须为 1 至 20，且仅适用于多行文本");
    if (field.maxLength !== undefined && (!["text", "textarea", "richtext", "email", "phone", "url"].includes(field.type) || !integer(field.maxLength, 1, textLimit(field.type)))) fail("文本长度无效或与字段类型不匹配");
    if (field.format !== undefined && (field.type !== "number" || !["number", "integer", "currency", "percent", "idCard", "phone", "digits"].includes(field.format))) fail("输入格式与字段类型不匹配");
    if (field.options !== undefined && !["select", "multiselect"].includes(field.type)) fail("仅选择字段可以设置选项");
    if (["select", "multiselect"].includes(field.type) && (!Array.isArray(field.options) || !field.options.length || field.options.length > 100 || field.options.some((option) => typeof option !== "string" || !option.trim() || option !== option.trim() || [...option].length > 128) || new Set(field.options).size !== field.options.length)) fail("选项需要 1 至 100 项，且不能空白、重复或超过 128 个字符");
    if (field.codeTemplate !== undefined && (field.type !== "serial" || typeof field.codeTemplate !== "string" || serialTemplateError(field.codeTemplate))) fail("编号模板无效或与字段类型不匹配");
    for (const issue of defaultConfigIssues(field, schema.fields)) fail(issue);
    if (field.defaultSource !== undefined) {
      const compatible = field.defaultSource === "custom" || field.defaultSource === "initiator" && ["text", "textarea", "member", "members"].includes(field.type) || field.defaultSource === "currentDate" && ["text", "date"].includes(field.type) || field.defaultSource === "currentTime" && ["datetime", "time"].includes(field.type) || field.defaultSource === "currentYear" && (field.type === "text" || field.type === "number" && !isIdentifier(field));
      if (!compatible || field.defaultSource !== "custom" && field.defaultValue !== undefined) fail("默认来源与类型不匹配，或同时设置了动态及自定义默认值");
    }
    for (const key of ["minimum", "maximum"] as const) if (field[key] !== undefined) {
      if (field.type==="rating" || (!numericField(field) && !["date", "datetime"].includes(field.type)) || isIdentifier(field)) fail("此字段不能设置范围");
      else if (numericField(field)) {
        if (typeof field[key] !== "number" || !Number.isFinite(field[key]) || field.type === "progress" && (Number(field[key]) < 0 || Number(field[key]) > 100)) fail("数值范围无效");
      } else if (typeof field[key] !== "string" || !Number.isFinite(Date.parse(String(field[key])))) fail("日期范围无效");
    }
    if (field.minimum !== undefined && field.maximum !== undefined && (numericField(field) ? Number(field.minimum) > Number(field.maximum) : Date.parse(String(field.minimum)) > Date.parse(String(field.maximum)))) fail("最小值不能大于最大值");
    if (field.helpDisplay !== undefined && !["inline", "tooltip"].includes(field.helpDisplay)) fail("字段说明显示方式无效");
    if (field.visibility !== undefined && (isDecoration(field) || !["visible", "createHidden", "alwaysHidden"].includes(field.visibility))) fail("显示规则无效");
    if (field.unique !== undefined && !["text", "email", "phone", "idCard", "number"].includes(field.type)) fail("此字段不支持唯一值");
    if (field.numericConfig !== undefined) {
      const config = field.numericConfig;
      if (!numericField(field) || isIdentifier(field) || !object(config, ["decimalPlaces", "unit", "thousandsSeparator"])) fail("数字显示配置与字段类型不匹配或包含未知属性");
      else {
        if (config.decimalPlaces !== undefined && !integer(config.decimalPlaces, 0, 8)) fail("小数位数必须为 0 至 8");
        if (config.unit !== undefined && (typeof config.unit !== "string" || [...config.unit].length > 24)) fail("单位最多 24 个字符");
        if (config.thousandsSeparator !== undefined && typeof config.thousandsSeparator !== "boolean") fail("千分位设置无效");
      }
    }
    if (field.choiceConfig !== undefined) {
      const config = field.choiceConfig;
      const choiceIssue = choiceConfigError(field); if (choiceIssue) fail(choiceIssue);
      if (!["select", "multiselect"].includes(field.type) || !object(config, ["style", "colors", "displayLabels", "allowOther", "otherLabel", "otherMaxLength"])) fail("选项显示配置与字段类型不匹配或包含未知属性");
      else {
        if (config.style !== undefined && (!["dropdown", "horizontal", "vertical", "stages"].includes(config.style) || config.style === "stages" && field.type !== "select")) fail("选项显示方式无效");
        if (config.colors !== undefined && (!object(config.colors, field.options ?? []) || Object.values(config.colors).some((color) => typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)))) fail("选项颜色需要已有选项和六位十六进制颜色");
      }
    }
    if (field.timePrecision !== undefined && (field.type !== "time" || !["minute", "second"].includes(field.timePrecision))) fail("时间精度无效");
    if (field.ratingMax !== undefined && (field.type !== "rating" || !integer(field.ratingMax, 1, 10))) fail("评分上限必须为 1 至 10");
    if (field.signatureHeight !== undefined && (field.type !== "signature" || !integer(field.signatureHeight, 120, 600))) fail("签名高度必须为 120 至 600");
    if (field.sequenceReset !== undefined && (field.type !== "serial" || !["never", "year", "month", "day"].includes(field.sequenceReset))) fail("编号重置周期无效");
    if (field.fileConfig !== undefined) {
      const config = field.fileConfig;
      if (!["image", "attachment"].includes(field.type) || !object(config, ["maxFiles", "maxSizeMb", "accept"])) fail("文件配置与字段类型不匹配或包含未知属性");
      else {
        if (config.maxFiles !== undefined && !integer(config.maxFiles, 1, 20)) fail("文件数量必须为 1 至 20");
        if (config.maxSizeMb !== undefined && !integer(config.maxSizeMb, 1, 50)) fail("文件大小必须为 1 至 50 MB");
        if (config.accept !== undefined && (!Array.isArray(config.accept) || config.accept.length > 50 || config.accept.some((extension) => typeof extension !== "string" || !/^\.[a-zA-Z0-9]{1,16}$/.test(extension) || field.type === "image" && !safeImageExtensions.includes(extension.toLowerCase())) || new Set(config.accept.map((entry) => String(entry).toLowerCase())).size !== config.accept.length)) fail("文件扩展名无效、重复或不受支持");
      }
    }
    if (field.selectionScope !== undefined) {
      const config = field.selectionScope;
      if (!["member", "members"].includes(field.type) || !object(config, ["departmentIds", "positionIds"]) || config.departmentIds !== undefined && !uuidList(config.departmentIds) || config.positionIds !== undefined && !uuidList(config.positionIds)) fail("成员选择范围无效");
    }
    if (["signature", "serial", "image", "attachment", "subtable", "formula", "summary", "relation", "lookup", "chineseAmount", "location", "region"].includes(field.type) && (field.defaultValue !== undefined || field.defaultSource !== undefined)) fail("此字段不能设置默认值");
    if (field.relationConfig !== undefined && field.type !== "relation") fail("仅关联字段可以设置关联配置");
    if (field.type === "relation") { const messages = fieldReferenceIssues(field,availableReferences); if (messages.length) fail(messages[0]); }
    if(field.queryConfig!==undefined && field.type!=="queryTable")fail("仅查询表可以设置查询表配置");
    if(field.type==="queryTable"){const messages=fieldReferenceIssues(field,availableReferences);if(messages.length)fail(messages[0]);}
    if (field.lookupConfig !== undefined && field.type !== "lookup") fail("仅查询字段可以设置查询配置");
    if (field.type === "lookup") { const messages = fieldReferenceIssues(field,availableReferences); if (messages.length) fail(messages[0]); }
    if (field.subtableConfig !== undefined && field.type !== "subtable") fail("仅子表字段可以设置子表配置");
    if (field.type === "subtable" && !child) {
      const config = field.subtableConfig;
      if (!config || !object(config, ["fields", "minRows", "maxRows", "validationRules"]) || !integer(config.minRows ?? 0, 0, 100) || !integer(config.maxRows ?? 50, 1, 100) || (config.minRows ?? 0) > (config.maxRows ?? 50)) fail("子表行数或配置无效");
      else { const messages = validateFieldConfigs(subtableSchema(field), true); if (Object.keys(messages).length) fail(Object.values(messages)[0]); }
      if ((field.required || (config?.minRows ?? 0) > 0) && (field.readOnly || field.hidden || field.visibility === "alwaysHidden" || field.visibility === "createHidden")) fail("只读或静态隐藏的子表不能要求最少行数或必填");
    }
    if (field.formulaConfig !== undefined && field.type !== "formula") fail("仅公式字段可以设置公式");
    if (field.type === "formula") {
      const messages=validateFormula(field.formulaConfig,schema.fields);if(messages.length)fail(messages[0]);
    }
    if (field.summaryConfig !== undefined && field.type !== "summary") fail("仅汇总字段可以设置汇总");
    if (field.type === "summary") { const messages = validateSummary(field.summaryConfig, schema.fields); if (messages.length) fail(messages[0]); }
    if (computedField(field) && (field.format !== undefined || field.unique !== undefined)) fail("计算字段不支持输入格式或唯一值");
    for (const key of ["visibleWhen", "requiredWhen"] as const) if (field[key] !== undefined) {
      if (isDecoration(field)) fail("标题和分隔线不能设置条件显示或必填");
      else { const messages = validateRule(field[key], schema.fields); if (messages.length) fail(`${key === "visibleWhen" ? "显示条件" : "必填条件"}：${messages[0]}`); }
    }
    if (field.warningRules !== undefined) {
      if (isDecoration(field) || !Array.isArray(field.warningRules) || field.warningRules.length > 3) fail("字段提示最多 3 项，且不能用于装饰字段");
      else {
        const warningIds = new Set<string>();
        for (const warning of field.warningRules) {
          if (!object(warning, ["id", "condition", "message", "color"]) || !safeRuleId(warning.id) || warningIds.has(warning.id) || !ruleMessage(warning.message) || !["amber", "red", "blue"].includes(warning.color)) { fail("字段提示配置无效或标识重复"); continue; }
          warningIds.add(warning.id);
          const messages = validateRule(warning.condition, schema.fields); if (messages.length) fail(`提示条件：${messages[0]}`);
        }
      }
    }
  }
  for (const id of visibilityOrder(schema.fields).cycles) errors[id] ??= `${schema.fields.find((field) => field.id === id)?.label ?? id}：显示或计算依赖不能引用自身或形成循环`;
  if (schema.validationRules !== undefined) {
    if (!Array.isArray(schema.validationRules) || schema.validationRules.length > 20) errors._form ??= "提交校验最多 20 项";
    else {
      const ruleIds = new Set<string>();
      for (const validation of schema.validationRules) {
        if (!object(validation, ["id", "condition", "message", "fieldId", "when"]) || !safeRuleId(validation.id) || ruleIds.has(validation.id) || !ruleMessage(validation.message) || validation.fieldId !== undefined && !schema.fields.some((field) => field.id === validation.fieldId && !isDecoration(field))) { errors._form ??= "提交校验配置无效或标识重复"; continue; }
        ruleIds.add(validation.id);
        const messages = [...validateRule(validation.condition, schema.fields), ...(validation.when !== undefined ? validateRule(validation.when, schema.fields) : [])];
        if (messages.length) errors._form ??= `提交校验：${messages[0]}`;
      }
    }
  }
  return errors;
}
const safeRuleId = (id: unknown) => typeof id === "string" && /^[a-z][a-zA-Z0-9]{0,63}$/.test(id) && !["constructor", "prototype", "__proto__"].includes(id);
const ruleMessage = (message: unknown) => typeof message === "string" && !!message.trim() && [...message].length <= 200;
function visibilityOrder(fields: LowcodeField[]): { order: LowcodeField[]; cycles: Set<string> } {
  const lookup = new Map(fields.map((field) => [field.id, field])), visited = new Set<string>(), active: string[] = [], cycles = new Set<string>(), order: LowcodeField[] = [];
  const visit = (field: LowcodeField) => {
    const index = active.indexOf(field.id);
    if (index >= 0) { active.slice(index).forEach((id) => cycles.add(id)); return; }
    if (visited.has(field.id)) return;
    active.push(field.id);
    for (const id of new Set([...(field.visibleWhen ? ruleDependencies(field.visibleWhen) : []), ...calculationDependencies(field), ...defaultDependencies(field)])) { const dependency = lookup.get(id); if (dependency) visit(dependency); }
    active.pop(); visited.add(field.id); order.push(field);
  };
  fields.forEach(visit); return { order, cycles };
}
/** Restore protected snapshots before evaluating downstream conditions; never mutate the source data. */
export function resolveFieldRules(schema: TableSchema, data: Record<string, unknown>, context: ValueContext = {}) {
  const values = { ...data }, visible: Record<string, boolean> = {}, required: Record<string, boolean> = {}, warnings: Record<string, WarningRule[]> = {}, errors: Record<string, string> = {};
  const defaults = initialValues(schema, undefined, undefined, !context.existing && (context.mode ?? "create") === "create"), existing = context.existing;
  const restore = (field: LowcodeField) => {
    const source = existing ?? defaults;
    if (!existing && (field.defaultConfig || field.defaultSource && field.defaultSource !== "custom") && Object.hasOwn(data, field.id)) values[field.id] = data[field.id];
    else if (Object.hasOwn(source, field.id)) {
      const snapshot = source[field.id];
      if (field.type === "subtable" && Array.isArray(snapshot)) {
        const childIds = new Set(field.subtableConfig?.fields.map((child) => child.id));
        values[field.id] = snapshot.map((row) => row && typeof row === "object" && row.values && typeof row.values === "object" ? { ...row, values: Object.fromEntries(Object.entries(row.values).filter(([key]) => childIds.has(key))) } : row);
      } else values[field.id] = Array.isArray(snapshot) ? [...snapshot] : snapshot;
    }
    else delete values[field.id];
  };
  for (const field of schema.fields) if (!isDecoration(field) && field.type !== "serial" && !computedField(field) && (field.readOnly || field.hidden || field.visibility === "alwaysHidden" || field.visibility === "createHidden" && (context.mode ?? "create") === "create")) restore(field);
  for (const field of visibilityOrder(schema.fields).order) {
    visible[field.id] = !field.visibleWhen || ruleMatches(field.visibleWhen, values, schema.fields);
    if (!visible[field.id] && !computedField(field)) restore(field);
    if (field.type === "subtable" && field.subtableConfig && Array.isArray(values[field.id])) {
      const childSchema = subtableSchema(field), originalRows = Array.isArray(existing?.[field.id]) ? existing[field.id] as SubtableRow[] : [];
      values[field.id] = (values[field.id] as unknown[]).map((row) => {
        if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string" || !("values" in row) || !row.values || typeof row.values !== "object" || Array.isArray(row.values)) return row;
        const rowId = row.id;
        const original = originalRows.find((entry) => typeof entry.id === "string" && entry.id.toLowerCase() === rowId.toLowerCase());
        const prepared = resolveFieldRules(childSchema, original ? row.values as Record<string, unknown> : { ...initialValues(childSchema, undefined, undefined, !context.existing && (context.mode ?? "create") === "create"), ...row.values }, { mode: context.mode, existing: original?.values, lookupResolver: context.lookupResolver });
        for (const [key, message] of Object.entries(prepared.errors)) errors[`${field.id}.${row.id}.${key}`] = message;
        return { ...row, values: prepared.values };
      });
    }
    if (computedField(field)) {
      try {
        const fields=mergeReferenceFields(schema.fields,context.referenceFields),referenceValues=mergeReferenceValues(schema.fields,values,context.referenceFields,context.referenceValues);
        if(field.type==="lookup"){const issues=fieldReferenceIssues(field,fields);if(issues.length)throw new Error(`关联配置或依赖字段不可用：${issues[0]}`);}
        const result = field.type === "lookup" ? referenceLookupQuery(field, referenceValues, fields) ? normalizeLookupValue(field, context.lookupResolver ? context.lookupResolver(field, referenceValues, fields) : values[field.id]) : undefined : evaluateCalculation(field, values);
        if (result === undefined) delete values[field.id]; else values[field.id] = result;
      }
      catch (error) { delete values[field.id]; errors[field.id] = error instanceof Error ? error.message : "计算失败"; }
    }
  }
  for (const field of schema.fields) {
    required[field.id] = visible[field.id] && (!!field.required || !!field.requiredWhen && ruleMatches(field.requiredWhen, values, schema.fields));
    warnings[field.id] = (Array.isArray(field.warningRules) ? field.warningRules : []).filter((warning) => warning && ruleMatches(warning.condition, values, schema.fields));
  }
  return { values, visible, required, warnings, errors };
}
export function dataJsonSchema(schema: TableSchema, complete = true): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const field of schema.fields) {
    if (isDecoration(field)) continue;
    const mandatory = complete && !!field.required && field.type !== "serial" && !field.visibleWhen && !field.requiredWhen;
    const numeric = numericField(field) && !isIdentifier(field);
    const array = ["multiselect", "members", "departments", "positions", "image", "attachment", "relation"].includes(field.type);
    const property: Record<string, unknown> = {
      title: field.label, type: numeric ? "number" : array ? "array" : field.type === "checkbox" ? "boolean" : "string",
    };
    if (field.type === "region") {
      Object.assign(property, regionJsonSchema);
    } else if (field.type === "location") {
      Object.assign(property, { type: "object", required: ["latitude", "longitude"], additionalProperties: false, properties: { latitude: { type: "number", minimum: -90, maximum: 90 }, longitude: { type: "number", minimum: -180, maximum: 180 }, address: { type: "string", maxLength: 500 } } });
    } else if (field.type === "subtable") {
      property.type = "array"; property.maxItems = field.subtableConfig?.maxRows ?? 50;
      if (complete && !field.visibleWhen) property.minItems = Math.max(field.subtableConfig?.minRows ?? 0, mandatory ? 1 : 0);
      const nested = dataJsonSchema(subtableSchema(field), false); delete nested.$schema;
      property.items = { type: "object", properties: { id: { type: "string", pattern: uuidPattern }, values: nested }, required: ["id", "values"], additionalProperties: false };
    } else if (field.type === "signature") {
      Object.assign(property, signatureJsonSchema);
    } else if (numeric) {
      if (field.format === "integer") property.type = "integer";
      if (field.minimum !== undefined) property.minimum = field.minimum;
      if (field.maximum !== undefined) property.maximum = field.maximum;
      if (field.type === "progress") { property.minimum ??= 0; property.maximum ??= 100; }
      if (field.type === "rating") { property.type = "integer"; property.minimum = mandatory ? 1 : 0; property.maximum = field.ratingMax ?? 5; }
    } else if (array) {
      property.items = field.type !== "multiselect" ? { type: "string", pattern: uuidPattern } : { type: "string", enum: field.options ?? [] };
      property.uniqueItems = true; property.maxItems = field.type === "relation" ? relationLimit(field) : ["image", "attachment"].includes(field.type) ? field.fileConfig?.maxFiles ?? 10 : 100;
      if (mandatory) property.minItems = 1;
    } else if (field.type !== "checkbox") {
      property.maxLength = field.maxLength ?? (field.type === "formula" && formulaResultType(field)==="text" ? 10000 : field.type === "lookup" ? 20000 : field.type === "datetime" ? 64 : ["text", "textarea", "richtext", "email", "phone", "url"].includes(field.type) ? textLimit(field.type) : 128);
      if (mandatory) { property.minLength = 1; property.pattern = "\\S"; }
      if (field.type === "select") property.enum = field.options ?? [];
      if (["member", "department", "position"].includes(field.type)) property.pattern = uuidPattern;
      if (field.type === "time") { property.pattern = field.timePrecision === "second" ? "^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$" : "^(?:[01][0-9]|2[0-3]):[0-5][0-9]$"; property.maxLength = field.timePrecision === "second" ? 8 : 5; }
      if (field.type === "date" || field.type==="formula"&&formulaResultType(field)==="date") property.format = "date";
      if (field.type === "datetime") { property.format = "date-time"; property.pattern = datetimePattern; }
      if (field.type === "email") { property.format = "email"; property.pattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"; }
      if (field.type === "phone") property.pattern = "^\\+?[0-9][0-9 ()-]{2,39}$";
      if (field.type === "url") { property.format = "uri"; property.pattern = "^https?://"; }
      if (field.format && formatPatterns[field.format]) property.pattern = formatPatterns[field.format];
      if (field.type === "idCard") { property.pattern = formatPatterns.idCard; property.maxLength = 18; }
    }
    choiceJsonSchema(field,property);
    const presetPattern = advancedPattern(field); if (presetPattern) property.pattern = presetPattern;
    if (mandatory) required.push(field.id);
    properties[field.id] = property;
  }
  return { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties, required, additionalProperties: false };
}
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = new WeakMap<TableSchema, Map<boolean, ReturnType<typeof ajv.compile>>>();
export function validateValues(schema: TableSchema, data: Record<string, unknown>, complete = true, context: ValueContext = {}): Record<string, string> {
  const errors: Record<string, string> = {};
  const configErrors = validateFieldConfigs(schema,false,context.referenceFields);
  if (Object.keys(configErrors).length) return { _form: Object.values(configErrors)[0] };
  const resolved = resolveFieldRules(schema, data, context);
  data = defaultValidationValues(schema, resolved.values);
  Object.assign(errors, resolved.errors);
  for (const field of schema.fields) if (field.type === "serial") {
    const error = serialTemplateError(field.codeTemplate ?? defaultSerialTemplate);
    if (error) errors._form = `${field.label}：${error}`;
  }
  let variants = validators.get(schema);
  if (!variants) { variants = new Map(); validators.set(schema, variants); }
  let validator = variants.get(complete);
  try {
    if (!validator) { validator = ajv.compile(dataJsonSchema(schema, complete)); variants.set(complete, validator); }
  } catch { return { _form: "表单配置无效，请修正字段范围和选项后重试" }; }
  if (!validator(data)) for (const error of validator.errors ?? []) {
    const id = String(error.params.missingProperty ?? error.params.additionalProperty ?? error.instancePath.split("/")[1] ?? "_form");
    const field = schema.fields.find((entry) => entry.id === id);
    errors[id] ??= error.keyword === "required" || error.keyword === "minLength" || error.keyword === "minItems"
      ? `请填写${field?.label ?? "必填项"}`
      : error.keyword === "minimum" || error.keyword === "maximum" ? "超出允许范围"
        : error.keyword === "maxLength" ? `最多 ${field?.maxLength ?? (field ? textLimit(field.type) : "指定")} 个字符`
          : error.keyword === "additionalProperties" ? "包含当前表单版本之外的字段"
            : error.keyword === "uniqueItems" ? "不能重复选择同一项"
              : error.keyword === "enum" ? "请选择有效选项" : `请填写有效的${field?.label ?? "内容"}`;
  }
  for (const field of schema.fields) {
    const value = data[field.id];
    const choiceIssue = choiceValueError(field,value); if(choiceIssue) errors[field.id] = choiceIssue;
    const advancedIssue = advancedValueError(field,value) ?? advancedRowsError(field,value,context.existing?.[field.id]); if (advancedIssue) errors[field.id] ??= advancedIssue;
    if (complete && resolved.required[field.id] && field.type !== "serial" && (ruleEmpty(value) || field.type === "rating" && value === 0)) errors[field.id] ??= `请填写${field.label}`;
    if (field.type === "subtable") {
      if (complete && resolved.visible[field.id] && (Array.isArray(value) ? value.length : 0) < (field.subtableConfig?.minRows ?? 0)) errors[field.id] ??= `至少填写 ${field.subtableConfig?.minRows} 行`;
      if (Array.isArray(value)) {
        const rowIds = new Set<string>(), originalRows = Array.isArray(context.existing?.[field.id]) ? context.existing[field.id] as SubtableRow[] : [];
        for (const [index, row] of value.entries()) {
          if (!row || typeof row.id !== "string" || !row.values || typeof row.values !== "object" || Array.isArray(row.values)) continue;
          if (rowIds.has(row.id.toLowerCase())) errors[field.id] ??= "子表行标识不能重复";
          rowIds.add(row.id.toLowerCase());
          const original = originalRows.find((entry) => typeof entry.id === "string" && entry.id.toLowerCase() === row.id.toLowerCase());
          const childErrors = validateValues(subtableSchema(field), row.values, complete && resolved.visible[field.id], { mode: context.mode, existing: original?.values, lookupResolver: context.lookupResolver });
          for (const [key, message] of Object.entries(childErrors)) { errors[`${field.id}.${row.id}.${key}`] = message; errors[field.id] ??= `第 ${index + 1} 行：${message}`; }
        }
      }
      continue;
    }
    if (complete && resolved.required[field.id] && field.type === "richtext" && !richTextLabel(String(value ?? ""))) errors[field.id] ??= `请填写${field.label}`;
    if (value === undefined || errors[field.id]) continue;
    if (field.type === "location" && !validLocation(value, field.locationConfig?.bounds)) errors[field.id] = "请填写有效且在允许范围内的经纬度";
    if (field.type === "region") { const issue = regionError(field, value, complete && resolved.visible[field.id]); if (issue) errors[field.id] = issue; }
    if (field.type === "signature" && !validSignature(value)) errors[field.id] = "请手写有效签名，不能保存空白或过长笔迹";
    if (field.format === "currency" && typeof value === "number" && decimalPlaces(value) > 2) errors[field.id] = "金额最多保留两位小数";
    if (typeof value === "number" && field.numericConfig?.decimalPlaces !== undefined && decimalPlaces(value) > field.numericConfig.decimalPlaces) errors[field.id] = `最多保留 ${field.numericConfig.decimalPlaces} 位小数`;
    if ((field.type === "idCard" || field.format === "idCard") && typeof value === "string" && !validIdCard(value)) errors[field.id] = "身份证号码的出生日期或校验位不正确";
    if ((field.type === "date" || field.type === "datetime") && typeof value === "string") {
      const current = Date.parse(value);
      if (field.minimum !== undefined && current < Date.parse(String(field.minimum)) || field.maximum !== undefined && current > Date.parse(String(field.maximum))) errors[field.id] = "超出允许日期范围";
    }
    if (["members", "departments", "positions", "image", "attachment", "relation"].includes(field.type) && Array.isArray(value) && new Set(value.map((id) => String(id).toLowerCase())).size !== value.length) errors[field.id] = "不能重复选择同一项";
    if (field.type === "url" && typeof value === "string") {
      try { const url = new URL(value); if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname) errors[field.id] = "请输入有效的 http 或 https 地址"; }
      catch { errors[field.id] = "请输入有效的 http 或 https 地址"; }
    }
  }
  if (schema.fields.reduce((total, field) => total + (field.type === "subtable" && Array.isArray(data[field.id]) ? (data[field.id] as unknown[]).length : 0), 0) > 200) errors._form ??= "全部子表合计最多 200 行";
  if (relationCount(schema, data) > 200) errors._form ??= "全部关联记录合计最多 200 条";
  if (complete) for (const rule of schema.validationRules ?? []) {
    if ((!rule.when || ruleMatches(rule.when, data, schema.fields)) && !ruleMatches(rule.condition, data, schema.fields)) errors[rule.fieldId ?? "_form"] ??= rule.message;
  }
  for (const [id, message] of Object.entries(errors)) {
    const field = schema.fields.find((field) => field.id === id);
    if (field && (!resolved.visible[id] || !isFieldVisible(field, context.mode ?? "create"))) errors._form ??= `${field.label}：${message}`;
  }
  return errors;
}
export function validIdCard(value: string): boolean {
  if (!new RegExp(formatPatterns.idCard).test(value)) return false;
  const birthday = `${value.slice(6, 10)}-${value.slice(10, 12)}-${value.slice(12, 14)}`;
  const date = new Date(`${birthday}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  return "10X98765432"[weights.reduce((sum, weight, index) => sum + Number(value[index]) * weight, 0) % 11] === value[17].toUpperCase();
}

function decimalPlaces(value: number): number {
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
}

/** Upgrade only editable schemas; immutable versions and data retain their field IDs. */
export function upgradeIdentityFields(schema: TableSchema): TableSchema {
  return { ...schema, fields: schema.fields.map((field) => {
    if (field.type !== "number" || field.format !== "idCard") return field;
    const { format: _format, ...rest } = field;
    return { ...rest, type: "idCard" };
  }) };
}
