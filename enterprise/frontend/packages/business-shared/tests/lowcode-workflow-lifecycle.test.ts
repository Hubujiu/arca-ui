import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultAppearance, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { initialWorkflow, insertWorkflowNode, removeWorkflowNode, validateWorkflow, type TreeModel } from "../src/lowcode/workflow-model";
import { lifecycleMappingIssues, lifecycleValueField, lifecycleWritable, type LifecycleMappings } from "../src/lowcode/workflow-lifecycle";
const field = (id: string, type: LowcodeField["type"], config: Partial<LowcodeField> = {}): LowcodeField => ({ id, type, label: id, ...config });
const schema: TableSchema = { name: "流程结果", description: "", appearance: defaultAppearance, fields: [field("amount", "number", { minimum: 0, maximum: 100 }), field("state", "select", { required: true, options: ["pending", "approved"], choiceConfig: { displayLabels: { approved: "通过" } } }), field("note", "text"), field("source", "text"), field("readonly", "text", { readOnly: true })] };
function tree(lifecycleMappings?: LifecycleMappings): TreeModel { return { ...initialWorkflow().tree, lifecycleMappings }; }
test("closed lifecycle payloads reject coercion, unknown outcomes, extra keys and duplicate targets", () => {
  for (const config of [[], { DONE: [] }, { constructor: [] }, { toString: [] }, { APPROVED: null }, { APPROVED: [{ fieldId: "note", source: "SCRIPT", value: "code" }] },
    { APPROVED: [{ fieldId: "note", source: "FIXED" }] }, { APPROVED: [{ fieldId: "note", source: "FIXED", value: 1, sourceFieldId: "source" }] },
    { APPROVED: [{ fieldId: "note", source: "FIELD", sourceFieldId: "source", value: null }] }, { APPROVED: [{ fieldId: "note", source: "FIELD", sourceFieldId: 1 }] },
    { APPROVED: [{ fieldId: "note", source: "FIXED", value: "a" }, { fieldId: "note", source: "FIXED", value: "b" }] },
    { APPROVED: Array.from({ length: 21 }, (_, index) => ({ fieldId: `field${index}`, source: "FIXED", value: "a" })) }])
    assert.ok(lifecycleMappingIssues(tree(config as LifecycleMappings), schema).length, JSON.stringify(config));
  assert.deepEqual(lifecycleMappingIssues(tree(), schema), []);
});
test("fixed assignments validate actual field types, required clears and stable choice keys", () => {
  for (const [fieldId, value] of [["amount", "3"], ["amount", -1], ["amount", 101], ["note", []], ["state", null], ["state", "通过"], ["readonly", "attempt"]])
    assert.ok(lifecycleMappingIssues(tree({ APPROVED: [{ fieldId: fieldId as string, source: "FIXED", value }] }), schema).length);
  assert.deepEqual(lifecycleMappingIssues(tree({ APPROVED: [{ fieldId: "amount", source: "FIXED", value: 20 }, { fieldId: "state", source: "FIXED", value: "approved" }, { fieldId: "note", source: "FIXED", value: null }] }), schema), []);
});
test("source mapping requires compatible visible roots and rejects any node-hidden source", () => {
  assert.deepEqual(lifecycleMappingIssues(tree({ REJECTED: [{ fieldId: "note", source: "FIELD", sourceFieldId: "source" }] }), schema), []);
  for (const sourceFieldId of ["missing", "amount"]) assert.ok(lifecycleMappingIssues(tree({ WITHDRAWN: [{ fieldId: "note", source: "FIELD", sourceFieldId }] }), schema).length);
  const restricted = tree({ APPROVED: [{ fieldId: "note", source: "FIELD", sourceFieldId: "source" }] });
  restricted.nodes.push({ id: "approval", name: "审批", type: "APPROVAL", children: [], fieldPermissions: { source: { access: "HIDDEN" } } });
  assert.ok(lifecycleMappingIssues(restricted, schema).length);
  for (const config of [{ readOnly: true }, { hidden: true }, { visibility: "alwaysHidden" }, { visibility: "createHidden" }, { visibleWhen: { fieldId: "amount", operator: "GT", value: 1 } }]) assert.equal(lifecycleWritable(field("note", "text", config as Partial<LowcodeField>)), false);
  for (const type of ["serial", "formula", "subtable", "attachment", "member", "relation"] as const) assert.equal(lifecycleWritable(field("root", type)), false);
});
test("global mappings survive graph edits, JSON save/reload and normal workflow validation", () => {
  const definition = tree({ APPROVED: [{ fieldId: "state", source: "FIXED", value: "approved" }], WITHDRAWN: [{ fieldId: "note", source: "FIELD", sourceFieldId: "source" }] });
  const added = insertWorkflowNode(definition, definition.rootId, definition.nodes[0].children[0], "CC", schema);
  const restored = JSON.parse(JSON.stringify(removeWorkflowNode(added.tree, added.nodeId)));
  assert.deepEqual(restored.lifecycleMappings, definition.lifecycleMappings);assert.deepEqual(validateWorkflow(restored, schema), []);
});
test("fixed value editor removes initialization and cross-field dependencies without mutating schema", () => {
  const original = field("note", "text", { defaultValue: "surprise", defaultConfig: { source: "FIELD", fieldId: "source" }, requiredWhen: { fieldId: "amount", operator: "GT", value: 1 }, warningRules: [] });
  const editor = lifecycleValueField(original);
  assert.equal(editor.defaultValue, undefined);assert.equal(editor.defaultConfig, undefined);assert.equal(editor.requiredWhen, undefined);
  assert.equal(original.defaultValue, "surprise");assert.ok(original.defaultConfig);
});
