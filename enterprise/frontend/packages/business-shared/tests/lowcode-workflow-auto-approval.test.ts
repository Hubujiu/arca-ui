import assert from "node:assert/strict";
import {test} from "node:test";
import {defaultAppearance,type TableSchema} from "../src/lowcode/field-model";
import {initialWorkflow,insertWorkflowNode,removeWorkflowNode,validateWorkflow,workflowAutoApprovalIssues,workflowAutoApprovalReason,type WorkflowNode,type WorkflowAutoApproval} from "../src/lowcode/workflow-model";
const schema:TableSchema={name:"自动审批",description:"",appearance:defaultAppearance,fields:[{id:"amount",type:"number",label:"金额"},{id:"note",type:"text",label:"说明"}]};
const node=(autoApproval?:WorkflowAutoApproval):WorkflowNode=>({id:"approval",type:"APPROVAL",name:"核准",children:["end"],approvalMode:"ANY",approverIds:["11111111-1111-4111-8111-111111111111"],autoApproval});
test("automatic approval is opt-in, closed and accepts either explicit reason",()=>{
  assert.deepEqual(workflowAutoApprovalIssues(node(),schema),[]);
  for(const config of [[],{}, {initiatorIsApprover:false},{initiatorIsApprover:"true"},{initiatorIsApprover:true,script:"yes"},{condition:"yes"},{condition:{operator:"DEFAULT"}}])assert.ok(workflowAutoApprovalIssues(node(config as WorkflowAutoApproval),schema).length);
  assert.deepEqual(workflowAutoApprovalIssues(node({initiatorIsApprover:true}),schema),[]);
  assert.deepEqual(workflowAutoApprovalIssues(node({condition:{operator:"AND",conditions:[{fieldId:"amount",operator:"LT",value:10},{fieldId:"note",operator:"NOT_EMPTY"}]}}),schema),[]);
});
test("human-input requirements and non-approval nodes reject auto approval",()=>{
  for(const conflicting of [{actionConfig:{requireComment:true}},{actionConfig:{requireSignature:true}},{fieldPermissions:{note:{access:"EDIT" as const}}},{type:"HANDLING" as const},{type:"CC" as const}])assert.ok(workflowAutoApprovalIssues({...node({initiatorIsApprover:true}),...conflicting},schema).length);
  assert.deepEqual(workflowAutoApprovalIssues({...node({initiatorIsApprover:true}),fieldPermissions:{note:{access:"READ"}},actionConfig:{requireRejectSignature:true,allowTransfer:true}},schema),[]);
  assert.ok(workflowAutoApprovalIssues(node({condition:{fieldId:"unknown",operator:"NOT_EMPTY"}}),schema).length);
});
test("auto policy survives graph changes and normal draft validation without altering legacy nodes",()=>{
  const initial=initialWorkflow().tree,added=insertWorkflowNode(initial,initial.rootId,initial.nodes[0].children[0],"APPROVAL",schema);
  added.tree.nodes=added.tree.nodes.map(item=>item.id===added.nodeId?{...item,approverIds:node().approverIds,autoApproval:{initiatorIsApprover:true,condition:{fieldId:"amount",operator:"LT",value:10}}}:item);
  const other=insertWorkflowNode(added.tree,initial.rootId,added.nodeId,"CC",schema),restored=JSON.parse(JSON.stringify(removeWorkflowNode(other.tree,other.nodeId)));
  assert.deepEqual(restored.nodes.find((item:WorkflowNode)=>item.id===added.nodeId).autoApproval,added.tree.nodes.find(item=>item.id===added.nodeId)?.autoApproval);
  assert.deepEqual(validateWorkflow(restored,schema),[]);assert.ok(initial.nodes.every(item=>item.autoApproval===undefined));
});
test("timeline reasons describe a system decision without exposing expressions",()=>{
  assert.equal(workflowAutoApprovalReason("INITIATOR_IS_APPROVER"),"发起人与审批人相同");assert.equal(workflowAutoApprovalReason("RULE_MATCH"),"满足已发布的自动通过条件");assert.equal(workflowAutoApprovalReason("unknown"),"按已发布策略自动通过");
});
