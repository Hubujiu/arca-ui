import test from "node:test";
import assert from "node:assert/strict";
import {printFields,recordTitle,validateRecordPresentation,prunePrintPresentation,type PrintTemplate} from "../src/lowcode/record-presentation";
import {validateFieldConfigs,type TableSchema} from "../src/lowcode/field-model";
const schema:TableSchema={name:"记录",description:"",fields:[{id:"name",label:"姓名",type:"text"},{id:"amount",label:"金额",type:"number"},{id:"secret",label:"隐藏内容",type:"text",visibility:"alwaysHidden"},{id:"conditional",label:"条件内容",type:"text",visibleWhen:{fieldId:"amount",operator:"GT",value:100}}]};
const template:PrintTemplate={id:"summary",name:"摘要",config:{fieldIds:["name"],columns:1,orientation:"portrait",showMetadata:false}};
test("named print templates validate root scope, names, references and default without altering legacy config",()=>{
  const value={...schema,printTemplates:[template],defaultPrintTemplateId:template.id};assert.deepEqual(validateFieldConfigs(value),{});
  assert.match(validateRecordPresentation(value,true)!,/根表单/);
  assert.match(validateRecordPresentation({...value,defaultPrintTemplateId:"gone"})!,/不存在/);
  assert.match(validateRecordPresentation({...value,printTemplates:Array(7).fill(template)})!,/六套/);
  assert.match(validateRecordPresentation({...value,printTemplates:[template,template]})!,/唯一/);
  assert.match(validateRecordPresentation({...value,printTemplates:[{...template,config:{...template.config,fieldIds:["secret"]}}]})!,/打印/);
  assert.match(validateRecordPresentation({...value,printTemplates:[{...template,name:" "}]})!,/名称/);
});
test("deleting or hiding template fields prunes configurations and removed defaults without mutating snapshots",()=>{
  const value={...schema,printConfig:template.config,printTemplates:[template,{id:"amount",name:"金额",config:{...template.config,fieldIds:["amount"]}}],defaultPrintTemplateId:template.id};
  const next=prunePrintPresentation({...value,fields:value.fields.filter(field=>field.id!=="name")});
  assert.equal(next.printConfig,undefined);assert.equal(next.defaultPrintTemplateId,undefined);assert.deepEqual(next.printTemplates?.map(template=>template.id),["amount"]);
  assert.deepEqual(value.printConfig.fieldIds,["name"]);assert.equal(value.printTemplates.length,2);
});
test("record titles use visible scalar source, Unicode bounds and stable fallback",()=>{assert.equal(recordTitle({...schema,titleFieldId:"name"},{name:" 合同 "},"fallback"),"合同");assert.equal(recordTitle({...schema,titleFieldId:"name"},{},"fallback"),"fallback");assert.equal([...recordTitle({...schema,titleFieldId:"name"},{name:"😀".repeat(210)})].length,200);assert.match(validateRecordPresentation({...schema,titleFieldId:"amount"})!,/文本/);});
test("record presentation has closed root configs and mandatory overview",()=>{const config={...schema,titleFieldId:"name",detailConfig:{layout:"tabs" as const,sections:["overview" as const,"history" as const]},printConfig:{fieldIds:["name"],columns:2 as const,orientation:"landscape" as const,showMetadata:false}};assert.deepEqual(validateFieldConfigs(config),{});assert.match(validateRecordPresentation({...schema,detailConfig:{layout:"tabs",sections:["history"]}})!,/概览/);assert.match(validateRecordPresentation({...config,printConfig:{...config.printConfig,fieldIds:["name","name"]}})!,/打印/);});
test("print evaluates visibility against full snapshot before selecting fields and preserves computed snapshots",()=>{assert.deepEqual(printFields(schema,{name:"张三",amount:10},["name","secret","conditional"]).map(field=>field.id),["name"]);assert.deepEqual(printFields(schema,{amount:200},["conditional"]).map(field=>field.id),["conditional"]);assert.equal(printFields(schema,{amount:200},["conditional"])[0].visibleWhen,undefined);const computed={...schema,fields:[...schema.fields,{id:"sum",label:"合计",type:"formula" as const,formulaConfig:{expression:{op:"FIELD" as const,fieldId:"amount"}}}]};assert.equal(printFields(computed,{sum:32},["sum"])[0].type,"formula");});
