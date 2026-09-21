import {formulaResultType} from "./calculations";
import { validateRelationFilter, type RelationFilter } from "./relation-filters";
import type { LowcodeField, TableSchema } from "./field-model";
import { decimal, decimalNumber, decimalRound } from "./decimal";
import { ruleMatches, validateRule, type Rule } from "./rules";

export type RelationTarget = {id:string;name:string;when:Rule;tableId:string;titleFieldId?:string;filter?:RelationFilter;cascade?:{parentFieldId:string;leafOnly?:boolean;maxDepth?:number}};
export type RelationConfig = { tableId: string; titleFieldId?: string; multiple?: boolean; maxRecords?: number; allowCreate?: boolean; filter?: RelationFilter; cascade?: {parentFieldId:string;leafOnly?:boolean;maxDepth?:number}; targets?:RelationTarget[] };
export type Aggregate = "SUM" | "COUNT" | "MIN" | "MAX" | "AVG";
export type LookupConfig = { relationFieldId: string; targetFieldId?: string; resultType: "text" | "number"; aggregate?:Aggregate };
export type QueryConfig = {tableId:string;columnIds:string[];filter?:RelationFilter;relationFieldId?:string;backReferenceFieldId?:string;pageSize?:number;allowEdit?:boolean};
export type RelationTable = { id: string; appId: string; appName: string; name: string; fields: LowcodeField[]; canCreate?: boolean };
export type RelationItem = { id: string; label: string; hasChildren?:boolean; selectable?:boolean; values?:Record<string,string|number>;canUpdate?:boolean;revision?:number };
export type RelationPage = { items: RelationItem[]; offset: number; nextOffset?:number; hasMore: boolean };
export type LookupQuery = { tableId: string; recordId?: string; recordIds?:string[]; fieldId?: string; resultType: "text" | "number"; aggregate?:Aggregate };
export type LookupResolver = (field: LowcodeField, values: Record<string, unknown>, fields: LowcodeField[]) => unknown;
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const fieldId = (value: unknown) => typeof value === "string" && /^[a-z][a-zA-Z0-9]{0,63}$/.test(value) && !["constructor", "prototype", "__proto__"].includes(value);
const object = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key));
export const numericLookup = (field: Pick<LowcodeField, "type" | "lookupConfig">) => field.type === "lookup" && field.lookupConfig?.resultType === "number";
export const relationLimit = (field: LowcodeField):number => Math.max(...relationTargets(field.relationConfig??{tableId:""}).map(config=>config.cascade?config.cascade.maxDepth??10:config.multiple?config.maxRecords??20:1));
export const lookupTextSource = (field: Pick<LowcodeField, "type" | "format" | "formulaConfig">) => field.type==="formula"&&["text","date"].includes(formulaResultType(field)) || ["text", "textarea", "email", "phone", "url", "select", "serial", "date", "time"].includes(field.type);
export const lookupNumberSource = (field: Pick<LowcodeField, "type" | "format" | "formulaConfig">) => (["number", "rating", "progress", "summary"].includes(field.type)||field.type==="formula"&&formulaResultType(field)==="number") && !["digits", "phone", "idCard"].includes(field.format ?? "");
export function validateRelation(config: unknown,fields?:LowcodeField[]): string[] {
  if (!object(config, ["tableId", "titleFieldId", "multiple", "maxRecords", "allowCreate", "filter", "cascade", "targets"]) || typeof config.tableId !== "string" || !uuid.test(config.tableId) || config.titleFieldId !== undefined && !fieldId(config.titleFieldId) || config.multiple !== undefined && typeof config.multiple !== "boolean" || config.allowCreate !== undefined && typeof config.allowCreate !== "boolean") return ["请选择有效关联表与标题字段"];
  if (config.maxRecords !== undefined && (!Number.isInteger(config.maxRecords) || Number(config.maxRecords) < 1 || Number(config.maxRecords) > (config.multiple ? 50 : 1))) return ["单选关联最多 1 条，多选最多 50 条"];
  if(config.filter!==undefined && validateRelationFilter(config.filter).length)return validateRelationFilter(config.filter);
  if(config.cascade!==undefined && (!object(config.cascade,["parentFieldId","leafOnly","maxDepth"]) || config.multiple || !fieldId(config.cascade.parentFieldId) || config.cascade.leafOnly!==undefined && typeof config.cascade.leafOnly!=="boolean" || !Number.isInteger(config.cascade.maxDepth??10) || Number(config.cascade.maxDepth??10)<1 || Number(config.cascade.maxDepth??10)>10))return ["级联需要有效父字段，最多十层且不能多选"];
  if(config.targets!==undefined){
    if(!Array.isArray(config.targets)||config.targets.length>8)return["最多配置八个条件关联来源"];
    const ids=new Set<string>();for(const raw of config.targets){
      if(!object(raw,["id","name","when","tableId","titleFieldId","filter","cascade"])||!fieldId(raw.id)||String(raw.id).length>32||ids.has(String(raw.id))||typeof raw.name!=="string"||!raw.name.trim()||raw.name.length>80||!raw.when||typeof raw.when!=="object")return["条件来源需要唯一标识、名称及有效条件"];
      ids.add(String(raw.id));const {id,name,when,...target}=raw;const issues=validateRelation({...target,multiple:config.multiple,maxRecords:config.maxRecords});if(issues.length)return issues;
      if(fields){const errors=validateRule(when as Rule,relationRuleFields(fields));if(errors.length)return errors;if(target.filter!==undefined){const errors=validateRelationFilter(target.filter,fields);if(errors.length)return errors;}}
    }
  }
  return [];
}
export function relationRuleFields(fields:LowcodeField[]):LowcodeField[]{return fields.filter(field=>!["heading","divider","remark","displayImage","tabs","collapse","queryTable","relation","lookup","formula","summary","subtable","signature","image","attachment","location"].includes(field.type)&&field.defaultConfig?.source!=="LOOKUP");}
export function relationTargets(config:RelationConfig):RelationConfig[]{const {targets,...fallback}=config;return [fallback,...(targets??[]).map(({id,name,when,...target})=>({...target,multiple:config.multiple,maxRecords:config.maxRecords,allowCreate:config.allowCreate}))];}
export function resolveRelation(config:RelationConfig,values:Record<string,unknown>,fields:LowcodeField[]):RelationConfig {
  const index=config.targets?.findIndex(target=>ruleMatches(target.when,values,relationRuleFields(fields)))??-1;
  return relationTargets(config)[index+1];
}
export function validateLookup(config: unknown, fields: LowcodeField[]): string[] {
  if (!object(config, ["relationFieldId", "targetFieldId", "resultType", "aggregate"]) || !fieldId(config.relationFieldId) || (config.aggregate==="COUNT" ? config.targetFieldId!==undefined : !fieldId(config.targetFieldId)) || !["text", "number"].includes(String(config.resultType))) return ["查询配置需要同层关联、目标字段及结果类型"];
  const relation = fields.find((field) => field.id === config.relationFieldId && field.type === "relation");
  if (!relation || !config.aggregate && relation.relationConfig?.multiple) return ["查询字段只能使用同层单选关联"];
  if(config.aggregate!==undefined && (!["SUM","COUNT","MIN","MAX","AVG"].includes(String(config.aggregate)) || config.resultType!=="number"))return ["关联汇总需要数值结果和有效运算"];
  return [];
}
export function lookupQuery(field: LowcodeField, values: Record<string, unknown>, fields: LowcodeField[]): LookupQuery | undefined {
  const config=field.lookupConfig,relation=fields.find(entry=>entry.id===config?.relationFieldId&&entry.type==="relation");
  if(!config||!relation?.relationConfig||validateRelation(relation.relationConfig).length||validateLookup(config,fields).length)return undefined;
  const raw=values[relation.id];if(raw!==undefined&&!Array.isArray(raw))return undefined;
  let ids=Array.isArray(raw)?raw:[];if(ids.length>relationLimit(relation)||ids.some(id=>typeof id!=="string"||!uuid.test(id)))return undefined;
  const target=resolveRelation(relation.relationConfig,values,fields);
  if(target.cascade && ids.length)ids=ids.slice(-1);
  const tableId=target.tableId.toLowerCase();
  if(config.aggregate)return {tableId,recordIds:ids.map(id=>String(id).toLowerCase()),aggregate:config.aggregate,resultType:"number",...(config.targetFieldId?{fieldId:config.targetFieldId}:{})};
  if(ids.length!==1)return undefined;return {tableId,recordId:String(ids[0]).toLowerCase(),fieldId:config.targetFieldId,resultType:config.resultType};
}
export const lookupKey=(query:LookupQuery)=>JSON.stringify([query.tableId.toLowerCase(),query.recordId?.toLowerCase()??query.recordIds?.map(id=>id.toLowerCase()),query.fieldId,query.resultType,query.aggregate]);
export function validateQuery(config:unknown,fields:LowcodeField[]):string[] {
  if(!object(config,["tableId","columnIds","filter","relationFieldId","backReferenceFieldId","pageSize","allowEdit"])||typeof config.tableId!=="string"||!uuid.test(config.tableId)||!Array.isArray(config.columnIds)||!config.columnIds.length||config.columnIds.length>8||config.columnIds.some(id=>!fieldId(id))||new Set(config.columnIds).size!==config.columnIds.length||!Number.isInteger(config.pageSize??10)||Number(config.pageSize??10)<1||Number(config.pageSize??10)>20||config.allowEdit!==undefined&&typeof config.allowEdit!=="boolean")return ["查询表需要有效表、一至八列及每页一至二十条"];
  if(config.backReferenceFieldId!==undefined&&(!fieldId(config.backReferenceFieldId)||config.relationFieldId!==undefined))return ["反向查询需要目标关联字段，不能同时限定已选记录"];
  if(config.relationFieldId!==undefined&&!fields.some(field=>field.type==="relation"&&field.id===config.relationFieldId&&field.relationConfig&&relationTargets(field.relationConfig).some(target=>target.tableId.toLowerCase()===String(config.tableId).toLowerCase())))return ["查询表需要同层可指向目标表的关联字段"];
  return config.filter===undefined?[]:validateRelationFilter(config.filter,fields);
}
export function normalizeLookupValue(field: LowcodeField, value: unknown): string | number | undefined {
  if (value === undefined || value === null || typeof value === "string" && !value.trim()) return undefined;
  if (numericLookup(field)) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("查询来源需要有效数字");
    return decimalNumber(decimalRound(decimal(value), field.numericConfig?.decimalPlaces ?? 2));
  }
  if (typeof value !== "string" || [...value].length > 20000) throw new Error("查询文本最多 20000 个字符");
  return value;
}
export function collectLookupQueries(schema: TableSchema, values: Record<string, unknown>): Map<string, LookupQuery> {
  const queries = new Map<string, LookupQuery>();
  for (const field of schema.fields) {
    if (field.type === "lookup") { const query = lookupQuery(field, values, schema.fields); if (query) queries.set(lookupKey(query), query); }
    if (field.type === "subtable" && field.subtableConfig && Array.isArray(values[field.id])) for (const row of values[field.id] as { values?: unknown }[]) {
      if (row?.values && typeof row.values === "object" && !Array.isArray(row.values)) for (const [key, query] of collectLookupQueries({ name: "", description: "", fields: field.subtableConfig.fields }, row.values as Record<string, unknown>)) queries.set(key, query);
    }
  }
  return queries;
}
export function relationCount(schema: TableSchema, values: Record<string, unknown>): number {
  return schema.fields.reduce((total, field) => total + (field.type === "relation" && Array.isArray(values[field.id]) ? (values[field.id] as unknown[]).length : field.type === "subtable" && field.subtableConfig && Array.isArray(values[field.id]) ? (values[field.id] as { values?: unknown }[]).reduce((count, row) => count + (row?.values && typeof row.values === "object" && !Array.isArray(row.values) ? relationCount({ name: "", description: "", fields: field.subtableConfig!.fields }, row.values as Record<string, unknown>) : 0), 0) : 0), 0);
}
