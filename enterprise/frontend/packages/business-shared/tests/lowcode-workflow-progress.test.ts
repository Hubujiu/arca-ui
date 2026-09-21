import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Run, Task } from "../src/lowcode/model";
import { WorkflowApprovalProgress } from "../../../modules/workflow/src/features/workflow/WorkflowApprovalProgress";
import { workflowActorTask, workflowDecisionNotice } from "../src/lowcode/workflow-progress";

const task = (id: string, assigneeId?: string, candidateIds: string[] = []): Task => ({
  taskId: id, nodeId: "parallel", name: "审批", type: "APPROVAL", assigneeId, candidateIds,
});
const progress: NonNullable<Run["approvalProgress"]> = {
  groupId: "entry-1", mode: "VOTE", total: 5, approved: 1, rejected: 1, pending: 3,
  requiredApprovals: 3, outcome: "PENDING",
};
const run: Run = {
  id: "run", revision: 1, status: "PENDING", canAct: true,
  tasks: [task("first", "first-person"), task("mine", "me"), task("third", "third-person")],
  visits: [], events: [], returnTargets: [], approvalProgress: progress,
};

test("task selection locates the viewer across parallel tasks and never substitutes someone else's sole task", () => {
  assert.equal(workflowActorTask(run, "me")?.taskId, "mine");
  assert.equal(workflowActorTask(run, "outsider"), undefined);
  assert.equal(workflowActorTask({ ...run, tasks: [task("foreign", "other")] }, "me"), undefined);
  assert.equal(workflowActorTask({ ...run, canAct: false }, "me"), undefined);
  assert.equal(workflowActorTask(run, undefined), undefined);
  assert.equal(workflowActorTask({ ...run, tasks: [task("legacy", undefined, ["me"])] }, "me")?.taskId, "legacy");
});

test("partial rejection and approval notices describe the returned business status without claiming termination", () => {
  assert.match(workflowDecisionNotice("REJECT", "PENDING"), /拒绝意见已记录.*等待其他成员/);
  assert.equal(workflowDecisionNotice("REJECT", "REJECTED"), "当前流程已拒绝");
  assert.match(workflowDecisionNotice("APPROVE", "PENDING"), /同意意见已记录.*处理中/);
  assert.equal(workflowDecisionNotice("APPROVE", "APPROVED"), "当前流程已通过");
  assert.equal(workflowDecisionNotice("APPROVE", "PENDING", true), "本次办理已完成");
  assert.equal(workflowDecisionNotice("RETURN"), "当前流程已退回");
});

test("rendered progress displays mode, snapshot denominator, threshold and every vote count", () => {
  const html = renderToStaticMarkup(createElement(WorkflowApprovalProgress, { progress }));
  assert.match(html, /投票/);
  assert.match(html, /共 5 人/);
  assert.match(html, /本次需要 3 人同意通过/);
  assert.match(html, /已同意<\/dt><dd[^>]*>1<\/dd>/);
  assert.match(html, /已拒绝<\/dt><dd[^>]*>1<\/dd>/);
  assert.match(html, /待处理<\/dt><dd[^>]*>3<\/dd>/);
  assert.match(html, /aria-valuenow="1"/);
  assert.match(html, /aria-valuemax="3"/);
  const refreshed = renderToStaticMarkup(createElement(WorkflowApprovalProgress, { progress: { ...progress, approved: 2, pending: 2 } }));
  assert.match(refreshed, /aria-valuenow="2"/);
  assert.match(refreshed, /待处理<\/dt><dd[^>]*>2<\/dd>/);
  assert.equal(renderToStaticMarkup(createElement(WorkflowApprovalProgress, {})), "");
});
