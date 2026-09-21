import { ContentStage } from "@/shared/design-system/workspace/ContentStage";
import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/shared/api/client";
import type { DocumentRow, Space, Term } from "@/shared/api/types";
import { Button, EmptyState, FieldSelect } from "@/shared/ui";
import { useCatalog } from "./catalog";
import { LifecycleDialog, type LifecycleTarget } from "./LifecycleDialog";

export function ArchivePage() {
  const UI = useWorkspaceUI();
  const { me, reload } = useCatalog();
  const [kind, setKind] = useState("documents");
  const [rows, setRows] = useState<(DocumentRow | Space | Term)[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const requestKey = `${kind}/${offset}/${generation}`;
  const [completed, setCompleted] = useState("");
  const [target, setTarget] = useState<LifecycleTarget>();
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setRows([]);
    const query = kind === "documents" ? `archived=true&limit=100&offset=${offset}` : "status=ARCHIVED";
    api<(DocumentRow | Space | Term)[]>(`/api/v1/${kind}?${query}`, "GET", undefined, controller.signal)
      .then(items => { if (!controller.signal.aborted) { setRows(items); setCompleted(requestKey); } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof ApiError ? e.message : "无法加载归档"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, offset, generation, requestKey]);
  return <>
    <UI.PageHeader title="归档" description="已归档内容不参与检索，数据仍然保留。永久删除会清除文件及全部历史版本。" />
    <UI.Panel className="overflow-hidden"><UI.Toolbar><div className="w-52">
    <FieldSelect label="归档类型" value={kind} onChange={value => { setKind(value); setOffset(0); }} options={[{ value: "documents", label: "文件" }, { value: "spaces", label: "工作空间" }, { value: "categories", label: "分类" }, { value: "tags", label: "标签" }]} />
    </div></UI.Toolbar>
    <ContentStage ready={!loading && completed === requestKey} identity={requestKey} error={error ? <div><p>{error}</p><Button onClick={() => setGeneration(n => n + 1)}>重试</Button></div> : undefined}>
    {rows.length ? <div className="divide-y divide-border overflow-hidden rounded-control border border-border bg-card px-5">
      {rows.map(row => {
        const name = "title" in row ? row.title : row.name;
        const canDelete = kind === "documents" || (kind === "spaces" ? (row as Space).canManage : me?.systemRole === "ADMIN");
        return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="break-words font-medium">{"title" in row ? <Link to={`/documents/${row.id}`}>{name}</Link> : name}</p>{"title" in row && <p className="break-words text-caption text-muted-foreground">{row.originalFilename}</p>}</div>{canDelete && <Button variant="outline" size="sm" onClick={() => setTarget({ kind: kind === "documents" ? "doc" : kind === "spaces" ? "space" : kind as "categories" | "tags", id: row.id, name })}>永久删除</Button>}</div>;
      })}
    </div> : <EmptyState title="暂无归档内容">归档后的内容会显示在这里。</EmptyState>}
    {kind === "documents" && <div className="flex justify-end gap-2"><Button variant="outline" disabled={loading || offset === 0} onClick={() => setOffset(n => n - 100)}>上一页</Button><Button variant="outline" disabled={loading || rows.length < 100 || offset >= 10000} onClick={() => setOffset(n => n + 100)}>下一页</Button></div>}
    </ContentStage></UI.Panel>
    <LifecycleDialog target={target} action="delete" onClose={() => setTarget(undefined)} onComplete={async () => { setGeneration(n => n + 1); await reload(); }} />
  </>;
}
