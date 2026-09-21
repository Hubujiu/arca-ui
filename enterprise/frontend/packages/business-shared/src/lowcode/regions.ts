import catalog from "./assets/cn-2023.json";
import type { LowcodeField } from "./field-model";
export type RegionNode = { code: string; name: string; children?: RegionNode[] };
export type RegionConfig = { version?: "cn-2023"; depth?: 1 | 2 | 3; provinceCodes?: string[]; address?: boolean; requireAddress?: boolean };
export type RegionValue = { version: "cn-2023"; codes: string[]; names: string[]; address?: string };
export const regions: RegionNode[] = catalog;
export const regionVersion = "cn-2023" as const;
export function regionConfigError(field: LowcodeField): string | undefined {
  const c = field.regionConfig;
  if (field.type !== "region") return c ? "仅地区字段可设置地区范围" : undefined;
  if (!c) return;
  if (Object.keys(c).some((key) => !["version","depth","provinceCodes","address","requireAddress"].includes(key)) || c.version !== undefined && c.version !== regionVersion || ![1,2,3].includes(c.depth ?? 3)) return "地区数据版本或层级无效";
  if (c.provinceCodes && (!Array.isArray(c.provinceCodes) || new Set(c.provinceCodes).size !== c.provinceCodes.length || c.provinceCodes.some((code) => !regions.some((node) => node.code === code)))) return "地区省份范围无效";
  if (c.requireAddress && !c.address) return "必填详细地址需先开启详细地址";
  for (const flag of ["address","requireAddress"] as const) if (c[flag] !== undefined && typeof c[flag] !== "boolean") return "地区详细地址设置无效";
}
export function regionError(field: LowcodeField, raw: unknown, complete = true): string | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "请选择有效地区";
  const value = raw as RegionValue, c = field.regionConfig ?? {};
  if (Object.keys(raw).some((key) => !["version","codes","names","address"].includes(key)) || value.version !== regionVersion || !Array.isArray(value.codes) || !value.codes.length || value.codes.length > (c.depth ?? 3) || !Array.isArray(value.names)) return "地区值或数据版本无效";
  if (c.provinceCodes?.length && !c.provinceCodes.includes(value.codes[0])) return "所选地区不在允许范围内";
  let nodes = regions; const names: string[] = [];
  for (const code of value.codes) { const node = nodes.find((node) => node.code === code); if (!node) return "地区代码或上下级关系无效"; names.push(node.name); nodes = node.children ?? []; }
  if (JSON.stringify(value.names) !== JSON.stringify(names)) return "地区名称与代码不一致";
  if (complete && value.codes.length < (c.depth ?? 3) && nodes.length) return "请选择完整的省市区层级";
  if (value.address !== undefined && (typeof value.address !== "string" || [...value.address].length > 500 || !c.address && !!value.address)) return "地区详细地址无效";
  if (complete && c.requireAddress && !value.address?.trim()) return "请填写地区详细地址";
}
export const regionJsonSchema = { type: "object", required: ["version","codes","names"], additionalProperties: false, properties: { version: {const:regionVersion},codes:{type:"array",minItems:1,maxItems:3,items:{type:"string",pattern:"^[0-9]{2}(?:[0-9]{2}){0,2}$"}}, names:{type:"array",minItems:1,maxItems:3,items:{type:"string",maxLength:80}},address:{type:"string",maxLength:500} } };
