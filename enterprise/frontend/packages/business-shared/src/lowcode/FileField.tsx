import { TextEntry } from "@/components/controls";
import {mediaPolicy} from "./advanced-fields";
import {FieldFilePreview,fileCanPreview} from "./FieldFilePreview";
import { useEffect, useRef, useState } from "react";
import { FileText } from "@/shared/icons/catalog";
import { Button } from "@/components/motion/button";
import { CloseAction, DownloadAction, EyeAction, RunningIcon, UploadAction } from "@/shared/icons/motion";
import { api, fetchFile } from "@/shared/api/client";
import { safeImageExtensions, type LowcodeField } from "./field-model";

export type FileContext = { design?: boolean; tableId: string; versionId?: string; recordRevision?: number; changeId?: string; runId?: string; recordId?: string; shareToken?: string };
type FileMetadata = { id: string; name: string; contentType: string; size: number };
const sizeLabel = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
function filePath(id: string, context?: FileContext, content = false, inline = false) {
  const query = new URLSearchParams();
  if (context?.shareToken) query.set("shareToken", context.shareToken);
  if (inline) query.set("inline", "true");
  return `/api/v1/lc/files/${encodeURIComponent(id)}${content ? "/content" : ""}${query.size ? `?${query}` : ""}`;
}

function ImagePreview({ metadata, context }: { metadata: FileMetadata; context?: FileContext }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    void fetchFile(filePath(metadata.id, context, true, true), metadata.name, controller.signal).then(({ blob }) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setSource(url);
    }).catch(() => {});
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [metadata.id, metadata.name, context?.shareToken]);
  return source ? <img src={source} alt={metadata.name} className="h-28 w-full rounded-control bg-muted object-contain" /> : <div className="flex h-28 items-center justify-center rounded-control bg-muted text-caption text-muted-foreground">图片预览暂不可用</div>;
}

export function FileField({ id, field, value, onChange, context, disabled = false, readOnly = false, describedBy, invalid, onUploadingChange }: {
  id: string; field: LowcodeField; value: unknown; onChange: (ids: string[]) => void; context?: FileContext;
  disabled?: boolean; readOnly?: boolean; describedBy?: string; invalid?: boolean; onUploadingChange?: (busy: boolean) => void;
}) {
  const ids = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  const [metadata, setMetadata] = useState<Record<string, FileMetadata>>({});
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""),[preview,setPreview]=useState<FileMetadata>(),[coarse,setCoarse]=useState(()=>typeof window!=="undefined"&&!!window.matchMedia?.("(pointer: coarse)").matches);
  const policy=mediaPolicy(field,coarse);
  useEffect(()=>{const query=window.matchMedia("(pointer: coarse)"),update=()=>setCoarse(query.matches);query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  const chooser = useRef<HTMLInputElement>(null), upload = useRef<AbortController | null>(null);
  const latest = useRef({ ids, onChange }); latest.current = { ids, onChange };
  const uploadingCallback = useRef(onUploadingChange); uploadingCallback.current = onUploadingChange;
  const maxFiles = field.fileConfig?.maxFiles ?? 10, maxSize = (field.fileConfig?.maxSizeMb ?? 10) * 1024 * 1024;
  const accepted = field.fileConfig?.accept?.length ? field.fileConfig.accept.map((extension) => extension.toLowerCase()) : ["image", "displayImage"].includes(field.type) ? safeImageExtensions : [];
  const valueKey = ids.join(",");
  useEffect(() => () => { upload.current?.abort(); uploadingCallback.current?.(false); }, []);
  useEffect(() => {
    const controller = new AbortController();
    for (const fileId of ids) {
      void api<FileMetadata>(filePath(fileId, context), "GET", undefined, controller.signal).then((file) => {
        if (!controller.signal.aborted) setMetadata((existing) => ({ ...existing, [fileId]: file }));
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setUnavailable((existing) => ({ ...existing, [fileId]: error instanceof Error ? error.message : "文件暂不可用" }));
      });
    }
    return () => controller.abort();
  }, [valueKey, context?.shareToken]);
  async function addFiles(files: FileList | null) {
    if (!files?.length || !context || disabled || readOnly || busy || upload.current || !policy.uploadAllowed) return;
    setNotice("");
    const selected = Array.from(files);
    if (latest.current.ids.length + selected.length > maxFiles) { setNotice(`最多上传 ${maxFiles} 个文件`); return; }
    for (const file of selected) {
      const extension = /\.[^.]+$/.exec(file.name)?.[0].toLowerCase() ?? "";
      if (!file.size || file.size > maxSize) { setNotice(`${file.name}：文件不能为空，且不能超过 ${sizeLabel(maxSize)}`); return; }
      if (accepted.length && !accepted.includes(extension)) { setNotice(`${file.name}：请选择 ${accepted.join("、")} 文件`); return; }
    }
    const controller = new AbortController(); upload.current = controller; setBusy(true); uploadingCallback.current?.(true);
    try {
      let next = [...latest.current.ids];
      for (const file of selected) {
        const body = new FormData(); body.set("file", file); body.set("fieldId", field.id);
        if (context.design) body.set("design", "true");
        if (context.changeId) body.set("changeId", context.changeId);
        if (context.runId) body.set("runId", context.runId);
        if (context.recordId) body.set("recordId", context.recordId);
        if (context.shareToken) body.set("shareToken", context.shareToken);
        const result = await api<FileMetadata>(`/api/v1/lc/tables/${encodeURIComponent(context.tableId)}/files`, "POST", body, controller.signal);
        if (controller.signal.aborted) return;
        setMetadata((existing) => ({ ...existing, [result.id]: result }));
        next = [...next, result.id]; latest.current.onChange(next);
      }
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "上传失败，请重试");
    } finally { if (!controller.signal.aborted) { setBusy(false); uploadingCallback.current?.(false); } if (upload.current === controller) upload.current = null; }
  }
  async function download(fileId: string) {
    try {
      const file = await fetchFile(filePath(fileId, context, true), metadata[fileId]?.name);
      const url = URL.createObjectURL(file.blob), link = document.createElement("a");
      link.href = url; link.download = file.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice(error instanceof Error ? error.message : "下载失败，请重试"); }
  }
  return <div id={id} role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-required={field.required} className="space-y-2">
    {!!ids.length && <ul className={["image", "displayImage"].includes(field.type) ? "grid grid-cols-1 gap-2 @[380px]:grid-cols-2" : "space-y-2"}>
      {ids.map((fileId) => <li key={fileId} className="min-w-0 rounded-card border border-border p-2.5">
        {policy.preview && ["image", "displayImage"].includes(field.type) && metadata[fileId] && <ImagePreview metadata={metadata[fileId]} context={context} />}
        <div className="flex items-center gap-2"><span className="inline-flex size-4 shrink-0 text-muted-foreground"><FileText  /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-body" title={metadata[fileId]?.name}>{metadata[fileId]?.name ?? (unavailable[fileId] ? "文件暂不可用" : "正在读取文件信息…")}</p><p className="truncate text-caption text-muted-foreground">{metadata[fileId] ? sizeLabel(metadata[fileId].size) : unavailable[fileId]}</p></div>
          {policy.preview&&metadata[fileId]&&fileCanPreview(metadata[fileId].contentType)&&<Button variant="ghost" size="icon" aria-label={`预览${metadata[fileId].name}`} onClick={()=>setPreview(metadata[fileId])}><EyeAction size={16}/></Button>}{policy.download&&<Button variant="ghost" size="icon" aria-label={`下载${metadata[fileId]?.name ?? "文件"}`} onClick={() => void download(fileId)}><DownloadAction size={16} /></Button>}
          {!readOnly && <Button variant="ghost" size="icon" disabled={disabled || busy} aria-label={`移除${metadata[fileId]?.name ?? "文件"}`} onClick={() => onChange(ids.filter((entry) => entry !== fileId))}><CloseAction size={16} /></Button>}
        </div>
      </li>)}
    </ul>}
    {!readOnly ? <>
      <TextEntry ref={chooser} type="file" multiple capture={policy.capture} accept={accepted.join(",") || undefined} className="sr-only" tabIndex={-1} aria-label={`上传${field.label}`} disabled={disabled || busy || !context || !policy.uploadAllowed || ids.length >= maxFiles} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
      <Button variant="outline" size="sm" disabled={disabled || busy || !context || !policy.uploadAllowed || ids.length >= maxFiles} onClick={() => chooser.current?.click()}>{busy ? <RunningIcon running size={16} label="正在上传" /> : <UploadAction size={16} />}{busy ? "正在上传…" : policy.capture ? "拍摄图片" : ["image", "displayImage"].includes(field.type) ? "上传图片" : "上传附件"}</Button>
      <p className="text-caption leading-5 text-muted-foreground">{!context ? "试填预览不上传文件；打开实际表单后可上传。" : `最多 ${maxFiles} 个文件，每个不超过 ${field.fileConfig?.maxSizeMb ?? 10} MB${accepted.length ? `；支持 ${accepted.join("、")}` : ""}。`}</p>
    </> : !ids.length && <p className="text-body text-muted-foreground">未填写</p>}
    {!readOnly&&!policy.uploadAllowed&&<p className="text-caption text-muted-foreground">此表单仅在浏览器识别为触控设备时显示图片上传入口。</p>}
    {!readOnly&&policy.capture&&<p className="text-caption text-muted-foreground">浏览器将优先打开相机；可用来源由设备与浏览器决定。</p>}
    {preview&&policy.preview&&<FieldFilePreview name={preview.name} path={filePath(preview.id,context,true,true)} contentType={preview.contentType.split(";")[0].toLowerCase()} onClose={()=>setPreview(undefined)}/>}
    {notice && <p role="alert" className="text-caption text-destructive">{notice}</p>}
  </div>;
}
