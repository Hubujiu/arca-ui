import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox";
export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  minimum?: number;
  maximum?: number;
};
export type Step = {
  id: string;
  name: string;
  approverId: string | null;
  approverName?: string;
};
export type Draft = {
  name: string;
  description: string;
  fields: FormField[];
  steps: Step[];
};
export type FormVersion = {
  id: string;
  name: string;
  description: string;
  version: number;
  dataSchema: Record<string, unknown>;
  uiSchema: { fields: FormField[] };
  workflowSchema: { steps: Step[] };
};
export type Definition = {
  id: string;
  name: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  revision: number;
  version?: number;
  updatedAt: string;
  publishedVersionId?: string;
  publishedVersion?: FormVersion;
  draft?: Draft;
};
export type Values = Record<string, string | number | boolean>;
export type SubmissionStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";
export type SubmissionRow = {
  id: string;
  title: string;
  status: SubmissionStatus;
  formName: string;
  version: number;
  creatorName: string;
  createdAt: string;
  submittedAt?: string;
  completedAt?: string;
};
export type Submission = SubmissionRow & {
  formId: string;
  revision: number;
  data: Values;
  formVersion: FormVersion;
  canEdit: boolean;
  canWithdraw: boolean;
  myTaskId: string;
  tasks: { id: string; stepId: string; name: string; assigneeId: string }[];
  history: {
    id: string;
    actorName: string;
    action: "SUBMIT" | "APPROVE" | "REJECT" | "WITHDRAW";
    stepName: string;
    comment: string;
    createdAt: string;
  }[];
};
export const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "number", label: "数字 / 金额" },
  { value: "date", label: "日期" },
  { value: "select", label: "单项选择" },
  { value: "checkbox", label: "是否" },
];
export const statusNames = {
  DRAFT: "草稿",
  PENDING: "审批中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  WITHDRAWN: "已撤回",
  PUBLISHED: "已发布",
  ARCHIVED: "已停用",
};
export const controlClass =
  "w-full rounded-card border border-border bg-background px-3 py-2.5 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export function dateLabel(value?: string) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}
export function key(prefix: string) {
  return prefix + crypto.randomUUID().replaceAll("-", "");
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    api<T>(path, "GET", undefined, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => controller.abort();
  }, [path, attempt]);
  return { data, error, reload: () => setAttempt((n) => n + 1) };
}
