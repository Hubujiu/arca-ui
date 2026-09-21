import type {CSSProperties} from "react";
import {isDecoration,validIdCard,type LowcodeField,type SubtableRow} from "./field-model";
import {computedField} from "./calculations";
export type AdvancedFieldConfig={
  inputMode?:"text"|"numeric"|"decimal"|"tel"|"email"|"url"|"search";
  textPreset?:"none"|"letters"|"alphanumeric"|"digits"|"email"|"url"|"mobileCN"|"idCard";
  phoneType?:"any"|"mobileCN"|"landlineCN"|"international";
  divider?:{style?:"solid"|"dashed"|"dotted"|"double";color?:string;thickness?:number};
  subtable?:{allowAdd?:boolean;allowDelete?:boolean;allowCopy?:boolean;density?:"comfortable"|"compact"};
  media?:{capture?:"any"|"camera";allowDesktopUpload?:boolean;preview?:boolean;download?:boolean};
};
export const textPresets={none:"不限格式",letters:"英文字母",alphanumeric:"英文字母和数字",digits:"纯数字文本",email:"邮箱",url:"HTTP(S) 链接",mobileCN:"中国大陆手机号",idCard:"中国大陆身份证"};
export const phoneTypes={any:"常规电话（含国际前缀）",mobileCN:"中国大陆手机",landlineCN:"中国大陆固定电话",international:"国际号码（+国家码）"};
const textPatterns:Record<string,string>={letters:"[A-Za-z]+",alphanumeric:"[A-Za-z0-9]+",digits:"[0-9]+",email:"[^\\s@]+@[^\\s@]+\\.[^\\s@]+",url:"https?://[^\\s/@]+[^\\s]*",mobileCN:"1[3-9][0-9]{9}",idCard:"[1-9][0-9]{16}[0-9Xx]"};
const phonePatterns:Record<string,string>={mobileCN:"1[3-9][0-9]{9}",landlineCN:"0[0-9]{2,3}-?[0-9]{7,8}(?:-[0-9]{1,6})?",international:"\\+[1-9][0-9]{6,14}"};
const object=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
export function advancedConfigError(field:LowcodeField):string|undefined {
  const config=field.advancedConfig;if(config===undefined)return;
  if(!object(config,["inputMode","textPreset","phoneType","divider","subtable","media"]))return "高级配置包含未知属性";
  if(config.inputMode!==undefined&&(!["text","textarea","email","phone","url"].includes(field.type)||!["text","numeric","decimal","tel","email","url","search"].includes(config.inputMode)))return "移动输入方式与字段类型不匹配";
  if(config.textPreset!==undefined&&(field.type!=="text"||!Object.hasOwn(textPresets,config.textPreset)))return "文本预设格式无效";
  if(config.phoneType!==undefined&&(field.type!=="phone"||!Object.hasOwn(phoneTypes,config.phoneType)))return "电话类型无效";
  if(config.divider!==undefined){const value=config.divider;if(field.type!=="divider"||!object(value,["style","color","thickness"])||value.style!==undefined&&!["solid","dashed","dotted","double"].includes(value.style)||value.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(value.color)||value.thickness!==undefined&&(!Number.isInteger(value.thickness)||value.thickness<1||value.thickness>8))return "分隔线样式、颜色或粗细无效";}
  if(config.subtable!==undefined){const value=config.subtable;if(field.type!=="subtable"||!object(value,["allowAdd","allowDelete","allowCopy","density"])||[value.allowAdd,value.allowDelete,value.allowCopy].some(item=>item!==undefined&&typeof item!=="boolean")||value.density!==undefined&&!["comfortable","compact"].includes(value.density))return "子表操作或行高配置无效";}
  if(config.media!==undefined){const value=config.media;if(!["image","attachment","displayImage"].includes(field.type)||!object(value,["capture","allowDesktopUpload","preview","download"])||[value.allowDesktopUpload,value.preview,value.download].some(item=>item!==undefined&&typeof item!=="boolean")||value.capture!==undefined&&!["any","camera"].includes(value.capture)||field.type==="attachment"&&(value.capture!==undefined||value.allowDesktopUpload!==undefined))return "文件入口配置无效";}
}
export function advancedPattern(field:LowcodeField):string|undefined {const raw=field.type==="text"?textPatterns[field.advancedConfig?.textPreset??"none"]:field.type==="phone"?phonePatterns[field.advancedConfig?.phoneType??"any"]:undefined;return raw?field.type==="text"?`^(?:${raw})?$`:`^${raw}$`:undefined;}
export function advancedValueError(field:LowcodeField,value:unknown):string|undefined {
  const pattern=advancedPattern(field);if(!pattern||value===undefined||value==="")return;
  if(typeof value!=="string"||!new RegExp(pattern).test(value))return "不符合限定格式";
  if(field.advancedConfig?.textPreset==="idCard"&&!validIdCard(value))return "身份证号码的出生日期或校验位不正确";
  if(field.advancedConfig?.textPreset==="url")try{const url=new URL(value);if(!["http:","https:"].includes(url.protocol)||!url.hostname||url.username||url.password||/[^\x00-\x7f]/.test(url.host))return "需要有效的 HTTP(S) 地址";}catch{return "需要有效的 HTTP(S) 地址";}
}
export function subtablePolicy(field:LowcodeField){const config=field.advancedConfig?.subtable;return {allowAdd:config?.allowAdd!==false,allowDelete:config?.allowDelete!==false,allowCopy:config?.allowCopy!==false,density:config?.density??"comfortable" as const};}
export function advancedRowsError(field:LowcodeField,value:unknown,previous:unknown):string|undefined {
  if(field.type!=="subtable")return;const policy=subtablePolicy(field);if(policy.allowAdd&&policy.allowDelete)return;const before=new Set((Array.isArray(previous)?previous:[]).filter(row=>row&&typeof row.id==="string").map(row=>String(row.id).toLowerCase())),after=new Set((Array.isArray(value)?value:[]).filter(row=>row&&typeof row.id==="string").map(row=>String(row.id).toLowerCase()));
  if(!policy.allowAdd&&[...after].some(id=>!before.has(id)))return "不允许新增明细行";
  if(!policy.allowDelete&&[...before].some(id=>!after.has(id)))return "不允许删除明细行";
}
export function copySubtableRows(field:LowcodeField,rows:SubtableRow[],selected:string[]):SubtableRow[] {
  const policy=subtablePolicy(field),ids=new Set(selected),sources=rows.filter(row=>ids.has(row.id));
  if(!policy.allowAdd||!policy.allowCopy||!sources.length||rows.length+sources.length>(field.subtableConfig?.maxRows??50))return rows;
  const fields=field.subtableConfig?.fields??[],copies=sources.map(row=>({id:crypto.randomUUID(),values:Object.fromEntries(fields.filter(child=>!isDecoration(child)&&!computedField(child)&&!child.readOnly&&!child.hidden&&child.visibility!=="alwaysHidden"&&child.visibility!=="createHidden"&&child.type!=="serial"&&child.type!=="signature"&&Object.hasOwn(row.values,child.id)).map(child=>[child.id,structuredClone(row.values[child.id])]))}));
  return [...rows,...copies];
}
export function dividerStyle(field:LowcodeField):CSSProperties {const config=field.advancedConfig?.divider;return {borderTopStyle:config?.style??"solid",borderTopColor:config?.color,borderTopWidth:config?.thickness??1};}
export function mediaPolicy(field:LowcodeField,coarsePointer:boolean){const config=field.advancedConfig?.media;return {preview:config?.preview!==false,download:config?.download!==false,capture:config?.capture==="camera"?"environment" as const:undefined,uploadAllowed:config?.allowDesktopUpload!==false||coarsePointer};}
