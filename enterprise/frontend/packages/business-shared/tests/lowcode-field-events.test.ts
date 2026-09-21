import test from "node:test";
import assert from "node:assert/strict";
import { fieldEventData, fieldEventIssues, fieldEventPath, fieldEventsEnabled, FieldEventSession, type FieldEvent, type FieldEventRequest, type FieldEventState } from "../src/lowcode/field-events";
import { validateFieldConfigs, type TableSchema } from "../src/lowcode/field-model";
const id="10000000-0000-4000-8000-000000000001",version="10000000-0000-4000-8000-000000000002";
const event:FieldEvent={id:"customerLookup",name:"客户查询",sourceFieldId:"code",connectorId:id,inputs:{query:"code"},outputs:{name:"body.name",amount:"body.amount"}};
const schema:TableSchema={name:"查询表",description:"",fields:[{id:"code",label:"编码",type:"text"},{id:"name",label:"名称",type:"text"},{id:"amount",label:"金额",type:"number"}],fieldEvents:[event]};
const context={tableId:id,versionId:version},wait=(ms=15)=>new Promise(resolve=>setTimeout(resolve,ms));
test("root event configuration is closed and rejects cycles, duplicate triggers and unsafe paths",()=>{
  assert.deepEqual(validateFieldConfigs(schema),{});assert.deepEqual(fieldEventIssues(schema),[]);
  for(const patch of [{id:undefined},{outputs:{name:"body.__proto__.name"}},{outputs:{name:"body.items.0.name"}},{outputs:{name:"body."}},{inputs:{}},{outputs:{}},{sourceFieldId:"missing"},{outputs:{code:"body.code"}}])assert.ok(fieldEventIssues({...schema,fieldEvents:[{...event,...patch}]}).length);
  assert.ok(fieldEventIssues({...schema,fieldEvents:[event,{...event,id:"other"}]}).length);
  assert.ok(fieldEventIssues({...schema,fieldEvents:[event,{...event,id:"reverse",sourceFieldId:"name",inputs:{name:"name"},outputs:{code:"body.code"}}]}).some(error=>error.includes("循环")));
  assert.ok(fieldEventIssues({...schema,fields:schema.fields.map(field=>field.id==="name"?{...field,readOnly:true}:field)}).length);
  assert.ok(fieldEventIssues(schema,true).length);assert.equal(fieldEventPath("body.customer_name"),true);
});
test("execution needs a published normal create/edit context and sends only scalar mapped input",()=>{
  assert.equal(fieldEventsEnabled(context),true);
  for(const patch of [{design:true},{changeId:id},{shareToken:"secret"},{versionId:""},{recordId:id},{recordId:id,recordRevision:0}])assert.equal(fieldEventsEnabled({...context,...patch}),false);
  assert.equal(fieldEventsEnabled({...context,recordId:id,recordRevision:2}),true);
  assert.deepEqual(fieldEventData(event,{code:"A",private:"not sent",amount:100}),{code:"A"});
  assert.throws(()=>fieldEventData(event,{code:{other:"custom"}}),/普通/);assert.throws(()=>fieldEventData(event,{code:"A".repeat(16385)}),/16 KiB/);
});
test("only explicit user changes execute, debounce uses latest data, and patches never recurse",async()=>{
  const calls:FieldEventRequest[]=[],patches:unknown[]=[],busy:boolean[]=[];
  const session=new FieldEventSession([event],context,async(_event,body)=>{calls.push(body);return {values:{name:"客户"}};},patch=>patches.push(patch),(_state,current)=>busy.push(current),5);
  await wait();assert.equal(calls.length,0);
  session.change("code",{code:"A"});session.change("code",{code:"AB"});session.change("code",{code:"ABC"});await wait();
  assert.equal(calls.length,1);assert.deepEqual(calls[0].data,{code:"ABC"});assert.deepEqual(patches,[{name:"客户"}]);assert.equal(busy.at(-1),false);session.dispose();
});
test("stale requests cannot overwrite a new response, and manual target edits are retained",async()=>{
  const pending:{body:FieldEventRequest;resolve:(result:{values:Record<string,unknown>})=>void}[]=[],patches:unknown[]=[];
  const session=new FieldEventSession([event],context,(_event,body)=>new Promise(resolve=>pending.push({body,resolve})),patch=>patches.push(patch),()=>{},1);
  session.change("code",{code:"SLOW"});await wait();session.change("code",{code:"FAST"});await wait();
  session.change("name",{code:"FAST",name:"手工名称"});pending[1].resolve({values:{name:"覆盖名称",amount:200}});await wait();pending[0].resolve({values:{name:"旧结果",amount:100}});await wait();
  assert.deepEqual(patches,[{amount:200}]);session.dispose();
});
test("failed retries reuse the exact request key and snapshot with a three-attempt limit",async()=>{
  const calls:FieldEventRequest[]=[],states:FieldEventState[][]=[];
  const session=new FieldEventSession([event],context,async(_event,body)=>{calls.push(body);throw new Error("连接器不可用");},()=>{},next=>states.push(next),1);
  session.change("code",{code:"A"});await wait();session.retry(event.id);await wait();session.retry(event.id);await wait();session.retry(event.id);await wait();
  assert.equal(calls.length,3);assert.equal(new Set(calls.map(call=>call.requestKey)).size,1);assert.deepEqual(calls[0],calls[2]);assert.equal(states.at(-1)?.[0].canRetry,false);session.dispose();
});
test("changed dependency input cancels the response and unlisted fields never reach the form",async()=>{
  const target={...event,inputs:{query:"code",amount:"amount"},outputs:{name:"body.name"}},patches:unknown[]=[],errors:FieldEventState[][]=[];
  let resolve:(value:{values:Record<string,unknown>})=>void=()=>{};
  const session=new FieldEventSession([target],context,()=>new Promise(done=>{resolve=done;}),patch=>patches.push(patch),next=>errors.push(next),1);
  session.change("code",{code:"A",amount:1});await wait();session.change("amount",{code:"A",amount:2});resolve({values:{name:"stale"}});await wait();assert.deepEqual(patches,[]);
  session.change("code",{code:"B",amount:2});await wait();resolve({values:{name:"safe",private:"unexpected"}});await wait();assert.deepEqual(patches,[]);assert.match(errors.at(-1)![0].message!,/格式无效/);session.dispose();
});
test("null outputs do not clear values and newer queries win shared target races",async()=>{
  const second={...event,id:"second",sourceFieldId:"another",inputs:{query:"another"}},pending:((value:{values:Record<string,unknown>})=>void)[]=[],patches:unknown[]=[];
  const session=new FieldEventSession([event,second],context,()=>new Promise(resolve=>pending.push(resolve)),patch=>patches.push(patch),()=>{},1);
  session.change("code",{code:"first"});await wait();session.change("another",{another:"second"});await wait();
  pending[1]({values:{name:null,amount:0}});await wait();pending[0]({values:{name:"old",amount:999}});await wait();
  assert.deepEqual(patches,[{amount:0}]);session.dispose();
});
