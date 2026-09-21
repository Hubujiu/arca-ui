import assert from "node:assert/strict";
import {test} from "node:test";
import {createdRelation,appendCreatedRelation} from "../src/lowcode/relation-create";
import {queryTableRequest} from "../src/lowcode/query-table-request";
import {validateQuery,validateRelation} from "../src/lowcode/relations";
const table="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",a="11111111-2222-4333-8444-555555555555",b="22222222-2222-4333-8444-555555555555";
test("inline create config is optional and strictly boolean",()=>{
  assert.deepEqual(validateRelation({tableId:table,allowCreate:true}),[]);assert.deepEqual(validateRelation({tableId:table}),[]);
  assert.ok(validateRelation({tableId:table,allowCreate:"true"}).length);
});
test("a persisted record is attachable independently of workflow outcome",()=>{
  assert.deepEqual(createdRelation({id:a,status:"PENDING",recordId:b}),{kind:"pending",changeId:a});
  assert.deepEqual(createdRelation({id:a,status:"PENDING",recordId:b,persistedRevision:1}),{kind:"ready",recordId:b});
  assert.deepEqual(createdRelation({id:a,status:"REJECTED",recordId:b,persistedRevision:1}),{kind:"ready",recordId:b});
  assert.deepEqual(createdRelation({id:a,status:"WITHDRAWN",recordId:b,persistedRevision:1}),{kind:"ready",recordId:b});
  assert.deepEqual(createdRelation({id:a,status:"APPROVED",recordId:b,persistedRevision:1}),{kind:"ready",recordId:b});
  assert.deepEqual(createdRelation({id:a,status:"APPROVED"}),{kind:"unavailable"});
  assert.deepEqual(createdRelation({id:a,status:"REJECTED",recordId:b}),{kind:"unavailable"});
});
test("attaching new records preserves multiple limits and cascade path identity",()=>{
  assert.deepEqual(appendCreatedRelation({tableId:table},[a],b),[b]);
  assert.deepEqual(appendCreatedRelation({tableId:table,multiple:true,maxRecords:2},[a],b),[a,b]);
  assert.deepEqual(appendCreatedRelation({tableId:table,multiple:true,maxRecords:1},[a],a.toUpperCase()),[a]);
  assert.throws(()=>appendCreatedRelation({tableId:table,multiple:true,maxRecords:1},[a],b));
  assert.deepEqual(appendCreatedRelation({tableId:table,cascade:{parentFieldId:"parent",maxDepth:2}},[],b,[a]),[a,b]);
  assert.throws(()=>appendCreatedRelation({tableId:table,cascade:{parentFieldId:"parent",maxDepth:1}},[],b,[a]));
});
test("reverse query needs a persisted source and never falls back to unrestricted target listing",()=>{
  const config={tableId:table,columnIds:["name"],backReferenceFieldId:"parent"};
  assert.deepEqual(validateQuery(config,[]),[]);assert.equal(queryTableRequest(config,{}),undefined);
  assert.deepEqual(queryTableRequest(config,{},a),{tableId:table,titleFieldId:"name",columns:["name"],pageSize:10,backReferenceFieldId:"parent",sourceRecordId:a});
  assert.ok(validateQuery({...config,relationFieldId:"selected"},[]).length);
  assert.ok(validateQuery({...config,backReferenceFieldId:"nested.parent"},[]).length);
});
