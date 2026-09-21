import type { LowcodeField } from "./field-model";

export type OtherChoice = { other: string };
export type ChoiceConfig = { style?: "dropdown" | "horizontal" | "vertical" | "stages"; colors?: Record<string,string>; displayLabels?: Record<string,string>; allowOther?: boolean; otherLabel?: string; otherMaxLength?: number };
export const isOtherChoice = (value: unknown): value is OtherChoice => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 && typeof (value as OtherChoice).other === "string";
export const emptyOtherChoice = (value: unknown): boolean => isOtherChoice(value) ? !value.other.trim() : Array.isArray(value) && !!value.length && value.every(entry => isOtherChoice(entry) && !entry.other.trim());
export const validOtherChoice = (field: LowcodeField, value: unknown): value is OtherChoice => !!field.choiceConfig?.allowOther && isOtherChoice(value) && !!value.other.trim() && [...value.other].length <= (field.choiceConfig.otherMaxLength ?? 500);
export function choiceLabel(field: LowcodeField, value: unknown): string {
  if (Array.isArray(value)) return value.map(entry => choiceLabel(field,entry)).join("、");
  if (isOtherChoice(value)) return value.other;
  const key = String(value ?? "");
  const labels=field.choiceConfig?.displayLabels;
  return labels&&Object.hasOwn(labels,key)&&typeof labels[key]==="string"?labels[key]:key;
}
export function choiceConfigError(field: LowcodeField): string | undefined {
  const config = field.choiceConfig;
  if (config === undefined) return;
  if (!config || typeof config !== "object" || Array.isArray(config) || !["select","multiselect"].includes(field.type) || Object.keys(config).some(key => !["style","colors","displayLabels","allowOther","otherLabel","otherMaxLength"].includes(key))) return "选项配置包含未知属性或类型不匹配";
  const label = (value: unknown) => typeof value === "string" && !!value.trim() && value.trim() === value && [...value].length <= 128;
  if (config.displayLabels !== undefined && (!config.displayLabels || typeof config.displayLabels !== "object" || Array.isArray(config.displayLabels) || Object.entries(config.displayLabels).some(([key,value]) => !field.options?.includes(key) || !label(value)))) return "选项显示名称必须引用已有选项且为 1 至 128 个非空字符";
  if (config.allowOther !== undefined && typeof config.allowOther !== "boolean") return "其他选项开关需要布尔值";
  if (config.otherLabel !== undefined && !label(config.otherLabel)) return "其他选项名称需要 1 至 128 个非空字符";
  if (config.otherMaxLength !== undefined && (!Number.isInteger(config.otherMaxLength) || config.otherMaxLength < 1 || config.otherMaxLength > 500)) return "其他选项文本上限需要 1 至 500";
}
export function choiceValueError(field: LowcodeField,value: unknown): string | undefined {
  if (!["select","multiselect"].includes(field.type) || value === undefined || value === null || value === "") return;
  const known = (entry: unknown) => typeof entry === "string" && field.options?.includes(entry);
  const invalid = "请选择有效选项；其他文本不能为空或超长";
  if (field.type === "select") return known(value) || validOtherChoice(field,value) ? undefined : invalid;
  if (!Array.isArray(value) || value.length > 100 || value.some(entry => !known(entry) && !validOtherChoice(field,entry))) return invalid;
  if (value.filter(isOtherChoice).length > 1) return "最多选择一项其他文本";
  if (new Set(value.filter(entry => typeof entry === "string")).size !== value.filter(entry => typeof entry === "string").length) return "选项不能重复";
}
export function choiceJsonSchema(field: LowcodeField,property: Record<string,unknown>) {
  if (!["select","multiselect"].includes(field.type) || !field.choiceConfig?.allowOther) return;
  const other = { type:"object",required:["other"],additionalProperties:false,properties:{other:{type:"string",minLength:1,pattern:"\\S",maxLength:field.choiceConfig.otherMaxLength ?? 500}} };
  const known = {type:"string",enum:field.options ?? []};
  if (field.type === "select") { for (const key of ["type","enum","maxLength","minLength","pattern"]) delete property[key]; property.anyOf = [known,other]; }
  else property.items = {anyOf:[known,other]};
}
/** This token exists only inside controls and is never stored in form data. */
export function otherChoiceToken(field: LowcodeField) { let token = "__other__"; while (field.options?.includes(token)) token += "_"; return token; }
export function choiceControlValue(field: LowcodeField,value: unknown): string | string[] {
  const token=otherChoiceToken(field);
  return field.type === "multiselect" ? Array.isArray(value) ? value.flatMap(entry => typeof entry === "string" ? [entry] : isOtherChoice(entry) ? [token] : []) : [] : typeof value === "string" ? value : isOtherChoice(value) ? token : "";
}
export function choiceFromControl(field: LowcodeField, selected: string | string[], previous: unknown): string | OtherChoice | (string | OtherChoice)[] {
  const token=otherChoiceToken(field), other = (Array.isArray(previous) ? previous : [previous]).find(isOtherChoice)?.other ?? "";
  const convert = (key: string) => key === token && field.choiceConfig?.allowOther ? {other} : key;
  return Array.isArray(selected) ? selected.map(convert) : convert(selected);
}
export function changeOtherText(value: unknown,text: string): OtherChoice | (string | OtherChoice)[] {
  return Array.isArray(value) ? value.map(entry => isOtherChoice(entry) ? {other:text} : entry) : {other:text};
}
export function addChoice(field: LowcodeField): Partial<LowcodeField> {
  const key = `opt${crypto.randomUUID().replaceAll("-","")}`;
  return {options:[...(field.options ?? []),key],choiceConfig:{...field.choiceConfig,displayLabels:{...field.choiceConfig?.displayLabels,[key]:`选项 ${(field.options?.length ?? 0)+1}`}}};
}
