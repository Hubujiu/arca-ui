import test from "node:test";
import assert from "node:assert/strict";
import {lookupQuery,relationLimit,relationTargets,resolveRelation,validateQuery,validateRelation,type RelationConfig} from "../src/lowcode/relations";
import {relationEditResult,relationEditValues} from "../src/lowcode/relation-edit";
import type {LowcodeField} from "../src/lowcode/field-model";
const a="10000000-0000-4000-8000-000000000001",b="10000000-0000-4000-8000-000000000002",record="10000000-0000-4000-8000-000000000003";
const source:LowcodeField={id:"amount",type:"number",label:"金额"};
const config:RelationConfig={tableId:a,titleFieldId:"name",allowCreate:true,targets:[{id:"large",name:"大额",tableId:b,when:{fieldId:"amount",operator:"GT",value:10},filter:{fieldId:"price",operator:"GTE",value:10}}]};
test("ordered condition targets share selection controls and fallback keeps legacy target metadata",()=>{
  assert.equal(validateRelation(config,[source]).length,0);assert.equal(resolveRelation(config,{amount:11},[source]).tableId,b);
  assert.deepEqual(resolveRelation(config,{amount:1},[source]),{tableId:a,titleFieldId:"name",allowCreate:true});
  const chosen=resolveRelation(config,{amount:11},[source]);assert.equal(chosen.allowCreate,true);assert.equal(chosen.titleFieldId,undefined);
  assert.equal(resolveRelation({...config,targets:[...config.targets!,{...config.targets![0],id:"later",tableId:a}]},{amount:20},[source]).tableId,b);
  assert.equal(config.targets![0].tableId,b);assert.equal(relationTargets(config).length,2);
});
test("dynamic targets reject missing and computed dependencies, duplicate IDs and unbounded definitions",()=>{
  assert.ok(validateRelation(config,[]).length);
  assert.ok(validateRelation(config,[{...source,type:"formula"}]).length);
  assert.ok(validateRelation({...config,targets:[config.targets![0],config.targets![0]]},[source]).length);
  assert.ok(validateRelation({...config,targets:Array.from({length:9},(_,i)=>({...config.targets![0],id:`choice${i}`}))},[source]).length);
});
test("lookup queries use chosen target while stored relation values remain UUID arrays",()=>{
  const relation:LowcodeField={id:"link",type:"relation",label:"关联",relationConfig:config},lookup:LowcodeField={id:"snapshot",type:"lookup",label:"快照",lookupConfig:{relationFieldId:"link",targetFieldId:"price",resultType:"number"}};
  const values={amount:12,link:[record]};assert.equal(lookupQuery(lookup,values,[source,relation,lookup])?.tableId,b);assert.deepEqual(values.link,[record]);
  assert.equal(lookupQuery(lookup,{...values,amount:1},[source,relation,lookup])?.tableId,a);
  assert.deepEqual(validateQuery({tableId:b,columnIds:["name"],relationFieldId:"link",allowEdit:true},[relation]),[]);
});
test("mixed fixed and cascade targets provide a safe schema maximum but selected mode retains its own limit",()=>{
  const mixed:RelationConfig={...config,targets:[{...config.targets![0],cascade:{parentFieldId:"parent",maxDepth:7}}]};
  assert.equal(relationLimit({id:"link",type:"relation",label:"link",relationConfig:mixed}),7);
  assert.equal(relationLimit({id:"link",type:"relation",label:"link",relationConfig:resolveRelation(mixed,{amount:1},[source])}),1);
  assert.ok(validateRelation({...mixed,multiple:true,maxRecords:3},[source]).length);
});
test("target editor projects only current published fields without mutating historical record snapshots",()=>{
  const fields:LowcodeField[]=[source,{id:"rows",type:"subtable",label:"明细",subtableConfig:{fields:[{id:"name",type:"text",label:"名称"}]}},{id:"query",type:"queryTable",label:"关联明细"}];
  const before={amount:2,removed:"history",query:[1],rows:[{id:record,values:{name:"kept",removed:"history"}}]};
  assert.deepEqual(relationEditValues(fields,before),{amount:2,rows:[{id:record,values:{name:"kept"}}]});assert.equal(before.removed,"history");
});
test("edit completion requires the saved revision and matching record, regardless of workflow outcome",()=>{
  const row={id:record,revision:2};assert.equal(relationEditResult({status:"PENDING",recordId:record},row,1),"pending");
  for(const status of ["PENDING","REJECTED","WITHDRAWN","APPROVED"])
    assert.equal(relationEditResult({status,recordId:record,persistedRevision:2},row,1),"ready");
  assert.equal(relationEditResult({status:"APPROVED",recordId:record,persistedRevision:2},row,2),"pending");
  assert.equal(relationEditResult({status:"APPROVED",recordId:a,persistedRevision:2},row,1),"pending");
  assert.equal(relationEditResult({status:"REJECTED",recordId:record},row,1),"closed");
});
