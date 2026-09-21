import assert from "node:assert/strict";
import { test } from "node:test";
import type { Directory } from "../src/organization/model";
import type { TableSchema } from "../src/lowcode/field-model";
import {
  changeWorkflowRecipientSource,
  initialWorkflow,
  insertWorkflowNode,
  recipientFields,
  removeWorkflowNode,
  validateWorkflow,
  workflowRecipientSummary,
  workflowRecipientPolicyIssues,
  type InsertableNodeType,
  type WorkflowNode,
  type WorkflowRecipientConfig,
  type WorkflowRecipientSource,
  type WorkflowRecipientPolicy,
} from "../src/lowcode/workflow-model";

const personId = "aaaaaaaa-1111-1111-1111-111111111111";
const departmentId = "bbbbbbbb-2222-2222-2222-222222222222";
const positionId = "cccccccc-3333-3333-3333-333333333333";
const companyId = "dddddddd-4444-4444-4444-444444444444";
const teamId = "eeeeeeee-5555-5555-5555-555555555555";
const directory: Directory = {
  units: [
    { id: companyId, name: "测试公司", kind: "COMPANY" },
    { id: departmentId, name: "财务部", kind: "DEPARTMENT", parentId: companyId },
    { id: teamId, name: "核算组", kind: "TEAM", parentId: departmentId },
  ],
  positions: [{ id: positionId, name: "会计" }],
  people: [{ id: personId, username: "member", displayName: "张三", enabled: true, loginBound: true, systemRole: "USER" }],
};
const schema: TableSchema = { name: "动态人员测试", description: "", fields: [
  { id: "owner", label: "负责人", type: "member" },
  { id: "reviewers", label: "复核成员", type: "members" },
  { id: "text", label: "姓名文本", type: "text" },
  { id: "department", label: "部门", type: "department" },
  { id: "relation", label: "关联", type: "relation" },
  { id: "lines", label: "明细", type: "subtable", subtableConfig: { fields: [{ id: "nested", label: "子表成员", type: "member" }] } },
] };

function fixture(type: InsertableNodeType = "APPROVAL", recipientConfig?: WorkflowRecipientConfig | null) {
  const base = initialWorkflow().tree;
  const inserted = insertWorkflowNode(base, base.rootId, base.nodes[1].id, type, schema);
  const node = inserted.tree.nodes.find((entry) => entry.id === inserted.nodeId)!;
  node.recipientConfig = recipientConfig;
  return { tree: inserted.tree, node };
}
const messages = (config: unknown) => {
  const { tree } = fixture("APPROVAL", config as WorkflowRecipientConfig);
  return validateWorkflow(tree, schema, directory).map((issue) => issue.message);
};

test("recipient policies stay closed and only explicit fallback permits empty fixed lists", () => {
  for(const type of ["APPROVAL","HANDLING","CC"] as const) {
    const {tree,node}=fixture(type);
    assert.ok(validateWorkflow(tree,schema,directory).length);
    node.recipientPolicy={empty:"ERROR",samePerson:"KEEP"};assert.ok(validateWorkflow(tree,schema,directory).length);
    node.recipientPolicy={empty:"INITIATOR",samePerson:"REMOVE_INITIATOR"};assert.deepEqual(validateWorkflow(tree,schema,directory),[]);
    node.recipientPolicy={empty:"FIXED",fallbackIds:[personId],samePerson:"REMOVE_INITIATOR"};assert.deepEqual(validateWorkflow(tree,schema,directory),[]);
    assert.deepEqual(validateWorkflow(JSON.parse(JSON.stringify(tree)),schema,directory),[]);
    assert.match(workflowRecipientSummary(node,schema,directory),/空名单交指定成员/);
  }
  for(const policy of [[],"ERROR",{empty:"SKIP"},{samePerson:true},{samePerson:"AUTO_APPROVE"},{empty:"INITIATOR",fallbackIds:[]},{empty:"FIXED"},{empty:"FIXED",fallbackIds:[personId,personId]},{empty:"FIXED",fallbackIds:Array(21).fill(personId)},{empty:"ERROR",expression:"${skip}"}])
    assert.ok(workflowRecipientPolicyIssues({type:"APPROVAL",recipientPolicy:policy as WorkflowRecipientPolicy},directory).length,JSON.stringify(policy));
  assert.ok(workflowRecipientPolicyIssues({type:"START",recipientPolicy:{empty:"INITIATOR"}},directory).length);
  assert.ok(workflowRecipientPolicyIssues({type:"CC",recipientPolicy:{empty:"FIXED",fallbackIds:[personId]}},{...directory,people:directory.people.map(person=>({...person,loginBound:false}))}).length);
  for(const source of ["OWNER","COLLABORATORS"] as const)assert.deepEqual(changeWorkflowRecipientSource(source).recipientConfig,{source});
});

test("all dynamic sources support approval, handling and copies without fixed recipients", () => {
  const configs: WorkflowRecipientConfig[] = [
    { source: "INITIATOR" }, { source: "INITIATOR_MANAGER" }, { source: "INITIATOR_DEPARTMENT_LEADER" }, {source:"OWNER"}, {source:"COLLABORATORS"}, { source: "FIELD", fieldId: "owner" }, { source: "FIELD", fieldId: "reviewers" },
    { source: "DEPARTMENT", departmentIds: [departmentId] },
    { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: true },
    { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: false },
    { source: "POSITION", positionIds: [positionId] },
  ];
  for (const type of ["APPROVAL", "HANDLING", "CC"] as const) for (const config of configs) {
    const { tree, node } = fixture(type, config);
    assert.deepEqual(validateWorkflow(tree, schema, directory), [], `${type}: ${JSON.stringify(config)}`);
    if (type === "APPROVAL") {
      node.approvalMode = "ALL";
      assert.deepEqual(validateWorkflow(tree, schema, directory), []);
    }
  }
});

test("legacy fixed recipients accept omitted and serialized null config and preserve approval modes", () => {
  for (const recipientConfig of [undefined, null]) for (const type of ["APPROVAL", "HANDLING", "CC"] as const) {
    const { tree, node } = fixture(type, recipientConfig);
    if (type === "CC") node.ccIds = [personId]; else node.approverIds = [personId];
    if (type === "APPROVAL") node.approvalMode = "ALL";
    assert.deepEqual(validateWorkflow(tree, schema, directory), []);
    assert.ok(workflowRecipientSummary(node, schema, directory).includes("张三"));
    if (type === "APPROVAL") assert.ok(workflowRecipientSummary(node, schema, directory).includes("顺序审批"));
  }
});

test("only root-level member and members fields are eligible in the supplied fixed schema", () => {
  assert.deepEqual(recipientFields(schema).map((field) => field.id), ["owner", "reviewers"]);
  for (const fieldId of ["text", "department", "relation", "lines", "nested", "lines.nested", "missing", "", "  "])
    assert.ok(messages({ source: "FIELD", fieldId }).some((message) => message.includes("根级")), fieldId);
  const { tree } = fixture("HANDLING", { source: "FIELD", fieldId: "owner" });
  assert.ok(validateWorkflow(tree, { ...schema, fields: schema.fields.filter((field) => field.id !== "owner") }, directory).length > 0);
});

test("strict recipient config rejects unknown sources, mixed keys, expressions and malformed structures", () => {
  for (const config of [
    [], "INITIATOR", 42, false, {}, { source: "FIXED" }, { source: "MANAGER" }, { source: "toString" },
    { source: "INITIATOR", fieldId: "owner" }, { source: "INITIATOR", expression: "${user}" },
    { source: "INITIATOR", fieldId: null }, { source: "FIELD", fieldId: "owner", departmentIds: [] },
    { source: "INITIATOR_MANAGER", managerId: personId }, { source: "INITIATOR_DEPARTMENT_LEADER", departmentIds: [departmentId] },
    {source:"OWNER",ownerId:personId},{source:"COLLABORATORS",ids:[personId]},
    { source: "FIELD", fieldId: 42 }, { source: "FIELD", fieldId: { query: "members" } },
    { source: "POSITION", positionIds: [positionId], includeDescendants: false },
    { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: "true" },
    { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: null },
  ]) assert.ok(messages(config).length > 0, JSON.stringify(config));
});

test("department and position sources require one to twenty unique UUIDs", () => {
  for (const [source, key, id] of [["DEPARTMENT", "departmentIds", departmentId], ["POSITION", "positionIds", positionId]]) {
    for (const ids of [undefined, null, id, [], [42], ["not-a-uuid"], [id, id], [id, id.toUpperCase()], Array(21).fill(id)])
      assert.ok(messages({ source, [key]: ids }).length > 0, `${source}: ${JSON.stringify(ids)}`);
    assert.deepEqual(messages({ source, [key]: [id.toUpperCase()] }), []);
    const many = Array.from({ length: 20 }, (_, i) => `ffffffff-0000-0000-0000-${String(i).padStart(12, "0")}`);
    const { tree } = fixture("APPROVAL", { source, [key]: many } as WorkflowRecipientConfig);
    assert.deepEqual(validateWorkflow(tree, schema), []);
    (tree.nodes.find((node) => node.type === "APPROVAL")!.recipientConfig as { departmentIds?: string[]; positionIds?: string[] })[key as "departmentIds" | "positionIds"] = [...many, personId];
    assert.ok(validateWorkflow(tree, schema).some((issue) => issue.message.includes("1–20")));
  }
});

test("directory checks require actual departments or positions and leave recipient resolution to node entry", () => {
  for (const id of [companyId, teamId, personId]) assert.ok(messages({ source: "DEPARTMENT", departmentIds: [id] }).some((message) => message.includes("无效的部门")));
  assert.ok(messages({ source: "POSITION", positionIds: [departmentId] }).some((message) => message.includes("无效的岗位")));
  const emptyDirectory = { ...directory, people: [] };
  for (const config of [{ source: "DEPARTMENT", departmentIds: [departmentId] }, { source: "POSITION", positionIds: [positionId] }] as WorkflowRecipientConfig[]) {
    const { tree } = fixture("HANDLING", config);
    assert.deepEqual(validateWorkflow(tree, schema, emptyDirectory), []);
    assert.ok(validateWorkflow(tree, schema, { units: [], positions: [], people: [] }).length > 0);
  }
});

test("dynamic and fixed recipients cannot be mixed on any recipient node", () => {
  for (const type of ["APPROVAL", "HANDLING", "CC"] as const) for (const key of ["approverIds", "ccIds"] as const) {
    const { tree, node } = fixture(type, { source: "INITIATOR" });
    node[key] = [personId];
    assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("不能与固定成员混用")));
  }
});

test("start, end and condition nodes cannot declare a recipient source", () => {
  for (const type of ["START", "END", "CONDITION"]) {
    const { tree } = fixture("CONDITION");
    tree.nodes.find((node) => node.type === type)!.recipientConfig = { source: "INITIATOR" };
    assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("只有审批、办理和抄送")));
  }
});

test("switching any source removes incompatible config and arrays while preserving node modes and identity", () => {
  const sources: WorkflowRecipientSource[] = ["FIXED", "INITIATOR", "INITIATOR_MANAGER", "INITIATOR_DEPARTMENT_LEADER", "FIELD", "DEPARTMENT", "POSITION"];
  for (const from of sources) for (const to of sources.filter((source) => source !== from)) {
    const { node } = fixture("APPROVAL");
    const original = { ...node, ...changeWorkflowRecipientSource(from), approvalMode: "ALL", approverIds: [personId], ccIds: [personId] } as WorkflowNode;
    const snapshot = structuredClone(original);
    const changed = { ...original, ...changeWorkflowRecipientSource(to) };
    assert.deepEqual(original, snapshot);
    assert.equal(changed.id, node.id);
    assert.equal(changed.approvalMode, "ALL");
    assert.deepEqual(changed.approverIds, []);
    assert.deepEqual(changed.ccIds, []);
    assert.equal(changed.recipientConfig?.source, to === "FIXED" ? undefined : to);
    const keys = Object.keys(changed.recipientConfig ?? {});
    assert.deepEqual(keys, to === "FIXED" ? [] : to === "FIELD" ? ["source", "fieldId"] : to === "DEPARTMENT" ? ["source", "departmentIds"] : to === "POSITION" ? ["source", "positionIds"] : ["source"]);
    if (to === "FIXED") assert.ok(!JSON.stringify(changed).includes("recipientConfig"));
  }
});

test("dynamic recipient settings survive graph insert and remove operations without mutating the saved tree", () => {
  const { tree, node } = fixture("HANDLING", { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: true });
  const snapshot = structuredClone(tree);
  const inserted = insertWorkflowNode(tree, tree.rootId, node.id, "CC", schema);
  assert.deepEqual(tree, snapshot);
  assert.deepEqual(inserted.tree.nodes.find((entry) => entry.id === node.id)!.recipientConfig, node.recipientConfig);
  assert.deepEqual(removeWorkflowNode(inserted.tree, inserted.nodeId), snapshot);
});

test("summaries show configured source and person mode without pretending directory people are a resolved snapshot", () => {
  const { node } = fixture("APPROVAL", { source: "DEPARTMENT", departmentIds: [departmentId], includeDescendants: true });
  node.approvalMode = "ALL";
  assert.equal(workflowRecipientSummary(node, schema, directory), "部门 · 财务部（含下级） · 顺序审批");
  node.recipientConfig = { source: "FIELD", fieldId: "reviewers" };
  assert.equal(workflowRecipientSummary(node, schema, directory), "表单字段 · 复核成员 · 顺序审批");
  node.type = "HANDLING";
  node.recipientConfig = { source: "POSITION", positionIds: [positionId] };
  assert.equal(workflowRecipientSummary(node, schema, directory), "岗位 · 会计 · 依次办理");
  node.type = "CC";
  node.recipientConfig = { source: "INITIATOR" };
  assert.equal(workflowRecipientSummary(node, schema, directory), "流程发起人");
  node.recipientConfig = { source: "INITIATOR_MANAGER" };
  assert.equal(workflowRecipientSummary(node, schema, directory), "发起人的直属上级");
  node.recipientConfig = { source: "INITIATOR_DEPARTMENT_LEADER" };
  assert.equal(workflowRecipientSummary(node, schema, directory), "发起人的部门负责人");
});

test("dynamic handling still forbids approval mode and dynamic approval requires its mode", () => {
  const { tree, node } = fixture("HANDLING", { source: "INITIATOR" });
  node.approvalMode = "ALL";
  assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("不能设置审批方式")));
  node.type = "APPROVAL";
  delete node.approvalMode;
  assert.ok(validateWorkflow(tree, schema, directory).some((issue) => issue.message.includes("请选择审批方式")));
});
