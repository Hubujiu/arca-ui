import test from "node:test";
import assert from "node:assert/strict";
import { resolveFieldRules, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { collectReferenceLookupQueries, fieldReferenceIssues, mergeReferenceFields, mergeReferenceValues, referenceLookupQuery } from "../src/lowcode/field-reference-context";
import { mergeWorkflowFieldValues, workflowDecisionData, workflowFieldValues, workflowReferenceValues, workflowTaskSchemas, type WorkflowFieldPermissions } from "../src/lowcode/workflow-field-permissions";
import { resolveRelation } from "../src/lowcode/relations";
const fallback="10000000-0000-4000-8000-000000000001",alternate="10000000-0000-4000-8000-000000000002",record="10000000-0000-4000-8000-000000000003";
const relation:LowcodeField={id:"customer",label:"客户",type:"relation",relationConfig:{tableId:fallback,filter:{fieldId:"code",operator:"EQ",sourceFieldId:"routeCode"},targets:[{id:"alternate",name:"第二来源",when:{fieldId:"route",operator:"EQ",value:"B"},tableId:alternate,filter:{fieldId:"code",operator:"EQ",sourceFieldId:"routeCode"}}]}};
const schema:TableSchema={name:"审批数据",description:"",fields:[{id:"route",label:"来源",type:"select",options:["A","B"]},{id:"routeCode",label:"来源编码",type:"text"},relation,{id:"projected",label:"计算快照",type:"formula",readOnly:true},{id:"lookupSnapshot",label:"查询快照",type:"lookup",readOnly:true},{id:"private",label:"隐藏值",type:"text"}]};
const permissions:WorkflowFieldPermissions={route:{access:"READ"},routeCode:{access:"READ"},customer:{access:"EDIT",required:true},projected:{access:"READ"},lookupSnapshot:{access:"READ"},private:{access:"HIDDEN"}};
const original={route:"B",routeCode:"READ42",customer:[record],projected:20,lookupSnapshot:99,private:"secret",unknown:"not authorized"};
test("editable relation validates authorized READ dependencies without validating stripped computed snapshots",()=>{
  const parts=workflowTaskSchemas(schema,permissions),context=workflowReferenceValues(parts.contextFields,original),edit=workflowFieldValues(parts.editSchema,original);
  assert.ok(Object.keys(validateValues(parts.editSchema,edit)).length);
  assert.deepEqual(validateFieldConfigs(parts.editSchema,false,parts.contextFields),{});
  assert.deepEqual(validateValues(parts.editSchema,edit,true,{referenceFields:parts.contextFields,referenceValues:context,existing:edit}),{});
  assert.deepEqual(parts.editSchema.fields.map(field=>field.id),["customer"]);
  assert.equal(Object.hasOwn(context,"private"),false);assert.equal(Object.hasOwn(context,"unknown"),false);
  const available=mergeReferenceFields(parts.editSchema.fields,parts.contextFields),values=mergeReferenceValues(parts.editSchema.fields,edit,parts.contextFields,context);
  assert.equal(resolveRelation(relation.relationConfig!,values,available).tableId,alternate);
});
test("current EDIT fields and cleared values win over read context without broadening submission",()=>{
  const policy={...permissions,route:{access:"EDIT" as const}},parts=workflowTaskSchemas(schema,policy),context=workflowReferenceValues(parts.contextFields,original);
  const current={route:"A",customer:[record]},fields=mergeReferenceFields(parts.editSchema.fields,parts.contextFields),values=mergeReferenceValues(parts.editSchema.fields,current,parts.contextFields,context);
  assert.equal(fields.filter(field=>field.id==="route").length,1);assert.equal(fields.find(field=>field.id==="route")?.readOnly,false);
  assert.equal(resolveRelation(relation.relationConfig!,values,fields).tableId,fallback);
  assert.equal(Object.hasOwn(mergeReferenceValues(parts.editSchema.fields,{},parts.contextFields,context),"customer"),false);
  const merged=mergeWorkflowFieldValues(parts.editSchema,original,{...current,routeCode:"forged",private:"forged"});
  assert.equal(merged.routeCode,"READ42");assert.deepEqual(workflowDecisionData(schema,policy,merged),current);
  assert.ok(validateValues(parts.editSchema,{...current,routeCode:"forged"},true,{referenceFields:parts.contextFields}).routeCode);
});
test("a HIDDEN or missing target condition source fails closed and cannot use fallback",()=>{
  const policy={...permissions,route:{access:"HIDDEN" as const}},parts=workflowTaskSchemas(schema,policy),fields=mergeReferenceFields(parts.editSchema.fields,parts.contextFields),values=mergeReferenceValues(parts.editSchema.fields,{customer:[record]},parts.contextFields,original);
  assert.equal(Object.hasOwn(values,"route"),false);assert.ok(fieldReferenceIssues(relation,fields).length);
  assert.ok(Object.keys(validateValues(parts.editSchema,{customer:[record]},true,{referenceFields:parts.contextFields})).length);
  const lookup:LowcodeField={id:"result",label:"查询",type:"lookup",lookupConfig:{relationFieldId:"customer",targetFieldId:"price",resultType:"number"}};
  assert.equal(referenceLookupQuery(lookup,values,[...fields,lookup]),undefined);
});
test("query lookup uses authorized relation and dynamic target context, never queries READ snapshots",()=>{
  const lookup:LowcodeField={id:"result",label:"查询",type:"lookup",lookupConfig:{relationFieldId:"customer",targetFieldId:"price",resultType:"number"}},editable:TableSchema={name:"",description:"",fields:[lookup]},context={referenceFields:schema.fields.filter(field=>field.id!=="private"),referenceValues:original};
  const queries=[...collectReferenceLookupQueries(editable,{},context).values()];assert.equal(queries.length,1);assert.equal(queries[0].tableId,alternate);
  let received:unknown;
  const prepared=resolveFieldRules(editable,{},{...context,lookupResolver:(_field,values,fields)=>{received={values,fields};return 35;}});
  assert.deepEqual(prepared.values,{result:35});assert.deepEqual(prepared.errors,{});
  assert.equal((received as {values:Record<string,unknown>}).values.route,"B");
  assert.equal(Object.hasOwn((received as {values:Record<string,unknown>}).values,"private"),false);
});
