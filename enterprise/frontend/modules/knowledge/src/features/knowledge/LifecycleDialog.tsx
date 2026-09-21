import { useEffect, useState } from "react";
import { api, ApiError } from "@/shared/api/client";
import type { DocumentRow } from "@/shared/api/types";
import { AppModal, Button } from "@/shared/ui";
import { toast } from "@/shared/toast";

export type LifecycleTarget = { kind: "space" | "doc" | "categories" | "tags"; id: string; name: string };
type Impact = { token: string; documentCount: number; folderCount: number; documents: (DocumentRow & { folderName?: string })[] };

export function LifecycleDialog({ target, action, onClose, onComplete }: {
  target?: LifecycleTarget; action: "archive" | "delete"; onClose: () => void; onComplete: () => Promise<void>;
}) {
  const [impact, setImpact] = useState<Impact>();
  const [revision, setRevision] = useState<number>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const deleting = action === "delete";
  const label = deleting ? "永久删除" : "归档";
  useEffect(() => {
    setImpact(undefined); setRevision(undefined); setReady(false); setError("");
    if (!target) return;
    const controller = new AbortController();
    const load = async () => {
      if (target.kind === "space") setImpact(await api<Impact>(`/api/v1/spaces/${target.id}/lifecycle-impact`, "GET", undefined, controller.signal));
      if (target.kind === "doc") setRevision((await api<DocumentRow>(`/api/v1/documents/${target.id}`, "GET", undefined, controller.signal)).rowVersion);
      if (!controller.signal.aborted) setReady(true);
    };
    load().catch(e => { if (!controller.signal.aborted) setError(e instanceof ApiError ? e.message : "无法加载影响清单"); });
    return () => controller.abort();
  }, [target?.id, target?.kind, action, attempt]);

  async function submit() {
    if (!target || !ready || busy) return;
    setBusy(true); setError("");
    try {
      const path = target.kind === "space" ? "spaces" : target.kind === "doc" ? "documents" : target.kind;
      const suffix = deleting ? (target.kind === "space" || target.kind === "doc" ? "" : "/permanent") : "/archive";
      const result = await api<{ completed: boolean; operationId: string } | undefined>(`/api/v1/${path}/${target.id}${suffix}`, deleting ? "DELETE" : "POST",
        target.kind === "space" ? { token: impact?.token } : target.kind === "doc" ? { rowVersion: revision } : undefined);
      if (result?.completed === false) toast.show({ title: "删除已提交", description: "原文件与索引仍在清理中；服务恢复后会自动重试" });
      else toast.success(`已${label}`);
      onClose();
      await onComplete();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `无法${label}`);
      setReady(false);
    } finally { setBusy(false); }
  }

  return <AppModal open={!!target} onOpenChange={open => { if (!open && !busy) onClose(); }} dismissible={!busy}
    title={`${label}「${target?.name || ""}」？`}
    description={deleting ? (target?.kind === "categories" || target?.kind === "tags" ? "永久删除无法撤销。此条目及文档上的关联会被清除，文档文件仍然保留。" : "永久删除无法撤销。原文件、全部历史版本、预览和检索数据都会被清除。") : "归档后从目录和检索中移除，文件和历史版本仍会保留，可在归档页管理。"}
    footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>取消</Button><Button variant="primary" className={deleting ? "bg-destructive text-white hover:bg-destructive/90" : undefined} disabled={!ready || busy} onClick={() => void submit()}>{busy ? "正在处理…" : `确认${label}`}</Button></div>}>
    {target?.kind === "space" && impact && <div className="space-y-3 text-body">
      <p>此空间包含 <strong>{impact.documentCount}</strong> 份文件、{impact.folderCount} 个文件夹。以下文件仅属于此空间，将连带{label}：</p>
      {impact.documents.length ? <ul className="divide-y divide-border rounded-card border border-border px-3">{impact.documents.map(doc => <li key={doc.id} className="py-2"><p className="break-words font-medium">{doc.title}</p><p className="break-words text-caption text-muted-foreground">{doc.folderName || "空间根目录"} · {doc.originalFilename || "无版本"}{doc.status === "ARCHIVED" ? " · 已归档" : ""}</p></li>)}</ul> : <p className="text-muted-foreground">没有会被连带处理的文件。</p>}
      <p className="text-muted-foreground">其他空间中的独立副本不受影响。</p>
    </div>}
    {(target?.kind === "categories" || target?.kind === "tags") && <p className="text-body">将删除此{target.kind === "categories" ? "分类" : "标签"}和文档上的关联，文档本身及其工作空间会保留。</p>}
    {!ready && !error && <p role="status" className="text-body text-muted-foreground">正在核对影响范围…</p>}
    {error && <div role="alert" className="space-y-3 text-body text-destructive"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => setAttempt(n => n + 1)}>重新加载清单</Button></div>}
  </AppModal>;
}
