import assert from "node:assert/strict";
import { test } from "node:test";
import { workflowActionIssues, workflowActionPolicy, validateWorkflow, type WorkflowNode, type WorkflowActionConfig, type TreeModel } from "../src/lowcode/workflow-model";
import { workflowActorTask } from "../src/lowcode/workflow-progress";
import type { Run } from "../src/lowcode/model";

test("processing rule payloads reject coercion, extra keys and unbounded deadlines", () => {
  for (const config of [{ allowTransfer: "true" }, { requireSignature: 1 }, { unknown: true }, { deadlineHours: 1.5 }, { deadlineHours: 0 }, { deadlineHours: 8761 }])
    assert.ok(workflowActionIssues({ type: "APPROVAL", actionConfig: config as WorkflowActionConfig }).length);
  assert.deepEqual(workflowActionIssues({ type: "HANDLING", actionConfig: { allowAddSign: true, requireComment: true, requireSignature: true, deadlineHours: 8760 } }), []);
  for (const type of ["CC", "START", "CONDITION", "END"] as WorkflowNode["type"][])
    assert.ok(workflowActionIssues({ type, actionConfig: { allowTransfer: false } }).length);
});

test("save/reload keeps action rules while legacy workflows retain optional behavior", () => {
  const first: WorkflowNode = { id: "first", type: "APPROVAL", name: "审批", children: ["end"], approverIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"], approvalMode: "ANY", actionConfig: { allowTransfer: true, allowAddSign: true, requireComment: true, requireSignature: true, deadlineHours: 24 } };
  const tree: TreeModel = { rootId: "start", nodes: [{ id: "start", type: "START", name: "发起", children: ["first"] }, first, { id: "end", type: "END", name: "结束", children: [] }] };
  const restored = JSON.parse(JSON.stringify(tree));
  assert.deepEqual(validateWorkflow(restored), []);
  assert.deepEqual(restored.nodes[1].actionConfig, first.actionConfig);
  delete restored.nodes[1].actionConfig;
  assert.deepEqual(validateWorkflow(restored), []);
});

test("an explicit transferred assignee supersedes old candidate membership", () => {
  const run = { canAct: true, tasks: [{ taskId: "stable-task", nodeId: "first", name: "审批", type: "APPROVAL", assigneeId: "new", candidateIds: ["old"] }] } as Run;
  assert.equal(workflowActorTask(run, "old"), undefined);
  assert.equal(workflowActorTask(run, "new")?.taskId, "stable-task");
});

test("legacy action policy and independent rejection signatures preserve decision semantics", () => {
  const legacy = workflowActionPolicy("APPROVAL");
  assert.equal(legacy.allowReject, true); assert.equal(legacy.allowReturn, true);
  assert.equal(legacy.approveLabel, "同意"); assert.equal(legacy.signatureRequired("REJECT"), false);
  const restricted = workflowActionPolicy("APPROVAL", { allowReject: false, allowReturn: false, requireRejectSignature: true, approveLabel: "核准预算", rejectLabel: "不予核准", returnLabel: "补充资料" });
  assert.equal(restricted.allowReject, false); assert.equal(restricted.allowReturn, false);
  assert.equal(restricted.approveLabel, "核准预算"); assert.equal(restricted.rejectLabel, "不予核准"); assert.equal(restricted.returnLabel, "补充资料");
  assert.equal(restricted.signatureRequired("REJECT"), true); assert.equal(restricted.signatureRequired("APPROVE"), false);
  for (const action of ["RETURN", "REMIND", "TRANSFER", "ADD_SIGN", undefined]) assert.equal(restricted.signatureRequired(action), false);
  const handling = workflowActionPolicy("HANDLING", { requireSignature: true });
  assert.equal(handling.allowReject, false); assert.equal(handling.allowReturn, false); assert.equal(handling.approveLabel, "完成办理");
  assert.equal(handling.signatureRequired("APPROVE"), true);
});

test("action labels and stages accept only bounded plain text and approval-only controls", () => {
  for (const config of [{ allowReject: "false" }, { requireRejectSignature: 1 }, { approveLabel: "" }, { rejectLabel: "a".repeat(17) }, { returnLabel: "<b>退回</b>" }, { stageName: "a\nname" }, { stageName: "a\u202ename" }, { stageName: "审".repeat(41) }, { stageName: " 审批" }, { keyStage: true }, { approveLabel: 1 }])
    assert.ok(workflowActionIssues({ type: "APPROVAL", actionConfig: config as WorkflowActionConfig }).length, JSON.stringify(config));
  const config: WorkflowActionConfig = { allowReject: false, allowReturn: false, requireRejectSignature: true, approveLabel: "核准", rejectLabel: "不同意", returnLabel: "补资料", stageName: "预算核准", keyStage: true };
  assert.deepEqual(workflowActionIssues({ type: "APPROVAL", actionConfig: JSON.parse(JSON.stringify(config)) }), []);
  assert.deepEqual(workflowActionIssues({ type: "APPROVAL", actionConfig: { approveLabel: "😀".repeat(16), stageName: "😀".repeat(40) } }), []);
  for (const actionConfig of [{ allowReject: false }, { allowReturn: true }, { requireRejectSignature: false }, { rejectLabel: "拒绝" }, { returnLabel: "退回" }])
    assert.ok(workflowActionIssues({ type: "HANDLING", actionConfig }).length);
  assert.deepEqual(workflowActionIssues({ type: "HANDLING", actionConfig: { approveLabel: "登记完成", stageName: "归档登记", keyStage: true } }), []);
});
