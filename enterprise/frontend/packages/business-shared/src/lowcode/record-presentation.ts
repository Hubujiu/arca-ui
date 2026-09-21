import {choiceLabel} from "./choices";
import type {LowcodeField,TableSchema} from "./field-model";
import {isFieldVisible} from "./field-model";
import {lookupTextSource} from "./relations";
import {ruleMatches} from "./rules";
export type DetailSection="overview"|"history"|"workflow"|"attachments";
export type DetailConfig={layout:"tabs"|"sections";sections:DetailSection[]};
export type PrintConfig={fieldIds:string[];columns:1|2;orientation:"portrait"|"landscape";showMetadata:boolean};
export type PrintTemplate={id:string;name:string;config:PrintConfig};
export const detailLabels:Record<DetailSection,string>={overview:"记录概览",history:"变更历史",workflow:"关联流程",attachments:"附件与签名"};
export const defaultDetail:DetailConfig={layout:"tabs",sections:["overview","history","workflow","attachments"]};
export const titleSource=(field:LowcodeField)=>lookupTextSource(field)&&!field.hidden&&field.visibility!=="alwaysHidden";
export const printableField=(field:LowcodeField)=>!field.hidden&&field.visibility!=="alwaysHidden"&&!["tabs","collapse","queryTable"].includes(field.type);
export function recordTitle(schema:TableSchema,data:Record<string,unknown>,fallback?:string) {
  const field=schema.fields.find(field=>field.id===schema.titleFieldId),raw=field?data[field.id]:undefined,value=field?.type==="select"?choiceLabel(field,raw):raw;
  return [...(field&&titleSource(field)&&(!field.visibleWhen||ruleMatches(field.visibleWhen,data,schema.fields))&&typeof value==="string"&&value.trim()?value.trim():fallback||schema.name||"记录")].slice(0,200).join("");
}
export function validateRecordPresentation(schema:TableSchema,child=false):string|undefined {
  if(child&&(schema.titleFieldId!==undefined||schema.detailConfig!==undefined||schema.printConfig!==undefined||schema.printTemplates!==undefined||schema.defaultPrintTemplateId!==undefined))return "记录展示配置仅支持根表单";
  if(schema.titleFieldId!==undefined&&!schema.fields.some(field=>field.id===schema.titleFieldId&&titleSource(field)))return "记录标题需要可见的直接文本字段";
  const detail=schema.detailConfig;
  if(detail!==undefined&&(!detail||typeof detail!=="object"||Array.isArray(detail)))return "详情分区配置无效";
  if(detail&&(!["tabs","sections"].includes(detail.layout)||Object.keys(detail).some(key=>!["layout","sections"].includes(key))||!Array.isArray(detail.sections)||!detail.sections.includes("overview")||detail.sections.some(section=>!Object.hasOwn(detailLabels,section))||new Set(detail.sections).size!==detail.sections.length||detail.sections.length>4))return "详情分区必须有效、不重复且包含概览";
  const printError=validatePrintConfig(schema.printConfig,schema.fields);if(printError)return printError;
  const templates=schema.printTemplates;
  if(templates!==undefined){
    if(!Array.isArray(templates)||templates.length>6)return "打印模板最多六套";
    const ids=new Set<string>(),names=new Set<string>();
    for(const template of templates){
      if(!template||typeof template!=="object"||Object.keys(template).some(key=>!["id","name","config"].includes(key))||typeof template.id!=="string"||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(template.id)||["constructor","prototype","__proto__"].includes(template.id)||typeof template.name!=="string"||!template.name.trim()||[...template.name.trim()].length>40||ids.has(template.id)||names.has(template.name.trim()))return "打印模板需要唯一标识和不超过四十字的名称";
      ids.add(template.id);names.add(template.name.trim());
      if(!template.config)return "打印模板需要配置字段与布局";
      const error=validatePrintConfig(template.config,schema.fields);if(error)return error;
    }
  }
  if(schema.defaultPrintTemplateId!==undefined&&!templates?.some(template=>template.id===schema.defaultPrintTemplateId))return "默认打印模板不存在";
}
function validatePrintConfig(print:PrintConfig|undefined,fields:LowcodeField[]):string|undefined {
  if(print!==undefined&&(!print||typeof print!=="object"||Array.isArray(print)))return "打印配置无效";
  if(print&&(Object.keys(print).some(key=>!["fieldIds","columns","orientation","showMetadata"].includes(key))||!Array.isArray(print.fieldIds)||!print.fieldIds.length||print.fieldIds.length>100||new Set(print.fieldIds).size!==print.fieldIds.length||print.fieldIds.some(id=>!fields.some(field=>field.id===id&&printableField(field)))||![1,2].includes(print.columns)||!["portrait","landscape"].includes(print.orientation)||typeof print.showMetadata!=="boolean"))return "打印配置需要有效字段、一至两列和打印方向";
}
/** Render current snapshots, with rules evaluated against all authorized data before selecting printed fields. */
export function printFields(schema:TableSchema,data:Record<string,unknown>,selected?:string[]) {
  const ids=selected??schema.printConfig?.fieldIds??schema.fields.filter(printableField).map(field=>field.id);
  return ids.flatMap(id=>{const field=schema.fields.find(field=>field.id===id);if(!field||!printableField(field)||!isFieldVisible(field,"edit",true)||(field.visibleWhen&&!ruleMatches(field.visibleWhen,data,schema.fields)))return[];
    const copy={...field};delete copy.visibleWhen;delete copy.requiredWhen;delete copy.warningRules;delete copy.column;
    return [copy];});
}
export function prunePrintPresentation(schema:TableSchema):TableSchema {
  const ids=new Set(schema.fields.filter(printableField).map(field=>field.id));
  function prune(config:PrintConfig){return {...config,fieldIds:config.fieldIds.filter(id=>ids.has(id))};}
  const print=schema.printConfig?prune(schema.printConfig):undefined;
  const printTemplates=schema.printTemplates?.map(template=>({...template,config:prune(template.config)})).filter(template=>template.config.fieldIds.length);
  return {...schema,printConfig:print?.fieldIds.length?print:undefined,printTemplates,defaultPrintTemplateId:printTemplates?.some(template=>template.id===schema.defaultPrintTemplateId)?schema.defaultPrintTemplateId:undefined};
}
