import test from "node:test";
import assert from "node:assert/strict";
import {printFields} from "../src/lowcode/record-presentation";
import {fieldReferenceIssues,mergeReferenceFields,mergeReferenceValues} from "../src/lowcode/field-reference-context";
import {resolveRelation} from "../src/lowcode/relations";
import type {LowcodeField,TableSchema} from "../src/lowcode/field-model";
const fallback="10000000-0000-4000-8000-000000000001",alternate="10000000-0000-4000-8000-000000000002";
const relation:LowcodeField={id:"customer",label:"客户",type:"relation",relationConfig:{tableId:fallback,targets:[{id:"alternate",name:"第二来源",when:{fieldId:"source",operator:"EQ",value:"B"},tableId:alternate}]}};
const schema:TableSchema={name:"打印记录",description:"",fields:[{id:"source",label:"来源",type:"text"},relation,{id:"conditional",label:"条件内容",type:"text",visibleWhen:{fieldId:"source",operator:"EQ",value:"A"}}]};
test("printing selected fields keeps authorized relation references without printing sources or missing fields",()=>{
  const data={source:"B",customer:[],conditional:"不应显示"},printed=printFields(schema,data,["customer","conditional","removed"]);
  assert.deepEqual(printed.map(field=>field.id),["customer"]);
  assert.ok(fieldReferenceIssues(printed[0],printed).length);
  const fields=mergeReferenceFields(printed,schema.fields),values=mergeReferenceValues(printed,data,schema.fields,data);
  assert.deepEqual(fieldReferenceIssues(printed[0],fields),[]);
  assert.equal(resolveRelation(relation.relationConfig!,values,fields).tableId,alternate);
  assert.deepEqual(printed.map(field=>field.id),["customer"]);
  const restricted=schema.fields.filter(field=>field.id!=="source");
  assert.ok(fieldReferenceIssues(printed[0],mergeReferenceFields(printed,restricted)).length);
  assert.equal(Object.hasOwn(mergeReferenceValues(printed,data,restricted,data),"source"),false);
});
test("subtable printing resolves hidden display sources in each authorized row scope",()=>{
  const child:TableSchema={...schema,fields:schema.fields.map(field=>field.id==="source"?{...field,hidden:true}:field)};
  const first={source:"A",customer:[]},second={source:"B",customer:[]};
  const targets=[first,second].map(data=>{
    const printed=printFields(child,data,["source","customer"]),fields=mergeReferenceFields(printed,child.fields),values=mergeReferenceValues(printed,data,child.fields,data);
    assert.deepEqual(printed.map(field=>field.id),["customer"]);
    assert.deepEqual(fieldReferenceIssues(printed[0],fields),[]);
    return resolveRelation(relation.relationConfig!,values,fields).tableId;
  });
  assert.deepEqual(targets,[fallback,alternate]);
});
