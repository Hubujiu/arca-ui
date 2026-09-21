import assert from "node:assert/strict";
import { test } from "node:test";
import type { Directory } from "../src/organization/model";
import type { TableSchema } from "../src/lowcode/field-model";
import {
  approvalModeLabels, changeWorkflowApprovalMode, initialWorkflow, insertWorkflowNode,
  validateWorkflow, workflowRecipientSummary, workflowVoteRequired,
  type WorkflowApprovalMode,
} from "../src/lowcode/workflow-model";

const person = "11111111-1111-1111-1111-111111111111";
const schema: TableSchema = { name: "Parallel", description: "", fields: [] };
const directory: Directory = { units: [], positions: [], people: [
  { id: person, username: "first", displayName: "张三", enabled: true, loginBound: true, systemRole: "USER" },
] };
function fixture() {
  const base = initialWorkflow().tree;
  const added = insertWorkflowNode(base, base.rootId, base.nodes[1].id, "APPROVAL", schema);
  const node = added.tree.nodes.find((entry) => entry.id === added.nodeId)!;
  node.approverIds = [person];
  return { tree: added.tree, node };
}

test("parallel modes validate for both fixed and dynamic rosters while legacy modes remain supported", () => {
  for (const mode of Object.keys(approvalModeLabels) as WorkflowApprovalMode[]) {
    const { tree, node } = fixture();
    Object.assign(node, changeWorkflowApprovalMode(node, mode));
    assert.deepEqual(validateWorkflow(tree, schema, directory), [], mode);
    node.approverIds = [];
    node.recipientConfig = { source: "INITIATOR_MANAGER" };
    assert.deepEqual(validateWorkflow(tree, schema, directory), [], `${mode} dynamic`);
  }
});

test("switching modes supplies a vote default and clears stale thresholds without changing recipients or field policies", () => {
  const { node } = fixture();
  node.fieldPermissions = { amount: { access: "EDIT", required: true } };
  const before = structuredClone(node);
  assert.deepEqual(changeWorkflowApprovalMode(node, "VOTE"), { approvalMode: "VOTE", voteThreshold: 51 });
  assert.deepEqual(node, before);
  node.voteThreshold = 75;
  assert.equal(changeWorkflowApprovalMode(node, "VOTE").voteThreshold, 75);
  for (const mode of ["ANY", "ALL", "PARALLEL_ALL", "RACE"] as const)
    assert.deepEqual(changeWorkflowApprovalMode(node, mode), { approvalMode: mode, voteThreshold: undefined });
});

test("vote threshold rejects missing, fractional, coerced and out-of-range percentages", () => {
  for (const percent of [undefined, null, 0, -1, 101, 50.5, "51", true, NaN, Infinity]) {
    const { tree, node } = fixture();
    node.approvalMode = "VOTE";
    node.voteThreshold = percent as number;
    assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("整数百分比")), String(percent));
  }
  const { tree, node } = fixture();
  node.voteThreshold = 50;
  assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("只有投票")));
});

test("vote preview rounds up from entry roster count and summaries identify every mode", () => {
  assert.equal(workflowVoteRequired(3, 51), 2);
  assert.equal(workflowVoteRequired(3, 67), 3);
  assert.equal(workflowVoteRequired(20, 1), 1);
  assert.equal(workflowVoteRequired(1, 100), 1);
  for (const mode of Object.keys(approvalModeLabels) as WorkflowApprovalMode[]) {
    const { node } = fixture();
    Object.assign(node, changeWorkflowApprovalMode(node, mode));
    const summary = workflowRecipientSummary(node, schema, directory);
    assert.ok(summary.includes(approvalModeLabels[mode]), mode);
    assert.ok(summary.includes("张三"));
    if (mode === "VOTE") assert.ok(summary.includes("≥51%"));
  }
});
