import test from "node:test";
import assert from "node:assert/strict";
import {bindingError,connectorError,moveAutomationStep,newAutomationStep,normalizeAutomation,normalizeAutomationRun,redactAutomationValue,stepCount,validateAutomation,type Automation,type AutomationDraft} from "../src/lowcode/automation-model";
const table="10000000-0000-4000-8000-000000000001";
const simple:AutomationDraft={trigger:{type:"BUTTON"},steps:[{id:"calculate",kind:"FUNCTION",values:{amount:{path:"trigger.data.amount"}},formula:{op:"MUL",left:{op:"FIELD",fieldId:"amount"},right:{op:"CONST",value:2}}}]};
test("bindings use bounded data paths and reject scripts, ambiguous and invalid JSON sources",()=>{
  assert.equal(bindingError({path:"steps.query.items.0.data.amount"}),undefined);
  assert.equal(bindingError({literal:{payload:[1,true,null]}}),undefined);
  for(const value of [{path:"trigger.data['secret']"},{path:"window.location"},{path:"trigger.constructor.prototype"},{path:"item."+"a.".repeat(8)+"a"},{literal:undefined},{literal:NaN},{literal:"x",path:"item.x"}])assert.ok(bindingError(value));
});
test("server record bindings normalize null keys without changing literal null or ordered nested steps",()=>{
  const raw={id:"auto",name:"test",revision:1,enabled:false,tableId:table,draft:{trigger:{type:"BUTTON",intervalMinutes:null},steps:[{id:"query",kind:"QUERY",tableId:table,inputs:{query:{literal:null,path:"trigger.data.name"},limit:{literal:20,path:null},empty:{literal:null,path:null}},values:null,steps:null,elseSteps:null}]}} as unknown as Automation;
  const result=normalizeAutomation(raw);
  assert.deepEqual(result.draft.trigger,{type:"BUTTON"});
  assert.deepEqual(result.draft.steps[0].inputs,{query:{path:"trigger.data.name"},limit:{literal:20},empty:{literal:null}});
  assert.equal(validateAutomation(result.draft).length,0);
  assert.equal((raw.draft.trigger as unknown as {intervalMinutes:null}).intervalMinutes,null);
});
test("nested branches share stable IDs and reorder preserves variable references",()=>{
  const steps=[{id:"step1",kind:"CONDITION" as const,rule:{fieldId:"amount",operator:"GT" as const,value:0},steps:[{id:"step2",kind:"FUNCTION" as const,formula:{op:"CONST" as const,value:1}}]},...simple.steps];
  assert.equal(newAutomationStep("QUERY",steps).id,"step3");
  assert.equal(stepCount(steps),3);
  assert.equal(moveAutomationStep(steps,0,1)[1],steps[0]);
  assert.equal(moveAutomationStep(steps,0,-1),steps);
  assert.ok(validateAutomation({trigger:{type:"BUTTON"},steps:[...steps,{...simple.steps[0],id:"step2"}]}).some(value=>value.includes("唯一")));
});
test("publish checks real rule, numeric formula dependencies and required runtime mappings",()=>{
  assert.deepEqual(validateAutomation(simple),[]);
  assert.ok(validateAutomation({...simple,steps:[{...simple.steps[0],values:{amount:{literal:"2"}}}]}).some(value=>value.includes("数字")));
  assert.ok(validateAutomation({...simple,steps:[{...simple.steps[0],values:{}}]}).some(value=>value.includes("引用字段不存在")));
  assert.ok(validateAutomation({...simple,steps:[{id:"update",kind:"UPDATE",tableId:table}]}).some(value=>value.includes("revision")));
  assert.ok(validateAutomation({...simple,steps:[{id:"branch",kind:"CONDITION",rule:{fieldId:"missing",operator:"NOT_EMPTY"},steps:simple.steps}]},[{id:"amount",label:"金额",type:"number"}]).length);
  assert.ok(validateAutomation({...simple,steps:[{id:"http",kind:"HTTP"}]}).some(value=>value.includes("连接器")));
});
test("trigger and execution definition limits are bounded",()=>{
  assert.ok(validateAutomation({...simple,trigger:{type:"SCHEDULE",intervalMinutes:525601}}).length);
  assert.ok(validateAutomation({...simple,trigger:{type:"DATE_FIELD",dateFieldId:"due",offsetMinutes:-525601}}).length);
  assert.ok(validateAutomation({...simple,steps:Array.from({length:51},(_,i)=>({...simple.steps[0],id:`step${i}`}))}).some(value=>value.includes("五十")));
  let nested=simple.steps;for(let index=0;index<5;index++)nested=[{id:`loop${index}`,kind:"FOREACH",inputs:{items:{literal:[]}},steps:nested}];
  assert.ok(validateAutomation({...simple,steps:nested}).some(value=>value.includes("五层")));
});
test("run response uses real backend state and snapshots and keeps retry privilege explicit",()=>{
  const run=normalizeAutomationRun({run:{id:"run",automationId:"auto",state:"FAILED",status:"",createdAt:"2026-09-12",canRetry:false},steps:[{stepPath:"loop.0.query",kind:"QUERY",state:"FAILED",status:"",completedAt:"2026-09-12",outputSnapshot:{token:"secret",items:[{password:"hidden",amount:2}]}}]});
  assert.equal(run.status,"FAILED");assert.equal(run.canRetry,false);assert.equal(run.steps?.[0].finishedAt,"2026-09-12");
  assert.deepEqual(redactAutomationValue(run.steps?.[0].output),{token:"[已隐藏]",items:[{password:"[已隐藏]",amount:2}]});
});
test("connector forms accept environment references and reject credentials or query strings in URLs",()=>{
  const value={name:"ERP",url:"https://erp.example/api",method:"POST" as const,enabled:true,authorizationEnv:"DOCWEAVE_CONNECTOR_ERP_TOKEN"};
  assert.equal(connectorError(value),undefined);
  for(const url of ["https://user:password@erp.example/api","https://erp.example/api?token=secret","http://erp.example/api","javascript:alert(1)"])assert.ok(connectorError({...value,url}));
  assert.ok(connectorError({...value,authorizationEnv:"SECRET_VALUE"}));
});
