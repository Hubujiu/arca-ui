import assert from "node:assert/strict";
import { test } from "node:test";
import { createdRelation } from "../src/lowcode/relation-create";
import { relationEditResult } from "../src/lowcode/relation-edit";
import { statuses } from "../src/lowcode/model";

const changeId = "11111111-2222-4333-8444-555555555555";
const recordId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("a submitted record remains attachable while its independent workflow is pending or terminal", () => {
  for (const status of ["PENDING", "REJECTED", "WITHDRAWN", "START_FAILED", "FAILED", "APPROVED"]) {
    assert.deepEqual(
      createdRelation({ id: changeId, recordId, status, persistedRevision: 1 } as Parameters<typeof createdRelation>[0]),
      { kind: "ready", recordId },
      status,
    );
  }
});

test("a workflow response without the persisted record revision remains refreshable but is not attachable", () => {
  assert.deepEqual(createdRelation({ id: changeId, recordId, status: "PENDING" }), {
    kind: "pending",
    changeId,
  });
});

test("a draft without a persisted record remains a pending change and never becomes a relation", () => {
  assert.deepEqual(createdRelation({ id: changeId, status: "DRAFT" }), {
    kind: "pending",
    changeId,
  });
  assert.deepEqual(createdRelation({ id: changeId, status: "REJECTED" }), {
    kind: "unavailable",
  });
});

test("workflow and execution outcomes have distinct user-facing labels", () => {
  assert.equal(statuses.PENDING, "审批中");
  assert.equal(statuses.REJECTED, "已拒绝");
  assert.equal(statuses.WITHDRAWN, "已撤回");
  assert.equal(statuses.START_FAILED, "启动失败");
  assert.equal(statuses.FAILED, "执行失败");
});

test("an immediately persisted edit is ready in the relation view regardless of workflow outcome", () => {
  for (const status of ["PENDING", "REJECTED", "WITHDRAWN", "START_FAILED", "FAILED", "APPROVED"]) {
    assert.equal(
      relationEditResult({ status, recordId, persistedRevision: 2 }, { id: recordId, revision: 2 }, 1),
      "ready",
      status,
    );
  }
});
