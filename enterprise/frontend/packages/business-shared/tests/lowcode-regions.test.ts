import assert from "node:assert/strict";
import { test } from "node:test";
import { regions, regionError } from "../src/lowcode/regions";
import { fieldValueLabel, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
const field: LowcodeField = {id:"address",label:"地址",type:"region",required:true};
const schema = (next=field): TableSchema => ({name:"地址",description:"",fields:[next]});
const value = {version:"cn-2023",codes:["11","1101","110101"],names:["北京市","市辖区","东城区"]};
test("catalog and field contracts support real codes and snapshots", () => {
  assert.equal(regions.length,31); assert.deepEqual(validateFieldConfigs(schema()),{});
  assert.deepEqual(validateValues(schema(),{address:value}),{});
  assert.equal(fieldValueLabel(field,value),"北京市 / 市辖区 / 东城区");
  assert.ok(regionError(field,{...value,codes:["11","3101","310101"]}));
  assert.ok(regionError(field,{...value,names:["北京市","市辖区","伪造"]}));
});
test("partial drafts, region scope and detailed address are enforced", () => {
  const partial = {...value,codes:["11"],names:["北京市"]};
  assert.deepEqual(validateValues(schema(),{address:partial},false),{});
  assert.ok(validateValues(schema(),{address:partial}).address);
  assert.deepEqual(validateValues(schema({...field,regionConfig:{depth:1}}),{address:partial}),{});
  assert.ok(regionError({...field,regionConfig:{provinceCodes:["31"]}},value));
  assert.ok(regionError({...field,regionConfig:{address:true,requireAddress:true}},value));
  assert.equal(regionError({...field,regionConfig:{address:true,requireAddress:true}},{...value,address:"长安街"}),undefined);
});
