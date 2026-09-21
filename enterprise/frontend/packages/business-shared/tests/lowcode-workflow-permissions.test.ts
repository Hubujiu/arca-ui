import assert from "node:assert/strict";
import { test } from "node:test";
import { validateValues, type TableSchema } from "../src/lowcode/field-model";
import { initialWorkflow, insertWorkflowNode, removeWorkflowNode, validateWorkflow, type WorkflowNode } from "../src/lowcode/workflow-model";
import { canEditWorkflowField, mergeWorkflowFieldValues, setWorkflowFieldAccess, workflowDecisionData, workflowFieldPermissionIssues, workflowFieldValues, workflowTaskSchemas, type WorkflowFieldPermissions } from "../src/lowcode/workflow-field-permissions";

const schema: TableSchema = { name: "权限测试", description: "", fields: [
  { id: "name", type: "text", label: "名称", required: true },
  { id: "amount", type: "number", label: "金额" },
  { id: "private", type: "text", label: "隐藏信息" },
  { id: "serial", type: "serial", label: "编号" },
  { id: "formula", type: "formula", label: "公式" },
  { id: "summary", type: "summary", label: "汇总" },
  { id: "lookup", type: "lookup", label: "查询" },
  { id: "readonly", type: "text", label: "只读字段", readOnly: true },
  { id: "heading", type: "heading", label: "标题" },
  { id: "divider", type: "divider", label: "分隔线" },
  { id: "remark", type: "remark", label: "说明文字" },
  { id: "tabs", type: "tabs", label: "标签页" },
  { id: "collapse", type: "collapse", label: "折叠面板" },
  { id: "displayImage", type: "displayImage", label: "展示图片" },
  { id: "chineseAmount", type: "chineseAmount", label: "大写金额" },
  { id: "lines", type: "subtable", label: "明细", subtableConfig: { fields: [{ id: "child", type: "text", label: "子字段" }] } },
] };

function node(type: WorkflowNode["type"] = "APPROVAL", fieldPermissions?: unknown): WorkflowNode {
  return { id: "approval", name: "审批", type, children: ["end"], recipientConfig: { source: "INITIATOR" }, approvalMode: type === "APPROVAL" ? "ANY" : undefined, fieldPermissions: fieldPermissions as WorkflowFieldPermissions };
}

test("node field permissions accept legacy, sparse read defaults and root subtable policies", () => {
  for (const policy of [undefined, null, {}, { name: { access: "READ" } }, { private: { access: "HIDDEN" } }, { name: { access: "EDIT", required: true }, lines: { access: "EDIT", required: false } }])
    assert.deepEqual(workflowFieldPermissionIssues(node("APPROVAL", policy), schema), [], JSON.stringify(policy));
  assert.deepEqual(workflowFieldPermissionIssues(node("HANDLING", { name: { access: "EDIT" } }), schema), []);
  assert.deepEqual(workflowFieldPermissionIssues(node("CC", { name: { access: "READ" }, private: { access: "HIDDEN" } }), schema), []);
});

test("strict permissions reject malformed values, missing or nested IDs and unsupported settings", () => {
  for (const policy of [[], "READ", false, 1, { name: null }, { name: [] }, { name: "EDIT" }, { name: {} }, { name: { access: "write" } }, { name: { access: "toString" } }, { name: { access: "EDIT", required: "true" } }, { name: { access: "READ", required: null } }, { name: { access: "EDIT", expression: "${user}" } }, { child: { access: "EDIT" } }, { "lines.child": { access: "READ" } }, { removed: { access: "READ" } }])
    assert.ok(workflowFieldPermissionIssues(node("APPROVAL", policy), schema).length, JSON.stringify(policy));
});

test("CC cannot edit and read/hidden policies cannot require fields", () => {
  assert.ok(workflowFieldPermissionIssues(node("CC", { name: { access: "EDIT" } }), schema).some((message) => message.includes("抄送")));
  for (const access of ["READ", "HIDDEN"])
    assert.ok(workflowFieldPermissionIssues(node("APPROVAL", { name: { access, required: true } }), schema).some((message) => message.includes("必填")));
  for (const type of ["START", "END", "CONDITION"] as const)
    assert.ok(workflowFieldPermissionIssues(node(type, {}), schema).some((message) => message.includes("只有审批")));
});

test("read-only, serial, computed and decorative fields cannot be granted edit access", () => {
  const ids = ["serial", "formula", "summary", "lookup", "readonly", "heading", "divider", "remark", "tabs", "collapse", "displayImage", "chineseAmount"];
  for (const field of schema.fields) {
    assert.equal(canEditWorkflowField(field), !ids.includes(field.id), field.id);
    if (ids.includes(field.id)) {
      assert.ok(workflowFieldPermissionIssues(node("APPROVAL", { [field.id]: { access: "EDIT" } }), schema).length, field.id);
      assert.deepEqual(workflowFieldPermissionIssues(node("APPROVAL", { [field.id]: { access: "HIDDEN" } }), schema), []);
    }
  }
});

test("permission changes clear incompatible required state and preserve other fields without mutation", () => {
  const original: WorkflowFieldPermissions = { name: { access: "EDIT", required: true }, private: { access: "HIDDEN" } };
  const snapshot = structuredClone(original);
  for (const access of ["READ", "HIDDEN"] as const) {
    const next = setWorkflowFieldAccess(original, "name", access);
    assert.deepEqual(next.name, { access });
    assert.deepEqual(next.private, original.private);
  }
  assert.deepEqual(setWorkflowFieldAccess(original, "name", "EDIT").name, original.name);
  assert.deepEqual(original, snapshot);
});

test("policies round-trip through JSON and survive graph edits; invalid policies block validation", () => {
  const base = initialWorkflow().tree;
  const inserted = insertWorkflowNode(base, base.rootId, base.nodes[1].id, "APPROVAL", schema);
  const approval = inserted.tree.nodes.find((entry) => entry.id === inserted.nodeId)!;
  approval.recipientConfig = { source: "INITIATOR" };
  approval.fieldPermissions = { name: { access: "EDIT", required: true }, private: { access: "HIDDEN" } };
  assert.deepEqual(validateWorkflow(inserted.tree, schema), []);
  const saved = JSON.parse(JSON.stringify(inserted.tree));
  assert.deepEqual(saved, inserted.tree);
  const next = insertWorkflowNode(saved, saved.rootId, approval.id, "HANDLING", schema);
  assert.deepEqual(removeWorkflowNode(next.tree, next.nodeId), saved);
  approval.fieldPermissions.name = { access: "READ", required: true };
  assert.ok(validateWorkflow(inserted.tree, schema).some((issue) => issue.nodeId === approval.id && issue.message.includes("必填")));
});

test("task schemas keep read-only computed snapshots separate from editable required fields", () => {
  const snapshot = structuredClone(schema);
  const permissions: WorkflowFieldPermissions = { name: { access: "READ" }, amount: { access: "EDIT", required: true }, private: { access: "HIDDEN" }, formula: { access: "EDIT" } };
  const { readSchema, editSchema } = workflowTaskSchemas(schema, permissions);
  assert.deepEqual(editSchema.fields.map((field) => field.id), ["amount"]);
  assert.equal(editSchema.fields[0].required, true);
  assert.equal(editSchema.fields[0].readOnly, false);
  assert.ok(readSchema.fields.some((field) => field.id === "formula"));
  assert.ok(!readSchema.fields.some((field) => field.id === "private"));
  assert.deepEqual(schema, snapshot);
  // Projected computed fields may lack dependency configs; they must not block input validation.
  assert.deepEqual(validateValues(editSchema, { amount: 2 }), {});
  assert.equal(validateValues(editSchema, {}).amount, "请填写金额");
  assert.equal(workflowTaskSchemas(schema, { name: { access: "EDIT", required: false } }).editSchema.fields[0].required, true, "节点设置不能取消表单必填要求");
});

test("task edit data contains only grants, preserves clearing and protects hidden/read snapshot values", () => {
  const permissions: WorkflowFieldPermissions = { amount: { access: "EDIT" }, private: { access: "HIDDEN" }, name: { access: "READ" }, formula: { access: "EDIT" } };
  const { editSchema } = workflowTaskSchemas(schema, permissions);
  const original = { name: "申请人", amount: 12, private: "机密", formula: 24 };
  assert.deepEqual(workflowFieldValues(editSchema, original), { amount: 12 });
  const edited = mergeWorkflowFieldValues(editSchema, original, { name: "伪造", private: "伪造", unrelated: true });
  assert.deepEqual(edited, { ...original, amount: undefined });
  assert.deepEqual(workflowDecisionData(schema, permissions, edited), { amount: null });
  assert.deepEqual(workflowDecisionData(schema, permissions, { ...edited, amount: 0 }), { amount: 0 });
  assert.deepEqual(workflowDecisionData(schema, {}, original), {});
});

test("record presentation and layout settings cannot block validating the editable task fragment", () => {
  const complete:TableSchema={name:"费用",description:"",fields:[{id:"title",label:"申请",type:"text"},{id:"body",label:"说明",type:"richtext"}],titleFieldId:"title",
    printConfig:{fieldIds:["title"],columns:1,orientation:"portrait",showMetadata:true},layouts:[{id:"vertical",name:"纵向",columns:1,fieldOrder:["title","body"]}],defaultLayoutId:"vertical"};
  const before=structuredClone(complete),parts=workflowTaskSchemas(complete,{title:{access:"READ"},body:{access:"EDIT",required:true}});
  assert.deepEqual(validateValues(parts.editSchema,{body:"已核对"}),{});
  assert.equal(validateValues(parts.editSchema,{}).body,"请填写说明");
  assert.equal(parts.readSchema.titleFieldId,"title");
  assert.deepEqual(complete,before);
});
