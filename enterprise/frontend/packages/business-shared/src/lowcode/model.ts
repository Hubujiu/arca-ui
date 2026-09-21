import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import type { Directory } from "../organization/model";
import type { TableSchema } from "./field-model";
import type { WorkflowDraft, WorkflowRecipientConfig } from "./workflow-model";
import type { WorkflowFieldPermissions } from "./workflow-field-permissions";

export const base = "/api/v1/lc";
export const blankDirectory: Directory = {
  people: [],
  units: [],
  positions: [],
};
export type Scope = "NONE" | "OWN" | "ALL";
export type Permissions = {
  manage: boolean;
  create: boolean;
  read: Scope;
  update: Scope;
  delete: Scope;
};
export type Application = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  revision: number;
  canManage: boolean;
  tableCount?: number;
  tables: Table[];
  groups: Group[];
};
export type Group = {
  id: string;
  appId: string;
  parentId?: string | null;
  name: string;
  position: number;
};
export type Table = {
  id: string;
  appId: string;
  groupId?: string | null;
  name: string;
  description: string;
  revision: number;
  draft?: TableSchema;
  permissions: Permissions;
  publishedVersionId?: string;
  publishedVersion?: { id: string; version: number; schema: TableSchema };
};
export type Row = {
  id: string;
  tableId: string;
  data: Record<string, unknown>;
  revision: number;
  createdBy: string;
  creatorName: string;
  title?: string;
  ownerId?: string;
  ownerName?: string;
  ownershipRevision?: number;
  createdAt: string;
  updatedAt: string;
  canUpdate: boolean;
  canDelete: boolean;
  pendingChange: boolean;
  schema?: TableSchema;
  history?: {
    revision: number;
    action: string;
    createdAt: string;
    actorName: string;
  }[];
};
export type Grant = {
  tableId: string;
  canCreate: boolean;
  readScope: Scope;
  updateScope: Scope;
  deleteScope: Scope;
};
export type Role = {
  id?: string;
  name: string;
  manager: boolean;
  revision: number;
  userIds: string[];
  permissions: Grant[];
};
export type Share = {
  id: string;
  mode: "FILL" | "DATA";
  revoked: boolean;
  expiresAt: string;
  createdAt: string;
};
export type Flow = {
  revision: number;
  draft: WorkflowDraft;
  publishedVersionId?: string;
};
export type Task = {
  taskId: string;
  nodeId: string;
  name: string;
  type: string;
  assigneeId?: string;
  candidateIds: string[];
};
export type Run = {
  id: string;
  conflictCount?: number;
  flowName?: string;
  recordRevision?: number;
  triggerType?: string;
  revision: number;
  status: string;
  canAct: boolean;
  tasks: Task[];
  canRemind?: boolean;
  taskActions?: Record<string, { allowTransfer: boolean; allowAddSign: boolean; requireComment: boolean; requireSignature: boolean; dueAt?: string; delegationDepth: number; returnToId?: string; allowReject?: boolean; allowReturn?: boolean; requireRejectSignature?: boolean; approveLabel?: string; rejectLabel?: string; returnLabel?: string; stageName?: string; keyStage?: boolean }>;
  approvalProgress?: {
    groupId: string;
    mode: "PARALLEL_ALL" | "RACE" | "VOTE";
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    requiredApprovals: number;
    outcome: "PENDING" | "PASSED" | "REJECTED";
  } | null;
  returnTargets: { nodeId: string; nodeName: string }[];
  visits: {
    id: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    state: string;
    valid: boolean;
    actorName?: string;
    automatic?: boolean;
    assigneeIds: string[];
    enteredAt: string;
    completedAt?: string;
    dueAt?: string;
    stageName?: string;
    keyStage?: boolean;
  }[];
  events: {
    action: string;
    actorName: string;
    nodeId?: string;
    targetNodeId?: string;
    comment: string;
    createdAt: string;
    metadata?: { reason?: "INITIATOR_IS_APPROVER"|"RULE_MATCH"; mode?: string; seatIds?: string[]; sharedTask?: boolean; total?: number; approved?: number; pending?: number; cancelled?: number; requiredApprovals?: number; config?: WorkflowRecipientConfig | { source: "FIXED" }; ids?: string[]; names?: string[]; requestedSource?: import("./workflow-model").WorkflowRecipientSource; actualSource?: import("./workflow-model").WorkflowRecipientSource; fallbackReason?: "NONE" | "EMPTY_SOURCE" | "INITIATOR_REMOVED"; samePerson?: "KEEP" | "REMOVE_INITIATOR"; removedInitiator?: boolean; targetUserId?: string; signature?: { drawing: import("./signature-model").SignatureValue; signedBy: string; signedName: string } };
  }[];
};
export type RecordWorkflow = {
  id: string;
  changeId: string;
  flowId: string;
  flowName: string;
  flowVersion: number;
  recordRevision: number;
  triggerType: string;
  executionState: string;
  approvalResult: string;
  status: string;
  canOpen: boolean;
  canRetry?: boolean;
  conflictCount?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
};
export type Change = {
  id: string;
  /** A completed decision may revoke the actor's visit; that receipt has no form or run details. */
  canOpen?: boolean;
  tableId: string;
  recordId?: string;
  persistedRevision?: number;
  runs?: RecordWorkflow[];
  runId?: string;
  flowName?: string;
  title: string;
  tableName?: string;
  appName?: string;
  operation: "CREATE" | "UPDATE";
  status: string;
  revision: number;
  data: Record<string, unknown>;
  schema: TableSchema;
  createdAt: string;
  createdBy: string;
  creatorName?: string;
  run?: Run;
  /** Server grants for this viewer; absent on legacy read-only task responses. */
  fieldAccess?: WorkflowFieldPermissions;
  editable?: boolean;
};
export const statuses: Record<string, string> = {
  DRAFT: "草稿",
  PENDING: "审批中",
  RETURNED: "待修改",
  APPROVED: "已通过",
  SAVED: "已保存",
  QUEUED: "待启动",
  START_FAILED: "启动失败",
  FAILED: "执行失败",
  REJECTED: "已拒绝",
  WITHDRAWN: "已撤回",
};
export const actions: Record<string, string> = {
  SUBMIT_CHANGE: "提交申请",
  CREATE_CHANGE: "创建申请",
  WITHDRAW_CHANGE: "撤回申请",
  APPROVE: "通过审批",
  REJECT: "拒绝申请",
  RETURN: "退回修改",
  RESUBMIT: "重新提交",
  TRANSFER: "转交任务",
  ADD_SIGN: "发起前加签",
  ADD_SIGN_APPROVE: "完成加签",
  REMIND: "催办提醒",
  CREATE: "新增记录",
  UPDATE: "修改记录",
  DELETE: "删除记录",
};
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "操作未完成，请重试";
export function dateLabel(value?: string) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}
export function useLoad<T>(path?: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<T>(path, "GET", undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version]);
  return {
    data,
    error,
    loading,
    refresh: () => setVersion((n) => n + 1),
    setData,
  };
}
