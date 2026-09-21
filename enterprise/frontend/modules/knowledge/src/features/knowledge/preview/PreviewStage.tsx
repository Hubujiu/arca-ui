import { lazy, Suspense, useEffect, useState } from "react";
import { IconChevronLeft, IconLock, IconMenu, IconRotate } from "@/shared/icons";
import { api, ApiError, fetchFile } from "@/shared/api/client";
import type { Preview } from "@/shared/api/types";
import { Button, EmptyState } from "@/shared/ui";
import { fileKind } from "../status";
import { FileKindIcon } from "@/shared/icons/file-kind";
import { StructuredViewer } from "./StructuredViewer";
import { ImageViewer } from "./ImageViewer";

const PdfViewer = lazy(() => import("@/file-preview/PdfViewer").then(m => ({ default: m.PdfViewer })));
const HtmlViewer = lazy(() => import("./HtmlViewer").then(m => ({ default: m.HtmlViewer })));
type Manifest = { versionId: string; filename: string; mode: "PDF" | "IMAGE" | "HTML" | "STRUCTURED"; status: "PENDING" | "RUNNING" | "READY" | "FAILED" | "UNAVAILABLE"; errorCode?: string };

export function PreviewStage({ documentId, versionId, title, filename, mediaType }: {
  documentId: string; versionId?: string | null; title?: string; filename?: string; mediaType?: string;
}) {
  const [manifest, setManifest] = useState<Manifest>();
  const [structured, setStructured] = useState<Preview>();
  const [blob, setBlob] = useState<Blob>();
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();
  const [reading, setReading] = useState(false);
  const [outline, setOutline] = useState(true);
  const [revision, setRevision] = useState(0);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    setManifest(undefined); setStructured(undefined); setBlob(undefined); setHtml(undefined); setError(undefined); setReading(false); setWaiting(false);
    if (!versionId) return;
    const base = `/api/v1/documents/${documentId}`;
    const query = `?versionId=${encodeURIComponent(versionId)}`;
    let attempts = 0;
    async function load(first: boolean) {
      try {
        const next = await api<Manifest>(`${base}/preview/manifest${query}`, first ? "POST" : "GET", undefined, abort.signal);
        if (cancelled) return;
        setManifest(next);
        let structuredPending = false;
        try {
          const value = await api<Preview>(`${base}/preview${query}`, "GET", undefined, abort.signal);
          if (!cancelled) setStructured(value);
        } catch (caught) {
          if (!(caught instanceof ApiError && caught.status === 409)) throw caught;
          structuredPending = true;
        }
        if (cancelled) return;
        if (next.mode === "STRUCTURED" && structuredPending) {
          if (++attempts < 60) timer = setTimeout(() => void load(false), 2000);
          else setWaiting(true);
          return;
        }
        if (next.status === "PENDING" || next.status === "RUNNING") {
          if (++attempts < 60) timer = setTimeout(() => void load(false), 2000);
          else setWaiting(true);
          return;
        }
        if (next.status === "READY" && next.mode !== "STRUCTURED") {
          const file = await fetchFile(`${base}/preview/content${query}`, undefined, abort.signal);
          if (cancelled) return;
          if (next.mode === "HTML") {
            const text = await file.blob.text();
            if (!cancelled) setHtml(text);
          } else setBlob(file.blob);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : "预览加载失败，请稍后重试");
      }
    }
    void load(true);
    return () => { cancelled = true; abort.abort(); clearTimeout(timer); };
  }, [documentId, versionId, revision]);

  const content = structured && "nodes" in structured ? structured : undefined;
  const hasContent = Boolean(content?.nodes?.length || content?.tables?.length);
  const pending = manifest?.status === "PENDING" || manifest?.status === "RUNNING";
  const unavailable = manifest?.status === "FAILED" || manifest?.status === "UNAVAILABLE";
  const showStructured = reading || manifest?.mode === "STRUCTURED" || unavailable;
  const kind = fileKind(manifest?.filename || filename, mediaType);
  const displayName = title || manifest?.filename || filename || "文档预览";
  const notice = manifest?.status === "UNAVAILABLE" ? "文件预览暂不可用，可先阅读正文。" : "文件预览转换失败，可先阅读正文或稍后刷新重试。";

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label="文件预览">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
        <FileKindIcon kind={kind} size={18} />
        <p className="min-w-0 flex-1 truncate text-body font-medium">{displayName}</p>
        <span className="rounded-control bg-secondary px-2 py-1 text-caption text-muted-foreground">{kind}</span>
        {hasContent && manifest?.mode !== "STRUCTURED" && <div className="flex rounded-control bg-background p-1" role="group" aria-label="预览模式">
          <Button size="sm" variant={!reading ? "secondary" : "ghost"} onClick={() => setReading(false)}>文件预览</Button>
          <Button size="sm" variant={reading ? "secondary" : "ghost"} onClick={() => setReading(true)}>正文</Button>
        </div>}
        {showStructured && hasContent && <Button size="icon" variant="ghost" aria-label="切换目录" aria-pressed={outline} onClick={() => setOutline(v => !v)}>{outline ? <IconChevronLeft size={16} /> : <IconMenu size={16} />}</Button>}
        <Button size="icon" variant="ghost" aria-label="刷新预览" onClick={() => setRevision(v => v + 1)}><IconRotate size={16} /></Button>
      </div>
      {unavailable && <p role="status" className="border-b border-border bg-secondary/40 px-4 py-2 text-caption text-muted-foreground">{notice}</p>}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {error ? <EmptyState title="无法打开预览">{error}</EmptyState> : !versionId ? <EmptyState title="暂无可预览的版本" /> : showStructured ? (
          hasContent ? <StructuredViewer filename={displayName} nodes={content?.nodes || []} tables={content?.tables || []} outline={outline} /> : <EmptyState title="暂无正文预览">这份文件尚未生成可阅读的正文。</EmptyState>
        ) : pending || !manifest ? <EmptyState loading={!waiting} title={waiting ? "转换仍在进行" : "正在准备预览…"}>{waiting ? "稍后点击刷新查看结果。" : "首次打开需要生成预览，完成后自动显示。"}</EmptyState>
          : html != null ? <Suspense fallback={<EmptyState loading title="正在打开正文排版…" />}><HtmlViewer html={html} title={displayName} /></Suspense>
          : blob && manifest.mode === "PDF" ? <Suspense fallback={<EmptyState loading title="正在打开页面…" />}><PdfViewer blob={blob} /></Suspense>
          : blob && manifest.mode === "IMAGE" ? <ImageViewer blob={blob} title={displayName} />
          : <EmptyState loading title="正在载入预览…" />}
      </div>
      <p className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-2 text-caption text-muted-foreground"><IconLock size={16} />只读预览 · 修改内容请上传新版本</p>
    </section>
  );
}
