import { LifecycleDialog } from "./LifecycleDialog";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/motion/checkbox";
import { api, ApiError, download } from "@/shared/api/client";
import { AI_POLICIES, type AiPolicy, type DocumentRow, type Preview, type VersionRow } from "@/shared/api/types";
import { AppModal, Button, EmptyState, ErrorState, FieldSelect, Input, StatefulButton } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { useCatalog } from "./AppShell";
import { DocumentDock } from "./preview/DocumentDock";
import { PreviewStage } from "./preview/PreviewStage";
import { aiPolicyLabel } from "./status";
import { ShareControl } from "./ShareControl";
import { UploadDialog } from "./UploadDialog";

export function DocumentPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [lifecycle, setLifecycle] = useState<"archive" | "delete">();
  const { documents, reload } = useCatalog();
  const cached = documents.find((item) => item.id === id);
  const [doc, setDoc] = useState<DocumentRow | undefined>(cached);
  const [preview, setPreview] = useState<Preview>();
  const [versions, setVersions] = useState<VersionRow[]>();
  const [error, setError] = useState<ApiError>();
  const [metaOpen, setMetaOpen] = useState(false);
  const [upload, setUpload] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadController = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(false);
  const routeId = useRef(id);
  routeId.current = id;

  async function load() {
    // A completed mutation on the previous route must not start a stale read.
    if (!mounted.current || routeId.current !== id) return;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const current = () => mounted.current && !controller.signal.aborted &&
      loadController.current === controller && routeId.current === id;
    const read = <T,>(path: string) => api<T>(path, "GET", undefined, controller.signal);
    try {
      const next = await read<DocumentRow>(`/api/v1/documents/${id}`);
      if (!current()) return;
      setDoc(next);
      try {
        const nextPreview = await read<Preview>(`/api/v1/documents/${id}/preview`);
        if (!current()) return;
        setPreview(nextPreview);
      } catch (caught) {
        if (!current()) return;
        if (caught instanceof ApiError && caught.status === 409) setPreview(undefined);
        else throw caught;
      }
      try {
        const nextVersions = await read<VersionRow[]>(`/api/v1/documents/${id}/versions`);
        if (!current()) return;
        setVersions(nextVersions);
      } catch (caught) {
        if (!current()) return;
        if (caught instanceof ApiError && (caught.status === 403 || caught.status === 404)) setVersions(undefined);
        else throw caught;
      }
    } catch (caught) {
      if (current()) throw caught;
    }
  }

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setError(undefined);
    setPreview(undefined);
    setVersions(undefined);
    setMetaOpen(false);
    setUpload(false);
    setBusy(false);
    setDoc(documents.find((item) => item.id === id));
    load().catch((caught) => {
      if (!cancelled && caught instanceof ApiError) setError(caught);
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      loadController.current?.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!cached || cached.id !== id) return;
    setDoc((current) => {
      if (!current || current.id !== cached.id) return cached;
      if (
        current.title === cached.title &&
        current.folderId === cached.folderId &&
        current.rowVersion === cached.rowVersion &&
        current.createdByName === cached.createdByName
      ) {
        return current;
      }
      return {
        ...current,
        title: cached.title,
        folderId: cached.folderId,
        rowVersion: cached.rowVersion,
        createdByName: cached.createdByName,
        createdByUsername: cached.createdByUsername,
      };
    });
  }, [cached, id]);

  if (error?.status === 403) return <ErrorState status={403} title="权限不足">你不能查看这份文档。</ErrorState>;
  if (error?.status === 404) return <ErrorState status={404} title="文档不可见">它可能不存在、已下架，或不在你的访问范围内。</ErrorState>;
  if (error) return <ErrorState status={error.status} title="无法打开文档">{error.message}</ErrorState>;
  if (!doc) return <EmptyState loading title="正在打开文档…" />;

  const filename =
    doc.originalFilename ||
    versions?.find((item) => item.id === doc.currentVersionId)?.originalFilename ||
    versions?.[0]?.originalFilename ||
    (preview && "filename" in preview ? preview.filename : undefined);
  const mediaType = doc.mediaType || versions?.[0]?.mediaType;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-5 py-2"><ShareControl key={doc.id} kind="document" id={doc.id} name={doc.title} creatorName={doc.createdByName} /></div>
      <PreviewStage key={`${doc.id}:${doc.currentVersionId || versions?.[0]?.id || ""}`} documentId={doc.id} versionId={doc.currentVersionId || versions?.[0]?.id} title={doc.title} filename={filename} mediaType={mediaType} />
      <div className="flex shrink-0 flex-wrap gap-2 px-5 py-2">
        {doc.status === "ARCHIVED" && <span className="self-center text-body text-muted-foreground">已归档 · 不参与检索</span>}
        {versions && <>{doc.status !== "ARCHIVED" && <Button variant="outline" size="sm" onClick={() => setLifecycle("archive")}>归档文件</Button>}<Button variant="outline" size="sm" onClick={() => setLifecycle("delete")}>永久删除</Button></>}
      </div>
      <LifecycleDialog target={lifecycle ? { kind: "doc", id: doc.id, name: doc.title } : undefined} action={lifecycle || "archive"} onClose={() => setLifecycle(undefined)} onComplete={async () => { navigate("/archive"); await reload(); }} />
      <DocumentDock
        doc={{ ...doc, originalFilename: filename, mediaType }}
        versions={versions}
        busy={busy || doc.status === "ARCHIVED"}
        onDownload={() =>
          download(`/api/v1/documents/${id}/download`).catch((caught) =>
            toast.error(caught instanceof ApiError ? caught.message : "下载失败"),
          )
        }
        onUpload={() => setUpload(true)}
        onEdit={() => setMetaOpen(true)}
        onPublish={async (version) => {
          setBusy(true);
          try {
            await api(`/api/v1/documents/${id}/publish`, "POST", { versionId: version.id, rowVersion: doc.rowVersion });
            toast.success("已发布");
            await load();
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "发布失败");
          } finally {
            setBusy(false);
          }
        }}
        onRetry={async (version) => {
          setBusy(true);
          try {
            await api(`/api/v1/documents/${id}/versions/${version.id}/retry`, "POST");
            toast.success("已开始重试");
            await load();
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "无法重试");
          } finally {
            setBusy(false);
          }
        }}
      />
      <MetadataDialog
        document={doc}
        open={metaOpen}
        onOpenChange={setMetaOpen}
        onSaved={async () => {
          await load();
          await reload();
        }}
      />
      <UploadDialog
        open={upload}
        onOpenChange={(open) => {
          const wasOpen = upload;
          setUpload(open);
          if (wasOpen && !open) void load();
        }}
        spaceId={doc.spaceId}
        folderId={doc.folderId || undefined}
        documentId={doc.id}
        existing={{
          title: doc.title,
          aiPolicy: doc.aiPolicy,
          contentMode: versions?.[0]?.contentMode,
        }}
      />
    </div>
  );
}

function MetadataDialog({
  document,
  open,
  onOpenChange,
  onSaved,
}: {
  document: DocumentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const { categories, tags } = useCatalog();
  const [title, setTitle] = useState(document.title);
  const [categoryId, setCategoryId] = useState(document.categoryId || "");
  const [tagIds, setTagIds] = useState(document.tagIds || []);
  const [aiPolicy, setAiPolicy] = useState<AiPolicy>(document.aiPolicy);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(document.title);
    setCategoryId(document.categoryId || "");
    setTagIds(document.tagIds || []);
    setAiPolicy(document.aiPolicy);
  }, [document, open]);

  return (
    <AppModal open={open} onOpenChange={onOpenChange} title="编辑元数据" description="只修改分类、标签和安全属性，不会改动原文件正文。">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await api(`/api/v1/documents/${document.id}`, "PATCH", {
              title,
              folderId: document.folderId,
              categoryId: categoryId || null,
              tagIds,
              aiPolicy,
              rowVersion: document.rowVersion,
            });
            toast.success("元数据已更新");
            onOpenChange(false);
            await onSaved();
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "保存失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="标题" value={title} onChange={setTitle} required maxLength={300} />
        <FieldSelect
          label="分类"
          value={categoryId}
          onChange={setCategoryId}
          options={[{ value: "", label: "未分类" }, ...categories.filter((term) => term.status === "ACTIVE").map((term) => ({ value: term.id, label: term.name }))]}
        />
        <div className="flex flex-col gap-2">
          <span className="px-1 text-body font-medium text-foreground">标签</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
            {tags
              .filter((term) => term.status === "ACTIVE")
              .map((term) => (
                <Checkbox
                  key={term.id}
                  checked={tagIds.includes(term.id)}
                  onCheckedChange={(checked) =>
                    setTagIds(checked ? [...tagIds, term.id] : tagIds.filter((id) => id !== term.id))
                  }
                  label={term.name}
                />
              ))}
          </div>
        </div>
        <FieldSelect
          label="AI 策略"
          value={aiPolicy}
          onChange={(value) => setAiPolicy(value as AiPolicy)}
          options={AI_POLICIES.map((value) => ({ value, label: aiPolicyLabel[value] }))}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <StatefulButton type="submit" state={busy ? "loading" : "idle"} loadingText="保存中…">
            保存
          </StatefulButton>
        </div>
      </form>
    </AppModal>
  );
}
