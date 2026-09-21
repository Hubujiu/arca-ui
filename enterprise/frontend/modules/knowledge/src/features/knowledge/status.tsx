import { AnimatedBadge, type AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import type { DocumentRow } from "@/shared/api/types";


export const aiPolicyLabel = {
  EXTERNAL_ALLOWED: "可外部处理",
  LOCAL_ONLY: "仅本地",
  NO_MODEL: "禁止模型",
} as const;


export function fileKind(filename?: string, mediaType?: string) {
  const name = (filename || "").toLowerCase();
  const type = (mediaType || "").toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown") || type.includes("markdown")) return "MD";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("wordprocessingml") || type.includes("msword") || type.includes("vnd.ms-word")) return "DOCX";
  if (type.includes("spreadsheetml") || type.includes("ms-excel") || type.includes("vnd.ms-excel")) return "XLSX";
  if (type.includes("presentationml") || type.includes("ms-powerpoint") || type.includes("vnd.ms-powerpoint")) return "PPTX";
  if (type.startsWith("image/")) return "IMAGE";
  if (type.includes("html")) return "HTML";
  if (type === "text/plain" || type.startsWith("text/")) return "TXT";
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "DOCX";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "XLSX";
  if (name.endsWith(".pptx") || name.endsWith(".ppt")) return "PPTX";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".webp") || name.endsWith(".svg"))
    return "IMAGE";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "HTML";
  if (name.endsWith(".txt")) return "TXT";
  return "文件";
}

export function documentDisplayName(doc?: {
  title?: string;
  originalFilename?: string;
  original_filename?: string;
}) {
  return doc?.title?.trim() || doc?.originalFilename || doc?.original_filename || "未命名文件";
}

export function documentFileKind(doc?: {
  originalFilename?: string;
  mediaType?: string;
  original_filename?: string;
  media_type?: string;
}) {
  if (!doc) return "文件";
  return fileKind(doc.originalFilename || doc.original_filename, doc.mediaType || doc.media_type);
}

export function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export type ProcessTone = "success" | "progress" | "danger" | "muted";

const TONE_STATUS: Record<ProcessTone, AnimatedBadgeStatus> = {
  success: "success",
  progress: "loading",
  danger: "danger",
  muted: "neutral",
};

export function processState(doc: Pick<DocumentRow, "status"> & { versionStatus?: string }) {
  if (doc.status === "ARCHIVED") return { label: "已归档", tone: "muted" as ProcessTone };
  if (doc.status === "WITHDRAWN") return { label: "已下架", tone: "muted" as ProcessTone };
  if (doc.status === "ACTIVE") return { label: "可检索", tone: "success" as ProcessTone };
  const version = doc.versionStatus;
  if (version === "FAILED") return { label: "失败", tone: "danger" as ProcessTone };
  if (version === "PENDING_REVIEW") return { label: "等待发布", tone: "progress" as ProcessTone };
  if (version === "PROCESSING" || version === "UPLOADED" || version === "RETRY") {
    return { label: "解析中", tone: "progress" as ProcessTone };
  }
  return { label: "待处理", tone: "muted" as ProcessTone };
}

export function ProcessBadge({ doc }: { doc: Pick<DocumentRow, "status"> & { versionStatus?: string } }) {
  const state = processState(doc);
  return (
    <AnimatedBadge status={TONE_STATUS[state.tone]} size="sm">
      {state.label}
    </AnimatedBadge>
  );
}

export function versionLabel(status?: string, current?: boolean) {
  if (current && status === "ACTIVE") return "当前版本";
  if (status === "HISTORICAL") return "历史版本";
  if (status === "FAILED") return "失败";
  if (status === "PENDING_REVIEW") return "等待发布";
  if (status === "PROCESSING" || status === "UPLOADED") return "解析中";
  return status || "未知";
}
