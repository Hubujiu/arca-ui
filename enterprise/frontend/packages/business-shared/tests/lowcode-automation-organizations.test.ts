import test from "node:test";
import assert from "node:assert/strict";
import {automationKinds,newAutomationStep,normalizeAutomation,validateAutomation,type Automation,type AutomationBinding,type AutomationDraft} from "../src/lowcode/automation-model";
const id="10000000-0000-4000-8000-000000000001";
const draft=(inputs:Record<string,AutomationBinding>={}):AutomationDraft=>({trigger:{type:"BUTTON"},steps:[{id:"people",kind:"ORG_QUERY",inputs}]});
test("organization nodes need no table or connector and preserve explicit empty filters",()=>{
  assert.equal(automationKinds.ORG_QUERY,"获取组织成员");assert.equal(newAutomationStep("ORG_QUERY",[]).kind,"ORG_QUERY");
  assert.deepEqual(validateAutomation(draft()),[]);assert.deepEqual(validateAutomation(draft({departmentIds:{literal:[]},userIds:{literal:[id]},selection:{literal:"DIRECT_MANAGERS"},includeDescendants:{literal:false}})),[]);
});
test("organization query rejects unknown operations, unsafe shapes and excessive limits",()=>{
  for(const inputs of [{userIds:{literal:id}},{positionIds:{literal:Array(51).fill(id)}},{departmentIds:{literal:["bad"]}},{limit:{literal:51}},{limit:{literal:1.5}},{includeDescendants:{literal:"true"}},{selection:{literal:"ROOT"}},{enabled:{literal:false}}])assert.ok(validateAutomation(draft(inputs)).length);
  const value=draft();value.steps[0].values={enabled:{literal:false}};assert.ok(validateAutomation(value).length);
  assert.ok(validateAutomation({trigger:{type:"BUTTON"},steps:[{id:"write",kind:"ORG_UPDATE" as "ORG_QUERY"}]}).length);
});
test("organization outputs can feed notices and runtime filters keep bounded path bindings",()=>{
  const value=draft({userIds:{path:"trigger.data.people"},selection:{literal:"DEPARTMENT_LEADERS"}});value.steps.push({id:"notify",kind:"NOTICE",inputs:{recipients:{path:"steps.people.userIds"},message:{literal:"提醒"}}});assert.deepEqual(validateAutomation(value),[]);
  const normalized=normalizeAutomation({id,tableId:id,name:"组织",revision:1,enabled:false,draft:value} as Automation);assert.deepEqual(normalized.draft.steps[0].inputs,value.steps[0].inputs);assert.equal(normalized.draft.steps[1].inputs?.recipients&&"path" in normalized.draft.steps[1].inputs.recipients, true);
});
