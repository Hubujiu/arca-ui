import type { Directory } from "../organization/model";
import type { LowcodeField, TableSchema } from "./field-model";
import { createRule, defaultRuleValue, ruleOperatorLabels, ruleOperators, ruleSummary, validateRule, type Rule } from "./rules";
import { workflowFieldPermissionIssues, type WorkflowFieldPermissions } from "./workflow-field-permissions";
import { lifecycleMappingIssues, type LifecycleMappings } from "./workflow-lifecycle";

export type WorkflowNodeType =
  "START" | "APPROVAL" | "HANDLING" | "CC" | "CONDITION" | "END";
export type ConditionOperator = Rule["operator"] | "DEFAULT";
export type BranchCondition = Rule | { operator: "DEFAULT" };
export type WorkflowRecipientConfig =
  | { source: "INITIATOR" }
  | { source: "INITIATOR_MANAGER" }
  | { source: "INITIATOR_DEPARTMENT_LEADER" }
  | { source: "OWNER" }
  | { source: "COLLABORATORS" }
  | { source: "FIELD"; fieldId: string }
  | { source: "DEPARTMENT"; departmentIds: string[]; includeDescendants?: boolean }
  | { source: "POSITION"; positionIds: string[] };
export type WorkflowRecipientSource = "FIXED" | WorkflowRecipientConfig["source"];
export type WorkflowRecipientPolicy = { empty?: "ERROR" | "INITIATOR" | "FIXED"; fallbackIds?: string[]; samePerson?: "KEEP" | "REMOVE_INITIATOR" };
export type WorkflowApprovalMode = "ANY" | "ALL" | "PARALLEL_ALL" | "RACE" | "VOTE";
export type WorkflowActionConfig = {
  allowTransfer?: boolean; allowAddSign?: boolean; requireComment?: boolean; requireSignature?: boolean; deadlineHours?: number | null;
  allowReject?: boolean; allowReturn?: boolean; requireRejectSignature?: boolean;
  approveLabel?: string | null; rejectLabel?: string | null; returnLabel?: string | null; stageName?: string | null; keyStage?: boolean;
};
export type WorkflowAutoApproval = { initiatorIsApprover?: boolean; condition?: Rule | null };
export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  name: string;
  children: string[];
  /** APPROVAL recipients, or ordered HANDLING assignees. */
  approverIds?: string[];
  /** ALL executes sequentially; only APPROVAL may set this property. */
  approvalMode?: WorkflowApprovalMode;
  /** Integer approval percentage, required only for VOTE; rounds up against the entry roster. */
  voteThreshold?: number | null;
  ccIds?: string[];
  recipientConfig?: WorkflowRecipientConfig | null;
  recipientPolicy?: WorkflowRecipientPolicy | null;
  /** Root fields omitted from an enabled policy are read-only. */
  fieldPermissions?: WorkflowFieldPermissions | null;
  actionConfig?: WorkflowActionConfig | null;
  autoApproval?: WorkflowAutoApproval | null;
  condition?: BranchCondition;
};
export type TreeModel = { rootId: string; nodes: WorkflowNode[]; lifecycleMappings?: LifecycleMappings | null };
export type WorkflowDraft = {
  tree: TreeModel;
  onCreate: boolean;
  onUpdate: boolean;
};
export type WorkflowIssue = {
  nodeId?: string;
  message: string;
  structural?: boolean;
};
export type InsertableNodeType = "APPROVAL" | "HANDLING" | "CC" | "CONDITION";

export const nodeTypeLabels: Record<WorkflowNodeType, string> = {
  START: "发起",
  APPROVAL: "审批",
  HANDLING: "办理",
  CC: "抄送",
  CONDITION: "条件分支",
  END: "结束",
};
export const recipientSourceLabels: Record<WorkflowRecipientSource, string> = {
  FIXED: "固定成员",
  INITIATOR: "流程发起人",
  INITIATOR_MANAGER: "发起人的直属上级",
  INITIATOR_DEPARTMENT_LEADER: "发起人的部门负责人",
  OWNER: "记录负责人",
  COLLABORATORS: "记录协作者",
  FIELD: "表单成员字段",
  DEPARTMENT: "部门成员",
  POSITION: "岗位成员",
};
export const approvalModeLabels: Record<WorkflowApprovalMode, string> = {
  ANY: "或签", ALL: "顺序审批", PARALLEL_ALL: "并行会签", RACE: "抢签", VOTE: "投票",
};
export function changeWorkflowApprovalMode(node: WorkflowNode, approvalMode: WorkflowApprovalMode): Partial<WorkflowNode> {
  return { approvalMode, voteThreshold: approvalMode === "VOTE" ? node.voteThreshold ?? 51 : undefined };
}
export function workflowVoteRequired(total: number, percent: number): number {
  return Math.ceil(total * percent / 100);
}
export function workflowActionIssues(node: Pick<WorkflowNode, "type" | "actionConfig">): string[] {
  const config = node.actionConfig;
  if (config == null) return [];
  if (!["APPROVAL", "HANDLING"].includes(node.type)) return ["只有审批和办理节点可以设置处理规则"];
  if (typeof config !== "object" || Array.isArray(config)) return ["处理规则必须为对象"];
  const issues: string[] = [];
  const flags = ["allowTransfer", "allowAddSign", "requireComment", "requireSignature", "allowReject", "allowReturn", "requireRejectSignature", "keyStage"];
  const labels = ["approveLabel", "rejectLabel", "returnLabel", "stageName"] as const;
  if (Object.keys(config).some(key => ![...flags, ...labels, "deadlineHours"].includes(key))) issues.push("处理规则包含未知配置");
  for (const key of flags) { const value = config[key as keyof WorkflowActionConfig]; if (value != null && typeof value !== "boolean") issues.push("处理规则开关必须为布尔值"); }
  if (config.deadlineHours != null && (!Number.isInteger(config.deadlineHours) || config.deadlineHours < 1 || config.deadlineHours > 8760)) issues.push("处理期限必须为 1–8760 的整数小时");
  for (const key of labels) { const value=config[key],maximum=key==="stageName"?40:16;if(value!=null&&(typeof value!=="string"||!value.trim()||value!==value.trim()||[...value].length>maximum||/[\p{Cc}\p{Cf}<>]/u.test(value)))issues.push(key==="stageName"?"阶段名称需要 1–40 个纯文本字符":"按钮名称需要 1–16 个纯文本字符"); }
  if(config.keyStage===true&&!config.stageName)issues.push("关键节点需要填写阶段名称");
  if(node.type==="HANDLING"&&[config.allowReject,config.allowReturn,config.requireRejectSignature,config.rejectLabel,config.returnLabel].some(value=>value!=null))issues.push("只有审批节点可以设置拒绝或退回操作");
  return issues;
}
export function workflowActionPolicy(type: string | undefined, config?: WorkflowActionConfig | null) {
  return {
    allowReject: type === "APPROVAL" && config?.allowReject !== false,
    allowReturn: type === "APPROVAL" && config?.allowReturn !== false,
    approveLabel: config?.approveLabel || (type === "HANDLING" ? "完成办理" : "同意"),
    rejectLabel: config?.rejectLabel || "拒绝", returnLabel: config?.returnLabel || "退回",
    signatureRequired: (action: string | undefined) => action === "APPROVE" ? config?.requireSignature === true : action === "REJECT" && config?.requireRejectSignature === true,
  };
}
export function workflowAutoApprovalIssues(node: Pick<WorkflowNode,"type"|"autoApproval"|"fieldPermissions"|"actionConfig">, schema?: TableSchema, directory?: Directory): string[] {
  const config=node.autoApproval;
  if(config==null)return [];
  if(typeof config!=="object"||Array.isArray(config))return ["自动通过配置必须为对象"];
  const issues:string[]=[];
  if(node.type!=="APPROVAL")issues.push("只有审批节点支持自动通过");
  if(Object.keys(config).some(key=>!["initiatorIsApprover","condition"].includes(key)))issues.push("自动通过包含未知配置");
  if(config.initiatorIsApprover!=null&&typeof config.initiatorIsApprover!=="boolean")issues.push("同人自动通过开关必须为布尔值");
  if(config.initiatorIsApprover!==true&&config.condition==null)issues.push("自动通过需要明确启用同人或条件规则");
  if(Object.values(node.fieldPermissions??{}).some(permission=>permission.access==="EDIT"))issues.push("自动通过不能与节点字段编辑同时配置");
  if(node.actionConfig?.requireComment||node.actionConfig?.requireSignature)issues.push("自动通过不能替代必填意见或手写签名");
  if(config.condition!=null) {
    if(typeof config.condition!=="object"||Array.isArray(config.condition)||(config.condition as {operator:string}).operator==="DEFAULT")issues.push("请选择封闭条件规则，不能使用默认分支");
    else if(schema)issues.push(...validateRule(config.condition,schema.fields),...conditionDirectoryIssues(config.condition,schema.fields,directory));
  }
  return issues;
}
export function workflowAutoApprovalReason(reason?: string) { return reason==="INITIATOR_IS_APPROVER"?"发起人与审批人相同":reason==="RULE_MATCH"?"满足已发布的自动通过条件":"按已发布策略自动通过"; }
export const operatorLabels: Record<ConditionOperator, string> = {
  ...ruleOperatorLabels,
  DEFAULT: "其他情况",
};
const id = () => `n${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

export function initialWorkflow(): WorkflowDraft {
  const rootId = id(),
    endId = id();
  return {
    onCreate: true,
    onUpdate: false,
    tree: {
      rootId,
      nodes: [
        { id: rootId, type: "START", name: "发起申请", children: [endId] },
        { id: endId, type: "END", name: "流程结束", children: [] },
      ],
    },
  };
}

export function conditionFields(schema: TableSchema) {
  return schema.fields.filter(
    (field) => field.type !== "heading" && field.type !== "divider",
  );
}
/** Dynamic field recipients come only from root-level member fields in the saved schema. */
export function recipientFields(schema: TableSchema) {
  return schema.fields.filter((field) => field.type === "member" || field.type === "members");
}

/** Switching sources always drops incompatible settings and the old fixed recipients. */
export function changeWorkflowRecipientSource(source: WorkflowRecipientSource): Partial<WorkflowNode> {
  const recipientConfig: WorkflowRecipientConfig | undefined = source === "FIXED"
    ? undefined
    : source === "FIELD" ? { source, fieldId: "" }
    : source === "DEPARTMENT" ? { source, departmentIds: [] }
    : source === "POSITION" ? { source, positionIds: [] }
    : { source };
  return { recipientConfig, approverIds: [], ccIds: [] };
}

export function workflowRecipientSummary(node: WorkflowNode, schema: TableSchema, directory: Directory): string {
  const config = node.recipientConfig;
  let summary: string;
  if (!config) {
    const ids = (node.type === "CC" ? node.ccIds : node.approverIds) ?? [];
    summary = ids.length ? ids.map((id) => directory.people.find((person) => person.id.toLowerCase() === id.toLowerCase())?.displayName ?? "未知成员").join("、")
      : node.type === "APPROVAL" ? "请选择审批人" : node.type === "HANDLING" ? "请选择办理人" : "请选择抄送人";
  } else if (config.source === "INITIATOR") summary = "流程发起人";
  else if (config.source === "OWNER" || config.source === "COLLABORATORS") summary = recipientSourceLabels[config.source];
  else if (config.source === "INITIATOR_MANAGER" || config.source === "INITIATOR_DEPARTMENT_LEADER") summary = recipientSourceLabels[config.source];
  else if (config.source === "FIELD") summary = `表单字段 · ${recipientFields(schema).find((field) => field.id === config.fieldId)?.label ?? "待选择有效成员字段"}`;
  else if (config.source === "DEPARTMENT") summary = `部门 · ${Array.isArray(config.departmentIds) && config.departmentIds.length ? config.departmentIds.map((id) => directory.units.find((unit) => unit.kind === "DEPARTMENT" && unit.id.toLowerCase() === String(id).toLowerCase())?.name ?? "已移除部门").join("、") : "待选择部门"}${config.includeDescendants ? "（含下级）" : ""}`;
  else if (config.source === "POSITION") summary = `岗位 · ${Array.isArray(config.positionIds) && config.positionIds.length ? config.positionIds.map((id) => directory.positions.find((position) => position.id.toLowerCase() === String(id).toLowerCase())?.name ?? "已移除岗位").join("、") : "待选择岗位"}`;
  else summary = "人员来源无效";
  const mode = node.approvalMode ? approvalModeLabels[node.approvalMode] : "待设置审批方式";
  const policy=node.recipientPolicy;
  return `${summary}${node.type === "APPROVAL" ? ` · ${mode}${node.approvalMode === "VOTE" ? ` ≥${node.voteThreshold ?? "?"}%` : ""}` : node.type === "HANDLING" ? " · 依次办理" : ""}${policy?.samePerson==="REMOVE_INITIATOR"?" · 排除发起人":""}${policy?.empty==="INITIATOR"?" · 空名单交发起人":policy?.empty==="FIXED"?" · 空名单交指定成员":""}`;
}

const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function workflowRecipientPolicyIssues(node: Pick<WorkflowNode,"type"|"recipientPolicy">, directory?: Directory): string[] {
  const policy=node.recipientPolicy;
  if(policy==null)return [];
  if(!["APPROVAL","HANDLING","CC"].includes(node.type))return ["只有审批、办理和抄送节点可以设置人员策略"];
  if(typeof policy!=="object"||Array.isArray(policy))return ["人员策略必须是对象"];
  const errors:string[]=[];
  if(Object.keys(policy).some(key=>!["empty","fallbackIds","samePerson"].includes(key)))errors.push("人员策略包含未知配置");
  if(policy.empty!=null&&!["ERROR","INITIATOR","FIXED"].includes(policy.empty))errors.push("空名单策略无效");
  if(policy.samePerson!=null&&!["KEEP","REMOVE_INITIATOR"].includes(policy.samePerson))errors.push("同人处理策略无效");
  if(policy.empty==="FIXED") {
    const ids=policy.fallbackIds;
    if(!Array.isArray(ids)||ids.length<1||ids.length>20||ids.some(id=>typeof id!=="string"||!uuidPattern.test(id))||new Set(ids.map(id=>String(id).toLowerCase())).size!==ids.length)errors.push("固定回退需要 1–20 位不重复的有效成员");
    else if(directory&&ids.some(id=>!directory.people.some(person=>person.id.toLowerCase()===id.toLowerCase()&&person.enabled&&person.loginBound===true)))errors.push("固定回退成员必须启用且绑定登录账号");
  } else if(policy.fallbackIds!=null)errors.push("只有指定成员回退可以保存回退名单");
  return errors;
}
function recipientConfigIssues(value: unknown, schema?: TableSchema, directory?: Directory): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["人员来源配置格式无效"];
  const config = value as Record<string, unknown>;
  const allowed: Record<string, string[]> = {
    INITIATOR: ["source"], INITIATOR_MANAGER: ["source"], INITIATOR_DEPARTMENT_LEADER: ["source"], OWNER: ["source"], COLLABORATORS: ["source"], FIELD: ["source", "fieldId"],
    DEPARTMENT: ["source", "departmentIds", "includeDescendants"], POSITION: ["source", "positionIds"],
  };
  if (typeof config.source !== "string" || !Object.hasOwn(allowed, config.source)) return ["请选择有效的人员来源"];
  const messages: string[] = [];
  if (Object.keys(config).some((key) => !allowed[config.source as string].includes(key)))
    messages.push("人员来源不能混合其他来源或未知配置");
  if (config.source === "FIELD") {
    if (typeof config.fieldId !== "string" || !config.fieldId.trim() || schema && !recipientFields(schema).some((field) => field.id === config.fieldId))
      messages.push("请选择表单根级的单成员或多成员字段");
  }
  if (config.source === "DEPARTMENT" || config.source === "POSITION") {
    const department = config.source === "DEPARTMENT";
    const ids = department ? config.departmentIds : config.positionIds;
    const label = department ? "部门" : "岗位";
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 20) messages.push(`请选择 1–20 个${label}`);
    if (Array.isArray(ids)) {
      if (ids.some((id) => typeof id !== "string" || !uuidPattern.test(id))) messages.push(`存在无效的${label}标识`);
      const normalized = ids.map((id) => String(id).toLowerCase());
      if (new Set(normalized).size !== ids.length) messages.push(`${label}不能重复选择`);
      const choices = department ? directory?.units.filter((unit) => unit.kind === "DEPARTMENT") : directory?.positions;
      if (choices && normalized.some((id) => !choices.some((entry) => entry.id.toLowerCase() === id))) messages.push(`存在已移除或无效的${label}`);
    }
    if (department && Object.hasOwn(config, "includeDescendants") && typeof config.includeDescendants !== "boolean") messages.push("包含下级部门必须为开关值");
  }
  return messages;
}
export function conditionOperators(field?: LowcodeField) {
  return ruleOperators(field);
}
export function initialCondition(schema: TableSchema): BranchCondition {
  return createRule(conditionFields(schema));
}
export function defaultConditionValue(
  field?: LowcodeField,
): string | number | boolean {
  return defaultRuleValue(field);
}
export function conditionLabel(
  condition: BranchCondition | undefined,
  schema: TableSchema,
  directory?: Directory,
): string {
  if (!condition) return "待设置条件";
  if (condition.operator === "DEFAULT") return "其他情况";
  return ruleSummary(condition, schema.fields, directory ?? { units: [], positions: [], people: [] });
}


/** This check also protects graph edits while a leaf's field/value is still being configured. */
function conditionShapeIssues(condition: BranchCondition): string[] {
  const messages: string[] = [];
  let count = 0;
  const visit = (rule: unknown, depth: number) => {
    if (++count > 32 || depth > 4) {
      messages.push("条件最多支持 4 层、32 个条件节点");
      return;
    }
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      messages.push("分支条件格式无效");
      return;
    }
    const record = rule as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined && record[key] !== null);
    if (record.operator === "DEFAULT") {
      if (depth !== 1 || keys.some((key) => key !== "operator"))
        messages.push("其他情况只能独立用作最外层分支条件");
    } else if (record.operator === "AND" || record.operator === "OR") {
      if (keys.some((key) => key !== "operator" && key !== "conditions") ||
          !Array.isArray(record.conditions) || record.conditions.length < 1 || record.conditions.length > 8) {
        messages.push("条件组需包含 1–8 项，且不能混合字段比较配置");
        return;
      }
      for (const child of record.conditions) visit(child, depth + 1);
    } else {
      if (keys.some((key) => !["fieldId", "operator", "value", "valueFieldId"].includes(key)))
        messages.push("单个条件不能包含条件组或其他配置");
      if (keys.includes("value") && keys.includes("valueFieldId"))
        messages.push("比较值和比较字段只能选择一种");
      if (["EMPTY", "NOT_EMPTY"].includes(String(record.operator)) &&
          (keys.includes("value") || keys.includes("valueFieldId")))
        messages.push("空值判断不能设置比较值");
    }
  };
  visit(condition, 1);
  return messages;
}

function conditionDirectoryIssues(rule: Rule, fields: LowcodeField[], directory?: Directory): string[] {
  if (!directory) return [];
  if ("conditions" in rule)
    return rule.conditions.flatMap((child) => conditionDirectoryIssues(child, fields, directory));
  if (typeof rule.value !== "string" || rule.valueFieldId) return [];
  const field = fields.find((entry) => entry.id === rule.fieldId);
  const value = rule.value.toLowerCase();
  if (field && ["member", "members"].includes(field.type) &&
      !directory.people.some((person) => person.id.toLowerCase() === value && person.enabled && person.loginBound))
    return ["请选择有效的公司成员"];
  if (field && ["department", "departments", "position", "positions"].includes(field.type)) {
    const choices = ["department", "departments"].includes(field.type)
      ? directory.units.filter((unit) => unit.kind === "DEPARTMENT") : directory.positions;
    if (!choices.some((entry) => entry.id.toLowerCase() === value)) return ["请选择有效的部门或岗位"];
  }
  return [];
}

/** The client mirrors structural constraints; publishing always validates again on the server. */
export function validateWorkflow(
  tree: TreeModel,
  schema?: TableSchema,
  directory?: Directory,
): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const add = (
    nodeId: string | undefined,
    message: string,
    structural = false,
  ) => issues.push({ nodeId, message, structural });
  for (const message of lifecycleMappingIssues(tree, schema)) add(undefined, message);
  if (tree.nodes.length < 2 || tree.nodes.length > 80)
    add(undefined, "流程需要 2–80 个节点", true);
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  if (nodes.size !== tree.nodes.length) add(undefined, "节点标识重复", true);
  if (
    nodes.get(tree.rootId)?.type !== "START" ||
    tree.nodes.filter((node) => node.type === "START").length !== 1
  )
    add(tree.rootId, "流程必须有唯一的发起节点", true);
  const parents = new Map<string, string[]>();
  for (const node of tree.nodes) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(node.id))
      add(node.id, "节点标识格式无效", true);
    if (!node.name.trim() || node.name.length > 100 || /[$#]\{/.test(node.name))
      add(node.id, "节点名称需要 1–100 字，且不能包含表达式标记");
    if (!(node.type in nodeTypeLabels)) add(node.id, "不支持的节点类型", true);
    if (new Set(node.children).size !== node.children.length)
      add(node.id, "同一节点不能重复连接同一分支", true);
    if (
      node.type === "END"
        ? node.children.length !== 0
        : node.type === "CONDITION"
          ? node.children.length < 2 || node.children.length > 8
          : node.children.length !== 1
    )
      add(
        node.id,
        `${nodeTypeLabels[node.type] ?? "当前"}节点的连接数量不正确`,
        true,
      );
    for (const child of node.children) {
      if (!nodes.has(child)) add(node.id, "连接指向了不存在的节点", true);
      parents.set(child, [...(parents.get(child) ?? []), node.id]);
    }
    if (node.type === "CONDITION") {
      const children = node.children.map((child) => nodes.get(child));
      if (
        children.filter((child) => child?.condition?.operator === "DEFAULT")
          .length !== 1 ||
        children.at(-1)?.condition?.operator !== "DEFAULT"
      )
        add(node.id, "必须有唯一的「其他情况」分支，并放在最后", true);
      for (const child of children)
        if (child && !child.condition) add(child.id, "请设置分支条件");
    }
    for(const message of workflowRecipientPolicyIssues(node,directory))add(node.id,message);
    if (node.type === "APPROVAL" || node.type === "HANDLING" || node.type === "CC") {
      const configuredIds = (node.type === "CC" ? node.ccIds : node.approverIds) ?? [];
      const ids = Array.isArray(configuredIds) ? configuredIds : [];
      const limit = node.type === "CC" ? 50 : 20;
      if (!Array.isArray(configuredIds)) add(node.id, "固定成员配置格式无效");
      if (node.recipientConfig != null) {
        for (const message of recipientConfigIssues(node.recipientConfig, schema, directory)) add(node.id, message);
        if ([node.approverIds, node.ccIds].some((ids) => ids != null && !Array.isArray(ids))) add(node.id, "固定成员配置格式无效");
        if ((node.approverIds?.length ?? 0) || (node.ccIds?.length ?? 0)) add(node.id, "动态人员来源不能与固定成员混用");
      } else {
        const hasFallback = node.recipientPolicy?.empty === "INITIATOR" || node.recipientPolicy?.empty === "FIXED";
        if (!ids.length && !hasFallback || ids.length > limit)
          add(
            node.id,
            `请选择 1–${limit} 位${node.type === "APPROVAL" ? "审批人" : node.type === "HANDLING" ? "办理人" : "抄送人"}`,
          );
        if (new Set(ids.map((id) => String(id).toLowerCase())).size !== ids.length) add(node.id, "成员不能重复选择");
        if (ids.some((memberId) => typeof memberId !== "string" || !uuidPattern.test(memberId)))
          add(node.id, "存在无效的成员标识");
        if (
          directory &&
          ids.some(
            (memberId) =>
              !directory.people.some(
                (person) =>
                  person.id.toLowerCase() === String(memberId).toLowerCase() && person.enabled && person.loginBound,
              ),
          )
        )
          add(node.id, "存在已停用、未绑定账号或已移除的成员");
      }
      if (
        node.type === "APPROVAL" &&
        (!node.approvalMode || !Object.hasOwn(approvalModeLabels, node.approvalMode))
      )
        add(node.id, "请选择审批方式");
      if (node.type === "HANDLING" && node.approvalMode != null)
        add(node.id, "办理节点按成员顺序执行，不能设置审批方式");
    } else if (node.recipientConfig != null) {
      add(node.id, "只有审批、办理和抄送节点可以设置人员来源");
    }
    if (node.type === "APPROVAL" && node.approvalMode === "VOTE") {
      if (typeof node.voteThreshold !== "number" || !Number.isInteger(node.voteThreshold)
          || node.voteThreshold < 1 || node.voteThreshold > 100)
        add(node.id, "投票同意比例必须是 1–100 的整数百分比");
    } else if (node.voteThreshold != null) add(node.id, "只有投票模式可以设置同意比例");
    for (const message of workflowFieldPermissionIssues(node, schema)) add(node.id, message);
    for (const message of workflowActionIssues(node)) add(node.id, message);
    for (const message of workflowAutoApprovalIssues(node,schema,directory)) add(node.id,message);
    const condition = node.condition;
    if (condition) {
      const shapeIssues = conditionShapeIssues(condition);
      for (const message of shapeIssues) add(node.id, message, true);
      if (!shapeIssues.length && condition.operator !== "DEFAULT" && schema) {
        for (const message of validateRule(condition, conditionFields(schema))) add(node.id, message);
        for (const message of conditionDirectoryIssues(condition, conditionFields(schema), directory))
          add(node.id, message);
      }
    }
  }
  for (const node of tree.nodes) {
    const nodeParents = parents.get(node.id) ?? [];
    if (
      node.id === tree.rootId
        ? nodeParents.length !== 0
        : nodeParents.length !== 1
    )
      add(node.id, "每个节点必须只有一个上级，禁止合并与孤立节点", true);
    if (
      node.condition &&
      !nodeParents.some((parent) => nodes.get(parent)?.type === "CONDITION")
    )
      add(node.id, "分支条件只能属于条件节点的直属分支", true);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  const visit = (nodeId: string, depth: number) => {
    if (active.has(nodeId)) {
      add(nodeId, "流程中存在循环连接", true);
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    if (depth > 20) {
      add(nodeId, "流程最多支持 20 层节点", true);
      return;
    }
    active.add(nodeId);
    nodes.get(nodeId)?.children.forEach((child) => visit(child, depth + 1));
    active.delete(nodeId);
  };
  visit(tree.rootId, 1);
  if (tree.nodes.some((node) => !visited.has(node.id)))
    add(undefined, "存在无法从发起节点到达的节点", true);
  return issues;
}

export function workflowParent(tree: TreeModel, nodeId: string) {
  return tree.nodes.find((node) => node.children.includes(nodeId));
}
export function workflowDescendants(
  tree: TreeModel,
  nodeId: string,
): Set<string> {
  const nodes = new Map(tree.nodes.map((node) => [node.id, node])),
    result = new Set<string>();
  const visit = (current: string) => {
    if (result.has(current)) return;
    result.add(current);
    nodes.get(current)?.children.forEach(visit);
  };
  visit(nodeId);
  return result;
}
function checked(tree: TreeModel): TreeModel {
  const issue = validateWorkflow(tree).find((entry) => entry.structural);
  if (issue) throw new Error(issue.message);
  return tree;
}

/** Insertions preserve branch predicates on the new subtree root. */
export function insertWorkflowNode(
  tree: TreeModel,
  parentId: string,
  childId: string,
  type: InsertableNodeType,
  schema: TableSchema,
): { tree: TreeModel; nodeId: string } {
  const next = structuredClone(tree),
    parent = next.nodes.find((node) => node.id === parentId),
    child = next.nodes.find((node) => node.id === childId);
  if (!parent || !child || !parent.children.includes(childId))
    throw new Error("连接已发生变化，请重新选择插入位置");
  const node: WorkflowNode = {
    id: id(),
    type,
    name: nodeTypeLabels[type],
    children: [childId],
  };
  if (child.condition) {
    node.condition = child.condition;
    delete child.condition;
  }
  if (type === "APPROVAL") {
    node.approverIds = [];
    node.approvalMode = "ANY";
  }
  if (type === "HANDLING") node.approverIds = [];
  if (type === "CC") node.ccIds = [];
  if (type === "CONDITION") {
    const branch: WorkflowNode = {
      id: id(),
      name: "流程结束",
      type: "END",
      children: [],
      condition: initialCondition(schema),
    };
    child.condition = { operator: "DEFAULT" };
    node.children = [branch.id, childId];
    next.nodes.push(branch);
  }
  parent.children = parent.children.map((entry) =>
    entry === childId ? node.id : entry,
  );
  next.nodes.push(node);
  return { tree: checked(next), nodeId: node.id };
}
export function addWorkflowBranch(
  tree: TreeModel,
  nodeId: string,
  schema: TableSchema,
): { tree: TreeModel; nodeId: string } {
  const next = structuredClone(tree),
    node = next.nodes.find((entry) => entry.id === nodeId);
  if (node?.type !== "CONDITION" || node.children.length >= 8)
    throw new Error("条件节点最多支持 8 条分支");
  const branch: WorkflowNode = {
    id: id(),
    type: "END",
    name: "流程结束",
    children: [],
    condition: initialCondition(schema),
  };
  next.nodes.push(branch);
  node.children.splice(node.children.length - 1, 0, branch.id);
  return { tree: checked(next), nodeId: branch.id };
}
export function removeWorkflowNode(tree: TreeModel, nodeId: string): TreeModel {
  const next = structuredClone(tree),
    node = next.nodes.find((entry) => entry.id === nodeId),
    parent = workflowParent(next, nodeId);
  if (!node || !parent || node.type === "END" || node.type === "START")
    throw new Error("发起和结束节点必须保留");
  const childId =
    node.type === "CONDITION"
      ? node.children.find(
          (entry) =>
            next.nodes.find((child) => child.id === entry)?.condition
              ?.operator === "DEFAULT",
        )
      : node.children[0];
  const child = next.nodes.find((entry) => entry.id === childId);
  if (!child) throw new Error("未找到可保留的后续节点");
  const remove = new Set([nodeId]);
  if (node.type === "CONDITION")
    for (const branchId of node.children.filter((entry) => entry !== childId))
      for (const descendant of workflowDescendants(next, branchId))
        remove.add(descendant);
  if (node.condition) child.condition = node.condition;
  else delete child.condition;
  parent.children = parent.children.map((entry) =>
    entry === nodeId ? child.id : entry,
  );
  next.nodes = next.nodes.filter((entry) => !remove.has(entry.id));
  return checked(next);
}
export function removeWorkflowBranch(
  tree: TreeModel,
  branchId: string,
): TreeModel {
  const branch = tree.nodes.find((node) => node.id === branchId),
    parent = workflowParent(tree, branchId);
  if (parent?.type !== "CONDITION" || branch?.condition?.operator === "DEFAULT")
    throw new Error("其他情况分支必须保留");
  // A binary condition becomes its remaining default subtree when one branch is removed.
  if (parent.children.length === 2) return removeWorkflowNode(tree, parent.id);
  const remove = workflowDescendants(tree, branchId);
  return checked({
    ...tree,
    nodes: tree.nodes
      .filter((node) => !remove.has(node.id))
      .map((node) =>
        node.id === parent.id
          ? {
              ...node,
              children: node.children.filter((entry) => entry !== branchId),
            }
          : node,
      ),
  });
}
export function moveWorkflowBranch(
  tree: TreeModel,
  branchId: string,
  direction: -1 | 1,
): TreeModel {
  const parent = workflowParent(tree, branchId);
  if (parent?.type !== "CONDITION") return tree;
  const children = [...parent.children],
    index = children.indexOf(branchId),
    target = index + direction;
  if (
    index === children.length - 1 ||
    target < 0 ||
    target >= children.length - 1
  )
    return tree;
  [children[index], children[target]] = [children[target], children[index]];
  return checked({
    ...tree,
    nodes: tree.nodes.map((node) =>
      node.id === parent.id ? { ...node, children } : node,
    ),
  });
}

/** Layout is derived from the tree, never stored as executable graph metadata. */
export function workflowPositions(
  tree: TreeModel,
): Map<string, { x: number; y: number }> {
  const nodes = new Map(tree.nodes.map((node) => [node.id, node])),
    widths = new Map<string, number>(),
    positions = new Map<string, { x: number; y: number }>();
  const measure = (nodeId: string, active: Set<string>): number => {
    if (active.has(nodeId) || active.size > 80) return 320;
    if (widths.has(nodeId)) return widths.get(nodeId)!;
    const seen = new Set(active).add(nodeId);
    const width = Math.max(
      320,
      (nodes.get(nodeId)?.children ?? []).reduce(
        (total, child) => total + measure(child, seen),
        0,
      ),
    );
    widths.set(nodeId, width);
    return width;
  };
  measure(tree.rootId, new Set());
  const place = (nodeId: string, left: number, depth: number) => {
    if (positions.has(nodeId) || depth > 80) return;
    positions.set(nodeId, {
      x: left + (widths.get(nodeId) ?? 320) / 2 - 150,
      y: depth * 252 + 40,
    });
    let cursor = left;
    for (const child of nodes.get(nodeId)?.children ?? []) {
      place(child, cursor, depth + 1);
      cursor += widths.get(child) ?? 320;
    }
  };
  place(tree.rootId, 0, 0);
  return positions;
}
