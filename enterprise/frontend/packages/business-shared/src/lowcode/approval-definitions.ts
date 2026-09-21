import type { WorkflowDraft } from "./workflow-model";

export type ApprovalTriggerType =
  | "CREATE"
  | "UPDATE"
  | "BUTTON"
  | "WEBHOOK"
  | "SCHEDULE"
  | "DATE_FIELD"
  /** A read-only compatibility trigger from definitions created before named flows. */
  | "RECORD";

export type ApprovalTrigger =
  | { type: "CREATE" | "UPDATE" | "BUTTON" | "WEBHOOK" }
  | { type: "SCHEDULE"; intervalMinutes: number; scope: "ALL_READABLE"; maxRecords: number }
  | { type: "DATE_FIELD"; dateFieldId: string; offsetMinutes?: number; scope: "ALL_READABLE"; maxRecords: number }
  | { type: "RECORD"; operations: Array<"CREATE" | "UPDATE"> };

export type ApprovalWorkflowDraft = WorkflowDraft & { trigger: ApprovalTrigger };

export type ApprovalDefinition = {
  id: string;
  tableId: string;
  name: string;
  revision: number;
  enabled: boolean;
  /** Exposes only whether an external Webhook secret exists, never its value. */
  webhookConfigured?: boolean;
  publishedVersionId?: string;
  publishedVersion?: {
    id?: string;
    version?: number;
    trigger?: ApprovalTrigger;
    draft?: ApprovalWorkflowDraft;
  };
  trigger?: ApprovalTrigger;
  draft: ApprovalWorkflowDraft;
  createdAt?: string;
  updatedAt?: string;
};

export const approvalTriggerLabels: Record<ApprovalTriggerType, string> = {
  CREATE: "新增记录时",
  UPDATE: "修改记录时",
  BUTTON: "手动按钮",
  WEBHOOK: "Webhook",
  SCHEDULE: "定时执行",
  DATE_FIELD: "日期字段到期",
  RECORD: "兼容：新增和修改",
};

export function defaultApprovalTrigger(): ApprovalTrigger {
  return { type: "CREATE" };
}

export function normalizeApprovalTrigger(value: unknown): ApprovalTrigger {
  if (!value || typeof value !== "object") return defaultApprovalTrigger();
  const raw = value as Record<string, unknown>;
  switch (raw.type) {
    case "UPDATE":
    case "BUTTON":
    case "WEBHOOK":
    case "CREATE":
      return { type: raw.type };
    case "SCHEDULE":
      return {
        type: "SCHEDULE",
        intervalMinutes: boundedInteger(raw.intervalMinutes, 60, 1, 525600),
        scope: "ALL_READABLE",
        maxRecords: boundedInteger(raw.maxRecords, 50, 1, 50),
      };
    case "DATE_FIELD":
      return {
        type: "DATE_FIELD",
        dateFieldId: typeof raw.dateFieldId === "string" ? raw.dateFieldId : "",
        offsetMinutes: boundedInteger(raw.offsetMinutes, 0, -525600, 525600),
        scope: "ALL_READABLE",
        maxRecords: boundedInteger(raw.maxRecords, 50, 1, 50),
      };
    case "RECORD": {
      const operations = Array.isArray(raw.operations) ? raw.operations.filter((item): item is "CREATE" | "UPDATE" => item === "CREATE" || item === "UPDATE") : [];
      return operations.length === 2 && new Set(operations).size === 2 ? { type: "RECORD", operations: ["CREATE", "UPDATE"] } : defaultApprovalTrigger();
    }
    default:
      return defaultApprovalTrigger();
  }
}

export function normalizeApprovalDefinition(value: ApprovalDefinition): ApprovalDefinition {
  const draft = { ...value.draft, trigger: normalizeApprovalTrigger(value.draft?.trigger ?? value.trigger) };
  return { ...value, draft, trigger: normalizeApprovalTrigger(value.trigger ?? draft.trigger) };
}

export function approvalTriggerSummary(trigger?: ApprovalTrigger) {
  const current = normalizeApprovalTrigger(trigger);
  if (current.type === "SCHEDULE") return `每 ${current.intervalMinutes} 分钟`;
  if (current.type === "DATE_FIELD") return current.dateFieldId ? "按日期字段" : "请选择日期字段";
  if (current.type === "RECORD") return "兼容：新增和修改";
  return approvalTriggerLabels[current.type];
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}
