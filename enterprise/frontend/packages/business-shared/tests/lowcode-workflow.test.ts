import assert from "node:assert/strict";
import { test } from "node:test";
import type { TableSchema } from "../src/lowcode/field-model";
import type { Directory } from "../src/organization/model";
import { ruleMatches, type Rule } from "../src/lowcode/rules";
import {
  addWorkflowBranch,
  conditionLabel,
  conditionOperators,
  initialWorkflow,
  insertWorkflowNode,
  removeWorkflowBranch,
  removeWorkflowNode,
  validateWorkflow,
} from "../src/lowcode/workflow-model";

const personId = "11111111-1111-1111-1111-111111111111";
const departmentId = "22222222-2222-2222-2222-222222222222";
const positionId = "33333333-3333-3333-3333-333333333333";
const schema: TableSchema = {
  name: "办理测试", description: "", fields: [
    { id: "score", type: "rating", label: "评分" },
    { id: "clock", type: "time", label: "时间" },
    { id: "seconds", type: "time", timePrecision: "second", label: "秒时间" },
    { id: "department", type: "department", label: "部门" },
    { id: "departments", type: "departments", label: "多个部门" },
    { id: "position", type: "position", label: "岗位" },
    { id: "positions", type: "positions", label: "多个岗位" },
    { id: "image", type: "image", label: "图片" },
    { id: "attachment", type: "attachment", label: "附件" },
  ],
};
const directory: Directory = {
  units: [{ id: departmentId, name: "财务部", kind: "DEPARTMENT" }],
  positions: [{ id: positionId, name: "会计" }],
  people: [{ id: personId, displayName: "张三", username: "zhangsan", enabled: true, loginBound: true, systemRole: "USER" }],
};

test("handling insertion and deletion preserve a branch predicate without mutating input", () => {
  const base = initialWorkflow().tree;
  const baseSnapshot = structuredClone(base);
  const end = base.nodes.find((node) => node.type === "END")!;
  const gate = insertWorkflowNode(base, base.rootId, end.id, "CONDITION", schema);
  assert.deepEqual(base, baseSnapshot);
  const branch = gate.tree.nodes.find((node) => node.condition && node.condition.operator !== "DEFAULT")!;
  const snapshot = structuredClone(gate.tree);
  const added = insertWorkflowNode(gate.tree, gate.nodeId, branch.id, "HANDLING", schema);
  const handling = added.tree.nodes.find((node) => node.id === added.nodeId)!;
  assert.equal(handling.type, "HANDLING");
  assert.deepEqual(handling.approverIds, []);
  assert.equal(handling.approvalMode, undefined);
  assert.deepEqual(handling.condition, branch.condition);
  assert.equal(added.tree.nodes.find((node) => node.id === branch.id)!.condition, undefined);
  assert.deepEqual(gate.tree, snapshot);
  assert.ok(validateWorkflow(added.tree, schema, directory).some((issue) => issue.message.includes("办理人")));
  handling.approverIds = [personId];
  assert.deepEqual(validateWorkflow(added.tree, schema, directory), []);
  assert.deepEqual(removeWorkflowNode(added.tree, handling.id), gate.tree);
  assert.deepEqual(gate.tree, snapshot);
});

test("removing a condition keeps its default handling subtree and later branch insertion stays valid", () => {
  const base = initialWorkflow().tree;
  const end = base.nodes.find((node) => node.type === "END")!;
  const handled = insertWorkflowNode(base, base.rootId, end.id, "HANDLING", schema);
  handled.tree.nodes.find((node) => node.id === handled.nodeId)!.approverIds = [personId];
  const gate = insertWorkflowNode(handled.tree, base.rootId, handled.nodeId, "CONDITION", schema);
  const addedBranch = addWorkflowBranch(gate.tree, gate.nodeId, schema);
  const snapshot = structuredClone(addedBranch.tree);
  const reduced = removeWorkflowBranch(addedBranch.tree, addedBranch.nodeId);
  assert.deepEqual(addedBranch.tree, snapshot);
  assert.deepEqual(removeWorkflowNode(reduced, gate.nodeId), handled.tree);
});

test("handling rejects duplicate, disabled and unbound people and cannot declare an approval mode", () => {
  const tree = initialWorkflow().tree;
  const inserted = insertWorkflowNode(tree, tree.rootId, tree.nodes[1].id, "HANDLING", schema);
  const handling = inserted.tree.nodes.find((node) => node.id === inserted.nodeId)!;
  handling.approverIds = [personId, personId];
  assert.ok(validateWorkflow(inserted.tree, schema, directory).some((issue) => issue.message.includes("重复")));
  handling.approverIds = [personId];
  handling.approvalMode = "ANY";
  assert.ok(validateWorkflow(inserted.tree, schema, directory).some((issue) => issue.message.includes("不能设置审批方式")));
  delete handling.approvalMode;
  for (const person of [{ ...directory.people[0], enabled: false }, { ...directory.people[0], loginBound: false }])
    assert.ok(validateWorkflow(inserted.tree, schema, { ...directory, people: [person] }).some((issue) => issue.message.includes("未绑定账号")));
});

test("new field predicates expose only matching operators, labels and comparison values", () => {
  for (const name of ["score", "clock", "seconds"])
    assert.ok(conditionOperators(schema.fields.find((field) => field.id === name)).includes("GT"));
  for (const name of ["departments", "positions"])
    assert.deepEqual(conditionOperators(schema.fields.find((field) => field.id === name)), ["CONTAINS", "EMPTY", "NOT_EMPTY"]);
  for (const name of ["department", "position"])
    assert.deepEqual(conditionOperators(schema.fields.find((field) => field.id === name)), ["EQ", "NE", "EMPTY", "NOT_EMPTY"]);
  for (const name of ["image", "attachment"])
    assert.deepEqual(conditionOperators(schema.fields.find((field) => field.id === name)), ["EMPTY", "NOT_EMPTY"]);
  assert.equal(conditionLabel({ fieldId: "department", operator: "EQ", value: departmentId }, schema, directory), "部门 等于 财务部");
  assert.equal(conditionLabel({ fieldId: "position", operator: "EQ", value: positionId }, schema, directory), "岗位 等于 会计");
  const base = initialWorkflow().tree;
  const gate = insertWorkflowNode(base, base.rootId, base.nodes[1].id, "CONDITION", schema).tree;
  const branch = gate.nodes.find((node) => node.condition && node.condition.operator !== "DEFAULT")!;
  for (const [fieldId, value] of [["clock", "09:30"], ["seconds", "09:30:01"]]) {
    branch.condition = { fieldId, operator: "GT", value };
    assert.deepEqual(validateWorkflow(gate, schema, directory), []);
  }
  for (const [fieldId, value] of [["clock", "24:00"], ["clock", "09:30:01"], ["seconds", "09:30"]]) {
    branch.condition = { fieldId, operator: "EQ", value };
    assert.ok(validateWorkflow(gate, schema, directory).length > 0);
  }
  branch.condition = { fieldId: "department", operator: "EQ", value: positionId };
  assert.ok(validateWorkflow(gate, schema, directory).some((issue) => issue.message.includes("有效的部门或岗位")));
});

test("compound predicates survive insert/remove and use shared field comparisons", () => {
  const config: TableSchema = { ...schema, fields: [...schema.fields,
    { id: "budget", label: "预算", type: "number" },
    { id: "limit", label: "额度", type: "number" },
    { id: "note", label: "说明", type: "text" },
  ] };
  const predicate: Rule = { operator: "AND", conditions: [
    { fieldId: "budget", operator: "GT", valueFieldId: "limit" },
    { operator: "OR", conditions: [
      { fieldId: "score", operator: "GTE", value: 4 },
      { fieldId: "note", operator: "NOT_EMPTY" },
    ] },
  ] };
  const base = initialWorkflow().tree;
  const gate = insertWorkflowNode(base, base.rootId, base.nodes[1].id, "CONDITION", config);
  const branch = gate.tree.nodes.find((node) => node.condition?.operator !== "DEFAULT" && node.condition)!;
  branch.condition = predicate;
  const snapshot = structuredClone(gate.tree);
  const insertion = insertWorkflowNode(gate.tree, gate.nodeId, branch.id, "HANDLING", config);
  assert.deepEqual(gate.tree, snapshot);
  const handler = insertion.tree.nodes.find((node) => node.id === insertion.nodeId)!;
  handler.approverIds = [personId];
  assert.deepEqual(handler.condition, predicate);
  assert.deepEqual(validateWorkflow(insertion.tree, config, directory), []);
  assert.deepEqual(removeWorkflowNode(insertion.tree, handler.id), gate.tree);
  assert.ok(conditionLabel(predicate, config, directory).includes("额度"));
  assert.equal(ruleMatches(predicate, { budget: 12, limit: 10, score: 4 }, config.fields), true);
  assert.equal(ruleMatches(predicate, { budget: 12, limit: 10, score: 0, note: "已说明" }, config.fields), true);
  assert.equal(ruleMatches(predicate, { budget: 12, limit: "10", score: 4 }, config.fields), false);
  assert.equal(ruleMatches(predicate, { budget: 12, score: 4 }, config.fields), false);
  assert.ok(validateWorkflow(gate.tree, { ...config, fields: config.fields.filter((field) => field.id !== "limit") }, directory).length > 0);
});

test("nested DEFAULT, mixed structures, excessive depth and node counts cannot enter a graph edit", () => {
  const base = initialWorkflow().tree;
  const gate = insertWorkflowNode(base, base.rootId, base.nodes[1].id, "CONDITION", schema).tree;
  const branch = gate.nodes.find((node) => node.condition && node.condition.operator !== "DEFAULT")!;
  const leaf: Rule = { fieldId: "score", operator: "NOT_EMPTY" };
  const invalid = [
    { operator: "AND", conditions: [{ operator: "DEFAULT" }] },
    { operator: "AND", fieldId: "score", conditions: [leaf] },
    { fieldId: "score", operator: "EQ", value: 1, valueFieldId: "score" },
    { operator: "OR", conditions: [] },
    { operator: "OR", conditions: Array(9).fill(leaf) },
  ];
  let deep: Rule = leaf;
  for (let i = 0; i < 4; i++) deep = { operator: "AND", conditions: [deep] };
  invalid.push(deep as (typeof invalid)[number]);
  invalid.push({ operator: "AND", conditions: Array.from({ length: 4 }, () => ({ operator: "OR", conditions: Array(8).fill(leaf) })) } as (typeof invalid)[number]);
  for (const rule of invalid) {
    branch.condition = rule as Rule;
    assert.ok(validateWorkflow(gate, schema, directory).some((issue) => issue.structural));
    assert.throws(() => insertWorkflowNode(gate, gate.rootId, gate.nodes.find((node) => node.type === "CONDITION")!.id, "CC", schema));
  }
});
