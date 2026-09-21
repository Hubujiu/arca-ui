import type { DefaultUser, LowcodeField, TableSchema } from "./field-model";
import type { Directory } from "@/organization/model";
import { contains } from "@/organization/model";
import { evaluateCalculation, expressionDependencies, numericField, scalarFieldType, formulaResultType, validateFormula, type FormulaConfig } from "./calculations";
import { lookupKey, lookupQuery, lookupTextSource, normalizeLookupValue, numericLookup, validateLookup, type LookupConfig, type LookupQuery, type LookupResolver } from "./relations";

export type DefaultConfig =
  | { source: "FIELD"; fieldId: string }
  | { source: "FORMULA"; formulaConfig: FormulaConfig }
  | { source: "LOOKUP"; lookupConfig: LookupConfig }
  | { source: "DEPARTMENT_MEMBERS" | "DEPARTMENT_LEADER"; departmentFieldId: string }
  | { source: "POSITION_MEMBERS"; positionFieldId: string }
  | { source: "INITIATOR_DEPARTMENT" };
export type DefaultContext = { user?: DefaultUser; directory?: Directory; lookupResolver?: LookupResolver };
const supported = new Set("text textarea number progress rating date datetime time select multiselect checkbox member members department departments position positions email phone url idCard".split(" "));
export const supportsFieldDefault = (field: LowcodeField) => supported.has(field.type);
export function compatibleDefault(target: LowcodeField, source: LowcodeField) {
  if (!supportsFieldDefault(target)) return false;
  if (numericField(target)) return numericField(source);
  if (["text", "textarea"].includes(target.type)) return lookupTextSource(source) || source.type === "lookup" && !numericLookup(source);
  if(target.type==="date")return scalarFieldType(source)==="date";
  return target.type === source.type && target.format === source.format;
}
const object = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
export function defaultConfigIssues(field: LowcodeField, fields: LowcodeField[]): string[] {
  if (field.defaultConfig === undefined) return [];
  if (!supportsFieldDefault(field)) return ["此字段不支持联动默认值"];
  if (field.defaultValue !== undefined || field.defaultSource !== undefined) return ["联动默认值不能同时设置其他默认来源"];
  const config: unknown = field.defaultConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return ["默认值配置必须是对象"];
  const value = config as Record<string, unknown>;
  let errors: string[] = [];
  switch (value.source) {
    case "FIELD": if (!object(value, ["source", "fieldId"]) || !fields.some(source => source.id === value.fieldId && source.id !== field.id && compatibleDefault(field, source))) errors = ["默认值只能引用同层兼容字段"]; break;
    case "FORMULA": { const expected=numericField(field)?"number":["text","textarea"].includes(field.type)?"text":field.type==="date"?"date":undefined; errors=!object(value,["source","formulaConfig"])||!expected||formulaResultType({formulaConfig:value.formulaConfig as FormulaConfig})!==expected?["公式默认值结果类型与目标字段不匹配"]:validateFormula(value.formulaConfig,fields);break;}
    case "LOOKUP": errors = !object(value, ["source", "lookupConfig"]) ? ["查询默认值配置无效"] : validateLookup(value.lookupConfig, fields); if (!errors.length && ((value.lookupConfig as LookupConfig).resultType === "number" ? !numericField(field) : !["text", "textarea"].includes(field.type))) errors = ["查询默认值的结果类型与字段不匹配"]; break;
    case "DEPARTMENT_MEMBERS": case "DEPARTMENT_LEADER": if (!object(value, ["source", "departmentFieldId"]) || !["member", "members"].includes(field.type) || !fields.some(source => source.id === value.departmentFieldId && ["department", "departments"].includes(source.type))) errors = ["部门联动需要成员字段和同层部门来源"]; break;
    case "INITIATOR_DEPARTMENT": if (!object(value, ["source"]) || !["department", "departments"].includes(field.type)) errors = ["发起人部门默认值需要部门字段"]; break;
    case "POSITION_MEMBERS": if (!object(value, ["source", "positionFieldId"]) || !["member", "members"].includes(field.type) || !fields.some(source => source.id === value.positionFieldId && ["position", "positions"].includes(source.type))) errors = ["岗位联动需要成员字段和同层岗位来源"]; break;
    default: errors = ["默认值来源无效"];
  }
  if (!errors.length && defaultDependencies(field).has(field.id)) errors.push("默认值不能引用自身");
  return errors;
}
export function defaultDependencies(field: LowcodeField): Set<string> {
  const config = field.defaultConfig;
  if (!config) return new Set();
  if (config.source === "FIELD") return new Set([config.fieldId]);
  if (config.source === "FORMULA") return expressionDependencies(config.formulaConfig?.expression);
  if (config.source === "LOOKUP") return new Set([config.lookupConfig?.relationFieldId]);
  if (config.source === "DEPARTMENT_MEMBERS" || config.source === "DEPARTMENT_LEADER") return new Set([config.departmentFieldId]);
  if (config.source === "POSITION_MEMBERS") return new Set([config.positionFieldId]);
  return new Set();
}
export function defaultLookupField(field: LowcodeField): LowcodeField {
  return { ...field, type: "lookup", lookupConfig: field.defaultConfig?.source === "LOOKUP" ? field.defaultConfig.lookupConfig : undefined };
}
export function collectDefaultLookupQueries(schema: TableSchema, values: Record<string, unknown>): Map<string, LookupQuery> {
  const queries = new Map<string, LookupQuery>();
  for (const field of schema.fields) {
    if (field.defaultConfig?.source === "LOOKUP" && !Object.hasOwn(values, field.id)) {
      const query = lookupQuery(defaultLookupField(field), values, schema.fields); if (query) queries.set(lookupKey(query), query);
    }
    if (field.type === "subtable" && field.subtableConfig && Array.isArray(values[field.id])) for (const row of values[field.id] as { values?: Record<string, unknown> }[]) {
      if (row?.values) for (const [key, query] of collectDefaultLookupQueries({ name: "", description: "", fields: field.subtableConfig.fields }, row.values)) queries.set(key, query);
    }
  }
  return queries;
}
function selection(field: LowcodeField, ids: string[]) { return ["members", "departments"].includes(field.type) ? ids : ids.length === 1 ? ids[0] : null; }
export function initialFieldDefault(field: LowcodeField, values: Record<string, unknown>, fields: LowcodeField[], context: DefaultContext = {}): unknown {
  const config = field.defaultConfig;
  if (!config) return undefined;
  const issue = defaultConfigIssues(field, fields)[0]; if (issue) throw new Error(issue);
  if (config.source === "FIELD") return Object.hasOwn(values, config.fieldId) ? structuredClone(values[config.fieldId] ?? null) : undefined;
  if (config.source === "FORMULA") return evaluateCalculation({ ...field, type: "formula", formulaConfig: config.formulaConfig }, values);
  if (config.source === "LOOKUP") {
    const synthetic = defaultLookupField(field);
    if (!context.lookupResolver || !lookupQuery(synthetic, values, fields)) return undefined;
    const value = context.lookupResolver(synthetic, values, fields);
    return value === undefined ? undefined : normalizeLookupValue(synthetic, value) ?? null;
  }
  const directory = context.directory;
  if (!directory) return undefined;
  if (config.source === "INITIATOR_DEPARTMENT") {
    if (!context.user) return undefined;
    let id = directory.people.find(person => person.id === context.user?.id)?.orgUnitId;
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id); const unit = directory.units.find(unit => unit.id === id);
      if (unit?.kind === "DEPARTMENT") return selection(field, [unit.id]);
      id = unit?.parentId;
    }
    return selection(field, []);
  }
  if (config.source === "POSITION_MEMBERS") {
    const raw=values[config.positionFieldId];if(raw===undefined)return undefined;
    const ids=Array.isArray(raw)?raw:raw?[raw]:[];
    if(ids.length>20||ids.some(id=>typeof id!=="string"||!directory.positions.some(position=>position.id===id)))throw new Error("岗位联动需要最多二十个有效岗位");
    const people=directory.people.filter(person=>person.enabled&&person.loginBound===true&&ids.includes(person.positionId)).map(person=>person.id).sort();
    if(people.length>20)throw new Error("岗位联动默认成员最多二十人，请缩小范围或手动选择");
    if(field.type==="member"&&people.length>1)throw new Error("岗位默认值找到多位成员，请改用多成员字段或缩小岗位范围");
    return selection(field,people);
  }
  const raw = values[config.departmentFieldId];
  if (raw === undefined) return undefined;
  const ids = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (ids.length > 20 || ids.some(id => typeof id !== "string" || !directory.units.some(unit => unit.id === id && unit.kind === "DEPARTMENT"))) throw new Error("部门联动需要最多二十个有效部门");
  const people = directory.people.filter(person => person.enabled && person.loginBound === true && ids.some(id => contains(directory.units, String(id), person.orgUnitId) && (config.source === "DEPARTMENT_MEMBERS" || directory.units.find(unit => unit.id === id)?.leaderId === person.id))).map(person => person.id).sort();
  if (people.length > 20) throw new Error("部门联动默认成员最多二十人，请缩小范围或手动选择");
  return selection(field, people);
}

/** Call only for a new form scope. Presence, including null, makes a value immutable to defaults. */
export function initializeFieldDefaults(schema: TableSchema, input: Record<string, unknown>, context: DefaultContext = {}) {
  const values = { ...input }, errors: Record<string, string> = {}, visited = new Set<string>(), active = new Set<string>();
  const visit = (field: LowcodeField) => {
    if (visited.has(field.id)) return;
    if (active.has(field.id)) { errors[field.id] = "默认值依赖不能形成循环"; return; }
    active.add(field.id);
    for (const id of defaultDependencies(field)) { const source = schema.fields.find(source => source.id === id); if (source) visit(source); }
    active.delete(field.id); visited.add(field.id);
    if (!field.defaultConfig || Object.hasOwn(input, field.id) || errors[field.id]) return;
    try { const value = initialFieldDefault(field, values, schema.fields, context); if (value !== undefined) values[field.id] = value; }
    catch (error) { errors[field.id] = error instanceof Error ? error.message : "默认值初始化失败"; }
  };
  schema.fields.forEach(visit);
  return { values, errors };
}

/** Clear markers remain in the request, but ordinary type validators see an absent optional field. */
export function defaultValidationValues(schema: TableSchema, input: Record<string, unknown>): Record<string, unknown> {
  const values = { ...input };
  for (const field of schema.fields) {
    if (field.defaultConfig && (values[field.id] === null || values[field.id] === "")) delete values[field.id];
    if (field.type === "subtable" && field.subtableConfig && Array.isArray(values[field.id])) values[field.id] = (values[field.id] as unknown[]).map(row => {
      if (!row || typeof row !== "object" || !("values" in row) || !row.values || typeof row.values !== "object" || Array.isArray(row.values)) return row;
      return { ...row, values: defaultValidationValues({ name: "", description: "", fields: field.subtableConfig!.fields }, row.values as Record<string, unknown>) };
    });
  }
  return values;
}
