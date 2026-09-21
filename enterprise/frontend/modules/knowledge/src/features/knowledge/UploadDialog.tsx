import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/motion/checkbox";
import { FileUpload, type FileUploadItem } from "@/components/motion/file-upload";
import { api, ApiError } from "@/shared/api/client";
import { AI_POLICIES, CONTENT_MODES, type AiPolicy, type ContentMode, type JobRow, type VersionRow } from "@/shared/api/types";
import { AlertBanner, AppModal, Button, FieldSelect, Input, StatefulButton } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { useCatalog } from "./AppShell";
import { aiPolicyLabel } from "./status";

const stages = ["上传中", "校验中", "解析 / 索引中", "等待预览 / 发布", "可检索"];

export function UploadDialog({
  open,
  onOpenChange,
  spaceId,
  folderId,
  documentId,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  folderId?: string;
  documentId?: string;
  existing?: { title: string; aiPolicy: AiPolicy; contentMode?: ContentMode };
}) {
  const navigate = useNavigate();
  const { spaces, foldersBySpace, categories, tags, reload } = useCatalog();
  const [items, setItems] = useState<FileUploadItem[]>([]);
  const [title, setTitle] = useState("");
  const [space, setSpace] = useState(spaceId);
  const [folder, setFolder] = useState(folderId || "");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [aiPolicy, setAiPolicy] = useState<AiPolicy>("NO_MODEL");
  const [contentMode, setContentMode] = useState<ContentMode>("STRUCTURED_TEXT");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>();
  const [version, setVersion] = useState<VersionRow>();
  const [createdDocumentId, setCreatedDocumentId] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const folders = foldersBySpace[space] || [];
  const file = items[0]?.file;

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setTitle(existing?.title || "");
    setSpace(spaceId);
    setFolder(folderId || "");
    setCategoryId("");
    setTagIds([]);
    setAiPolicy(existing?.aiPolicy || "NO_MODEL");
    setContentMode(existing?.contentMode || "STRUCTURED_TEXT");
    setBusy(false);
    setStage(undefined);
    setVersion(undefined);
    setCreatedDocumentId(documentId);
    setFailure(undefined);
  }, [open, spaceId, folderId, documentId, existing]);

  function patchUpload(progress: number, status: FileUploadItem["status"], error?: string) {
    setItems((current) =>
      current.map((item, index) => (index === 0 ? { ...item, progress, status, error } : item)),
    );
  }

  async function submit(retryVersion?: VersionRow) {
    if (!file && !retryVersion) return;
    setBusy(true);
    setFailure(undefined);
    patchUpload(12, "uploading");
    setStage(stages[0]);
    try {
      let next = retryVersion;
      if (retryVersion?.status === "FAILED") {
        const docId = documentId || retryVersion.documentId;
        if (!docId) throw new ApiError(500, "无法重试");
        await api(`/api/v1/documents/${docId}/versions/${retryVersion.id}/retry`, "POST");
        next = retryVersion;
      } else if (!next && file) {
        const data = new FormData();
        data.append("file", file);
        data.append(
          "metadata",
          new Blob(
            [
              JSON.stringify({
                spaceId: space,
                folderId: folder || null,
                title: title || file.name,
                categoryId: categoryId || null,
                tagIds,
                aiPolicy,
                contentMode,
              }),
            ],
            { type: "application/json" },
          ),
          "metadata.json",
        );
        patchUpload(35, "uploading");
        setStage(stages[1]);
        const path = documentId ? `/api/v1/documents/${documentId}/versions` : "/api/v1/documents";
        next = await api<VersionRow>(path, "POST", data, undefined, { "Idempotency-Key": crypto.randomUUID() });
        setVersion(next);
      }
      if (!next) throw new ApiError(500, "上传没有返回版本");
      const docId = documentId || next.documentId;
      if (!docId) throw new ApiError(500, "上传已完成，但没有返回文档编号");
      setCreatedDocumentId(docId);
      setStage(stages[2]);
      patchUpload(58, "uploading");
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const versions = await api<VersionRow[]>(`/api/v1/documents/${docId}/versions`);
        const current = versions.find((item) => item.id === next.id) || next;
        setVersion({ ...current, documentId: current.documentId || next.documentId || docId });
        if (current.status === "FAILED") {
          setFailure(current.errorCode || "处理失败，旧版本仍可使用。");
          patchUpload(100, "error", current.errorCode || "处理失败");
          return;
        }
        if (current.status === "PENDING_REVIEW" || current.status === "ACTIVE") {
          setStage(current.status === "ACTIVE" ? stages[4] : stages[3]);
          patchUpload(100, "success");
          return;
        }
        if (attempt === 8 || attempt === 20) {
          const jobs = await api<JobRow[]>(`/api/v1/documents/${docId}/jobs`);
          const failed = jobs.find((job) => job.documentVersionId === next.id && job.status === "FAILED");
          if (failed) {
            setFailure(failed.errorCode || "后台处理失败");
            patchUpload(100, "error", failed.errorCode || "后台处理失败");
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setFailure("解析时间较长。文件已上传，可稍后在目录中查看处理结果。");
      patchUpload(100, "error", "处理超时");
      setStage(stages[2]);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "上传失败";
      setFailure(message);
      patchUpload(100, "error", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={documentId ? "上传新版本" : "上传文件"}
      description="只能上传平台外已经完成的文件。处理失败时不会切换当前版本。"
      className="max-w-xl"
    >
      {version && (version.status === "PENDING_REVIEW" || version.status === "ACTIVE") ? (
        <div className="flex flex-col gap-4">
          <p className="text-body leading-6 text-muted-foreground">
            文件已处理完成。新文档可检索前需要发布；新版本在发布前不会替换当前版本。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const docId = documentId || version.documentId || createdDocumentId;
                if (!docId) {
                  toast.error("找不到文档编号，无法发布");
                  return;
                }
                try {
                  if (version.status === "PENDING_REVIEW") {
                    const latest = await api<{ rowVersion: number }>(`/api/v1/documents/${docId}`);
                    await api(`/api/v1/documents/${docId}/publish`, "POST", { versionId: version.id, rowVersion: latest.rowVersion });
                    toast.success("已发布");
                  }
                  onOpenChange(false);
                  await reload();
                  navigate(`/documents/${docId}`);
                } catch (caught) {
                  toast.error(caught instanceof ApiError ? caught.message : "发布失败");
                }
              }}
            >
              {version.status === "ACTIVE" ? "查看文档" : "发布并查看"}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="rounded-panel border border-border bg-background p-3">
            <FileUpload
              value={items}
              variant="centered"
              onValueChange={setItems}
              onFilesAdded={(_next, files) => {
                const nextFile = files[0];
                if (nextFile && !title) setTitle(nextFile.name);
              }}
              onRetry={(item) => {
                if (version) void submit(version);
                else if (item.file) void submit();
              }}
              multiple={false}
              maxFiles={1}
              disabled={busy}
              title="把已完成的文件拖到这里"
              description="最大 50 MiB · PDF、Office、Markdown、文本"
              browseLabel="浏览文件"
            />
          </div>
          {!documentId ? (
            <>
              <Input label="标题" value={title} onChange={setTitle} required maxLength={300} />
              <FieldSelect
                label="位置"
                value={space}
                onChange={(value) => {
                  setSpace(value);
                  setFolder("");
                }}
                options={spaces.map((item) => ({ value: item.id, label: item.name }))}
              />
              <FieldSelect
                label="文件夹"
                value={folder}
                onChange={setFolder}
                options={[{ value: "", label: "空间根目录" }, ...folders.map((item) => ({ value: item.id, label: item.name }))]}
              />
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
              <FieldSelect
                label="处理方式"
                value={contentMode}
                onChange={(value) => setContentMode(value as ContentMode)}
                options={CONTENT_MODES.map((value) => ({
                  value,
                  label: value === "STRUCTURED_TEXT" ? "结构化解析" : "仅元数据",
                }))}
              />
              <p className="px-1 text-caption text-muted-foreground">结构化解析会生成只读预览；仅元数据不会抽取正文。</p>
            </>
          ) : (
            <p className="text-caption text-muted-foreground">新版本沿用当前文档的AI 策略，发布前旧版本继续可用。</p>
          )}
          {stage ? <p className="text-caption text-muted-foreground">总体状态：{stage}</p> : null}
          {failure ? <AlertBanner title={failure} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            {failure && version ? (
              <StatefulButton type="button" state={busy ? "loading" : "idle"} loadingText="重试中…" onClick={() => void submit(version)}>
                整体重试
              </StatefulButton>
            ) : (
              <StatefulButton type="submit" state={busy ? "loading" : "idle"} loadingText="处理中…" disabled={!file}>
                上传并处理
              </StatefulButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
}
