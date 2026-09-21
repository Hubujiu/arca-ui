import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";
import { ContentStage } from "@/shared/design-system/workspace/ContentStage";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/shared/api/client";
import type { SearchHit } from "@/shared/api/types";
import { IconSearch } from "@/shared/icons";
import { Button, EmptyState, ErrorState, FilterSelect, Input } from "@/shared/ui";
import { useCatalog } from "./AppShell";
import { aiPolicyLabel, documentFileKind } from "./status";
import { FileKindIcon } from "@/shared/icons/file-kind";

function highlight(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    ),
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const UI = useWorkspaceUI();
  const [params, setParams] = useSearchParams();
  const { spaces, categories, tags, documents } = useCatalog();
  const q = params.get("q") || "";
  const [draft, setDraft] = useState(q);
  const spaceId = params.get("spaceId") || "";
  const categoryId = params.get("categoryId") || "";
  const tagId = params.get("tagId") || "";
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(false);
  const queryKey = JSON.stringify([q.trim(), spaceId, categoryId, tagId]);
  const [completedKey, setCompletedKey] = useState("");

  useEffect(() => setDraft(q), [q]);

  useEffect(() => {
    setError(undefined);
    if (!q.trim()) {
      setHits([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const search = new URLSearchParams({ q: q.trim(), size: "20" });
    if (spaceId) search.set("spaceId", spaceId);
    if (categoryId) search.set("categoryId", categoryId);
    if (tagId) search.set("tagId", tagId);
    setLoading(true);
    api<{ items: SearchHit[]; total: number }>(`/api/v1/search?${search}`, "GET", undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setHits(result.items || []);
        setTotal(result.total || 0);
        setCompletedKey(queryKey);
        setError(undefined);
      })
      .catch((caught) => {
        if (!controller.signal.aborted && caught instanceof ApiError) setError(caught);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, spaceId, categoryId, tagId, queryKey]);

  const visible = hits;

  function update(next: Record<string, string>) {
    const copy = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) copy.set(key, value);
      else copy.delete(key);
    }
    setParams(copy);
  }

  const searchError = error ? <ErrorState status={error.status} title={error.status === 403 ? "权限不足" : "检索暂时不可用"}>{error.message}</ErrorState> : undefined;

  return (
    <>
      <UI.PageHeader title="全文搜索" description="从当前有效版本中查找你有权访问的文档。" />
      <UI.Panel className="overflow-hidden">
      <UI.Toolbar>
      <form
        className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <div className="min-w-64 flex-1">
          <Input
            label="关键词"
            value={draft}
            onChange={setDraft}
            placeholder="输入文件名或正文片段"
            leftIcon={<IconSearch size={16} />}
          />
        </div>
        <Button variant="primary" type="submit">
          搜索
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="空间"
          value={spaceId}
          onChange={(value) => update({ spaceId: value })}
          options={[{ value: "", label: "全部" }, ...spaces.map((space) => ({ value: space.id, label: space.name }))]}
        />
        <FilterSelect
          label="分类"
          value={categoryId}
          onChange={(value) => update({ categoryId: value })}
          options={[{ value: "", label: "全部" }, ...categories.filter((term) => term.status === "ACTIVE").map((term) => ({ value: term.id, label: term.name }))]}
        />
        <FilterSelect
          label="标签"
          value={tagId}
          onChange={(value) => update({ tagId: value })}
          options={[{ value: "", label: "全部" }, ...tags.filter((term) => term.status === "ACTIVE").map((term) => ({ value: term.id, label: term.name }))]}
        />
      </div>
      </UI.Toolbar>
      <ContentStage ready={!q.trim() || (!loading && completedKey === queryKey)} error={searchError} identity={queryKey} minHeight={440}>
      {!q.trim() ? (
        <EmptyState title="输入关键词后搜索">
          用上方搜索按钮或 Enter 开始。也可以先回知识库打开文件。
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title="没有找到结果"
          action={
            <>
              <Button variant="secondary" onClick={() => navigate("/knowledge")}>
                返回知识库
              </Button>
              <Button variant="primary" onClick={() => update({ spaceId: "", categoryId: "", tagId: "" })}>
                清除筛选
              </Button>
            </>
          }
        >
          没有匹配「{q.trim()}」的内容。试试更短的词，或换一个空间。
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-control border border-border bg-card">
          {visible.map((hit) => {
            const matched = documents.find((item) => item.id === hit.id);
            return (
            <Link
              key={hit.id}
              to={`/documents/${hit.id}`}
              className="flex w-full flex-col gap-1 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <strong className="inline-flex items-center gap-2 font-medium text-foreground">
                <FileKindIcon kind={documentFileKind(matched)} size={16} />
                {hit.title}
              </strong>
              <p className="text-body leading-6 text-muted-foreground">{highlight(hit.match?.content || "已匹配当前有效版本。", q)}</p>
              <p className="text-caption text-muted-foreground">
                {[
                  categories.find((term) => term.id === hit.categoryId)?.name,
                  (hit.tagIds || []).map((id) => tags.find((term) => term.id === id)?.name).filter(Boolean).join("、"),
                  aiPolicyLabel[hit.aiPolicy],
                  `v${hit.versionNo}`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </Link>
            );
          })}
        </div>
      )}
      </ContentStage>
      {q.trim() && completedKey === queryKey && visible.length > 0 ? (
        <p className="dw-panel-footer">
          显示 {visible.length} 条，授权候选 {total} 条
        </p>
      ) : null}
      </UI.Panel>
    </>
  );
}
