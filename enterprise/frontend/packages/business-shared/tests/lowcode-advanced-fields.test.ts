import test from "node:test";
import assert from "node:assert/strict";
import {advancedConfigError,advancedPattern,advancedRowsError,advancedValueError,copySubtableRows,dividerStyle,mediaPolicy,type AdvancedFieldConfig} from "../src/lowcode/advanced-fields";
import {validateFieldConfigs,validateValues,type LowcodeField,type SubtableRow,type TableSchema} from "../src/lowcode/field-model";
const field=(type:LowcodeField["type"],advancedConfig:AdvancedFieldConfig):LowcodeField=>({id:"field",label:"字段",type,advancedConfig});
const config=(value:LowcodeField):TableSchema=>({name:"高级字段",description:"",fields:[value]});
test("text and phone formats are actual validators independent of keyboard hints",()=>{
  const numeric=field("text",{inputMode:"text",textPreset:"digits"});assert.deepEqual(validateFieldConfigs(config(numeric)),{});assert.deepEqual(validateValues(config(numeric),{field:"00120"}),{});assert.ok(validateValues(config(numeric),{field:"1a"}).field);
  assert.equal(advancedValueError(field("text",{textPreset:"idCard"}),"11010519491231002X"),undefined);assert.ok(advancedValueError(field("text",{textPreset:"idCard"}),"110105194912310021"));
  assert.ok(advancedValueError(field("text",{textPreset:"url"}),"https://user:pass@example.com"));
  for(const [phoneType,value] of Object.entries({mobileCN:"13800138000",landlineCN:"010-12345678-123",international:"+442071234567"}))assert.equal(advancedValueError(field("phone",{phoneType:phoneType as AdvancedFieldConfig["phoneType"]}),value),undefined);
  assert.ok(advancedValueError(field("phone",{phoneType:"international"}),"442071234567"));
});
test("advanced settings reject unsafe style and type combinations",()=>{
  assert.ok(advancedConfigError(field("number",{textPreset:"digits"})));
  assert.ok(advancedConfigError(field("divider",{divider:{color:"url(javascript:evil)"}})));
  assert.ok(advancedConfigError(field("divider",{divider:{thickness:1.2}})));
  assert.ok(advancedConfigError(field("attachment",{media:{capture:"camera"}})));
  assert.equal(advancedPattern(field("text",{textPreset:"digits"})),"^(?:[0-9]+)?$");
  assert.deepEqual(dividerStyle(field("divider",{divider:{style:"dotted",thickness:3,color:"#aabbcc"}})),{borderTopStyle:"dotted",borderTopColor:"#aabbcc",borderTopWidth:3});
});
test("copy rows allocates new stable IDs, clones business values and excludes signatures and computed/readonly data",()=>{
  const lines:LowcodeField={...field("subtable",{subtable:{allowCopy:true}}),subtableConfig:{maxRows:4,fields:[{id:"name",label:"品名",type:"text"},{id:"choices",label:"选项",type:"multiselect",options:["A"]},{id:"sum",label:"计算",type:"formula"},{id:"readonly",label:"只读",type:"text",readOnly:true},{id:"sign",label:"签名",type:"signature"}]}};
  const original:SubtableRow[]=[{id:"10000000-0000-4000-8000-000000000001",values:{name:"项目",choices:["A"],sum:999,readonly:"受保护",sign:{version:1}}}];
  const next=copySubtableRows(lines,original,[original[0].id]);assert.equal(next.length,2);assert.notEqual(next[1].id,original[0].id);assert.deepEqual(next[1].values,{name:"项目",choices:["A"]});(next[1].values.choices as string[]).push("B");assert.deepEqual(original[0].values.choices,["A"]);
  assert.equal(copySubtableRows({...lines,advancedConfig:{subtable:{allowAdd:false}}},original,[original[0].id]),original);
  assert.equal(copySubtableRows({...lines,subtableConfig:{...lines.subtableConfig!,maxRows:1}},original,[original[0].id]),original);
});
test("row policies compare stable identity, catch omitted lists and permit content edits/reorder",()=>{
  const policy=field("subtable",{subtable:{allowAdd:false,allowDelete:false}}),a={id:"AAAA0000-0000-4000-8000-000000000001",values:{name:"A"}},b={id:"BBBB0000-0000-4000-8000-000000000001",values:{name:"B"}};
  assert.equal(advancedRowsError(policy,[{...a,id:a.id.toLowerCase(),values:{name:"changed"}}],[a]),undefined);
  assert.equal(advancedRowsError(policy,[b,a],[a,b]),undefined);
  assert.match(advancedRowsError(policy,undefined,[a])!,/删除/);assert.match(advancedRowsError(policy,[a,b],[a])!,/新增/);
});
test("media policies independently control preview/download entry and use capabilities without pretending to authorize",()=>{
  const image=field("image",{media:{capture:"camera",allowDesktopUpload:false,preview:false,download:false}});
  assert.deepEqual(mediaPolicy(image,false),{capture:"environment",uploadAllowed:false,preview:false,download:false});
  assert.equal(mediaPolicy(image,true).uploadAllowed,true);assert.equal(mediaPolicy(field("image",{}),false).download,true);
});
