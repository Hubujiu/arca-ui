import assert from "node:assert/strict";
import {test} from "node:test";
import {filterSourceValues,validateRelationFilter} from "../src/lowcode/relation-filters";
import {lookupQuery,lookupKey,relationLimit,validateLookup,validateQuery,validateRelation} from "../src/lowcode/relations";
import {dataJsonSchema,resolveFieldRules,validateFieldConfigs,validateValues,type LowcodeField,type TableSchema} from "../src/lowcode/field-model";
const table="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",a="11111111-2222-4333-8444-555555555555",b="22222222-2222-4333-8444-555555555555";
const selected:LowcodeField={id:"selected",label:"关联",type:"relation",relationConfig:{tableId:table,multiple:true,maxRecords:50}};
const schema=(fields:LowcodeField[]):TableSchema=>({name:"关联扩展",description:"",fields});
test("dynamic filter binds only referenced current values and rejects unknown or missing source fields",()=>{
  const filter={fieldId:"category",operator:"EQ" as const,sourceFieldId:"choice"},choice:LowcodeField={id:"choice",label:"分类",type:"text"};
  assert.deepEqual(filterSourceValues(filter,{choice:"A",secret:"unrelated"}),{choice:"A"});
  assert.deepEqual(validateFieldConfigs(schema([choice,{...selected,relationConfig:{...selected.relationConfig!,filter}}])),{});
  assert.ok(validateFieldConfigs(schema([{...selected,relationConfig:{...selected.relationConfig!,filter}}])).selected);
  assert.ok(validateRelationFilter({...filter,value:"A"}).length);assert.ok(validateRelationFilter({...filter,sql:"1=1"}).length);
});
test("multi relation lookup previews have separate cache identities and replace forged snapshots",()=>{
  const total:LowcodeField={id:"total",label:"合计",type:"lookup",lookupConfig:{relationFieldId:"selected",targetFieldId:"price",resultType:"number",aggregate:"SUM"}};
  const count:LowcodeField={id:"count",label:"数量",type:"lookup",lookupConfig:{relationFieldId:"selected",resultType:"number",aggregate:"COUNT"}};
  assert.deepEqual(validateLookup(total.lookupConfig,[selected]),[]);assert.deepEqual(validateLookup(count.lookupConfig,[selected]),[]);
  const query=lookupQuery(total,{selected:[a,b]},[selected])!;assert.deepEqual(query,{tableId:table,recordIds:[a,b],aggregate:"SUM",resultType:"number",fieldId:"price"});
  assert.notEqual(lookupKey(query),lookupKey({...query,aggregate:"AVG"}));
  const definition=schema([total,count,selected]);assert.equal(resolveFieldRules(definition,{selected:[a,b],total:999},{lookupResolver:field=>field.id==="total"?0.3:2}).values.total,0.3);
  assert.deepEqual(lookupQuery(count,{},[selected])?.recordIds,[]);
});
test("cascades use stable ordered UUID paths and scalar lookups read terminal identity",()=>{
  const field:LowcodeField={...selected,relationConfig:{tableId:table,cascade:{parentFieldId:"parent",leafOnly:true,maxDepth:5}}};
  assert.equal(relationLimit(field),5);assert.deepEqual(validateValues(schema([field]),{selected:[a,b]}),{});
  const lookup:LowcodeField={id:"name",label:"名称",type:"lookup",lookupConfig:{relationFieldId:"selected",targetFieldId:"name",resultType:"text"}};
  assert.equal(lookupQuery(lookup,{selected:[a,b]},[field])?.recordId,b);
  assert.ok(validateRelation({...field.relationConfig,multiple:true}).length);assert.ok(validateRelation({...field.relationConfig,cascade:{parentFieldId:"parent",maxDepth:11}}).length);
  assert.ok(validateValues(schema([field]),{selected:[a,a]}).selected);
});
test("embedded query validates columns and same-target scope and never enters record JSON schema",()=>{
  const config={tableId:table,columnIds:["name","price"],relationFieldId:"selected",pageSize:10};assert.deepEqual(validateQuery(config,[selected]),[]);
  assert.ok(validateQuery({...config,columnIds:["name","name"]},[selected]).length);assert.ok(validateQuery({...config,relationFieldId:"missing"},[selected]).length);
  const field:LowcodeField={id:"query",label:"查询表",type:"queryTable",queryConfig:config},definition=schema([selected,field]);assert.deepEqual(validateFieldConfigs(definition),{});
  assert.equal((dataJsonSchema(definition).properties as Record<string,unknown>).query,undefined);assert.ok(Object.keys(validateValues(definition,{query:[{price:999}]})).length);
});
