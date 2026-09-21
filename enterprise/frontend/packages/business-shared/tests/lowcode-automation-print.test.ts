import test from "node:test";
import assert from "node:assert/strict";
import {normalizeAutomationRun,validateAutomation,type AutomationDraft,type AutomationPrintArtifact} from "../src/lowcode/automation-model";
const id="10000000-0000-4000-8000-000000000001";
const draft=():AutomationDraft=>({trigger:{type:"BUTTON"},steps:[{id:"print",kind:"PRINT",tableId:id,printTemplateId:"receipt",inputs:{recordId:{path:"trigger.recordId"},revision:{path:"trigger.revision"}}}]});
test("native PRINT requires a static published-template identifier and committed-record bindings",()=>{
  assert.deepEqual(validateAutomation(draft()),[]);
  for(const key of ["tableId","printTemplateId"] as const){const value=draft();delete value.steps[0][key];assert.ok(validateAutomation(value).length);}
  for(const key of ["recordId","revision"]){const value=draft();delete value.steps[0].inputs![key];assert.ok(validateAutomation(value).length);}
});
test("PRINT refuses arbitrary content, connectors, malformed IDs and fractional revisions",()=>{
  const cases=[{inputs:{data:{literal:{name:"forged"}}}},{connectorId:id},{values:{name:{literal:"forged"}}},{inputs:{recordId:{literal:"bad"},revision:{literal:1}}},{inputs:{recordId:{literal:id},revision:{literal:1.5}}}];
  for(const patch of cases){const value=draft();Object.assign(value.steps[0],patch);assert.ok(validateAutomation(value).length);}
});
test("download entries come only from separately authorized artifacts, never raw print outputs",()=>{
  const artifact:AutomationPrintArtifact={artifactId:id,stepPath:"root.print",fileName:"中文凭证.docx",mediaType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",size:1234,recordId:id,revision:2,tableVersionId:id,templateId:"receipt",sha256:"a".repeat(64)};
  const response={run:{id,automationId:id,status:"DONE",createdAt:"2026-09-12"},steps:[{stepPath:"root.print",kind:"PRINT",status:"DONE",outputSnapshot:{artifactId:id}}]};
  assert.deepEqual(normalizeAutomationRun(response).artifacts,[]);assert.deepEqual(normalizeAutomationRun({...response,artifacts:[artifact]}).artifacts,[artifact]);
});
