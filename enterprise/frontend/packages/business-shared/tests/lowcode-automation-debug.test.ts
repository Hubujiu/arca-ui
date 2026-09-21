import test from "node:test";
import assert from "node:assert/strict";
import {parseDebugInput} from "../src/lowcode/automation-debug";
import {normalizeAutomation,validateAutomation,type Automation,type AutomationDraft} from "../src/lowcode/automation-model";
const person="10000000-0000-4000-8000-000000000abc",record="10000000-0000-4000-8000-000000000010";
const draft:AutomationDraft={trigger:{type:"BUTTON"},steps:[{id:"calculate",kind:"FUNCTION",formula:{op:"CONST",value:1}}]};
test("fixed debug input preserves literal null, explicit data and full loop mock paths",()=>{
  assert.deepEqual(parseDebugInput(7,'{"amount":12,"nullable":null}','{"root.loop.0.create":{"recordId":"fake","data":null}}',` ${record} `,"2"),{revision:7,data:{amount:12,nullable:null},recordId:record,recordRevision:2,mockOutputs:{"root.loop.0.create":{recordId:"fake",data:null}}});
  assert.deepEqual(parseDebugInput(1,"{}","{}","",""),{revision:1,data:{},mockOutputs:{}});
});
test("debug never accepts script paths, ambiguous root inputs or invalid revisions",()=>{
  for(const args of [[0,"{}","{}","",""],[1,"[]","{}","",""],[1,"{}","[]","",""],[1,"{bad}","{}","",""],[1,"{}","{}","wrong",""],[1,"{}","{}","","1.5"],[1,"{}","{}","","2147483648"],[1,"{}",'{"root.__proto__":{}}',"",""],[1,"{}",'{"root.a[0]":{}}',"",""],[1,"{}",'{"root.a":null}',"",""]] as [number,string,string,string,string][])assert.throws(()=>parseDebugInput(...args));
});
test("debug payload and mock count are bounded before network submission",()=>{
  assert.throws(()=>parseDebugInput(1,JSON.stringify({value:"x".repeat(262145)}),"{}","",""),/256 KB/);
  assert.throws(()=>parseDebugInput(1,"{}",JSON.stringify(Object.fromEntries(Array.from({length:251},(_,i)=>[`root.step${i}`,{}]))),"",""),/二百五十/);
});
test("optional failure notices survive server normalization without changing legacy drafts",()=>{
  const definition={id:"definition",tableId:record,name:"test",enabled:false,revision:1,draft} as Automation;
  assert.equal(normalizeAutomation(definition).draft.failureNotice,undefined);
  const configured=normalizeAutomation({...definition,draft:{...draft,failureNotice:{enabled:false,recipientIds:[person]}}});
  assert.deepEqual(configured.draft.failureNotice,{enabled:false,recipientIds:[person]});assert.deepEqual(validateAutomation(configured.draft),[]);
});
test("failure configuration rejects duplicate identities regardless of UUID letter case",()=>{
  for(const failureNotice of [{enabled:true,recipientIds:[person,person.toUpperCase()]},{enabled:true,recipientIds:["not-a-user"]},{enabled:true,recipientIds:Array.from({length:21},(_,i)=>`10000000-0000-4000-8000-${String(i).padStart(12,"0")}`)}])assert.ok(validateAutomation({...draft,failureNotice}).some(error=>error.includes("失败通知")));
  assert.deepEqual(validateAutomation({...draft,failureNotice:{enabled:true,recipientIds:[person]}}),[]);
});
