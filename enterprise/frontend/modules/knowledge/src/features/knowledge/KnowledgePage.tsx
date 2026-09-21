import { LifecycleDialog } from "./LifecycleDialog";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/motion/popover";
import { api, ApiError } from "@/shared/api/client";
import { IconChevronRight, IconFolder, IconPlus, IconRotate, IconSearch, IconUpload, PotlabIcon } from "@/shared/icons";
import { FileKindIcon } from "@/shared/icons/file-kind";
import { AppModal, Button, EmptyState, FieldSelect, Input, StatefulButton } from "@/shared/ui";
import { ContentStage } from "@/shared/design-system/workspace/ContentStage";
import { useWorkspaceUI, type ResourceItem } from "@/shared/design-system/workspace/WorkspaceUI";
import { toast } from "@/shared/toast";
import { useCatalog } from "./catalog";
import { buildCatalogIndex } from "./catalog-index";
import type { Folder } from "@/shared/api/types";

import { documentDisplayName, documentFileKind, formatTime, ProcessBadge } from "./status";
import { unitPath } from "@/organization/model";
import { ShareControl } from "./ShareControl";
import { UploadDialog } from "./UploadDialog";

const EMPTY_FOLDERS: Folder[] = [];

export function KnowledgePage() {
  const navigate = useNavigate();
  const UI = useWorkspaceUI();
  const [lifecycle, setLifecycle] = useState<"archive" | "delete">();
  const [params] = useSearchParams();
  const { me, spaces, foldersBySpace, documents, reload, requestCreateSpace, directory, ready, loading, loadedSpaces = [], documentErrors = {}, loadSpaceDocuments } = useCatalog();
  const spaceId = spaces.some(s => s.id === params.get("spaceId")) ? params.get("spaceId")! : spaces[0]?.id || "";
  const folderId = params.get("folderId") || "";
  const [orgFilter, setOrgFilter] = useState("");
  const [upload, setUpload] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [jumpQuery, setJumpQuery] = useState("");
  const space = spaces.find(item => item.id === spaceId);
  const folders = foldersBySpace[spaceId] || EMPTY_FOLDERS;
  const dataReady = Boolean(ready && (!spaceId || loadedSpaces.includes(spaceId)));
  const index = useMemo(() => buildCatalogIndex({
    folders, documents, units: directory?.units || [], spaceId, spaceOrgId: space?.orgUnitId, orgFilter,
  }), [folders, documents, directory?.units, spaceId, space?.orgUnitId, orgFilter]);
  const folder = index.folderById.get(folderId);
  const organizationOptions = useMemo(() => [{ value: "", label: "全部组织" }, ...(directory?.units || [])
    .map(unit => ({ value: unit.id, label: unitPath(directory!.units, unit.id) }))], [directory?.units]);
  const query = jumpQuery.trim().toLocaleLowerCase();
  const childFolders = useMemo(() => (index.foldersByParent.get(folderId) || [])
    .filter(item => !query || item.name.toLocaleLowerCase().includes(query))
    .sort((left, right) => left.name.localeCompare(right.name, "zh")), [index, folderId, query]);
  const rows = useMemo(() => (index.documentsByFolder.get(folderId) || [])
    .filter(item => !query || documentDisplayName(item).toLocaleLowerCase().includes(query))
    .sort((left, right) => documentDisplayName(left).localeCompare(documentDisplayName(right), "zh")), [index, folderId, query]);

  const canManage = me?.systemRole === "ADMIN";

  const items = useMemo<ResourceItem[]>(() => [
    ...childFolders.map(item => ({ id: `folder:${item.id}`, name: item.name, to: `/knowledge?spaceId=${encodeURIComponent(spaceId)}&folderId=${encodeURIComponent(item.id)}`,
      icon: <IconFolder size={18} />, type: "文件夹", owner: item.createdByName || "—", updated: "—", status: <span className="text-ui-muted">目录</span>,
      action: <ShareControl triggerOnly compact kind="folder" id={item.id} name={item.name} /> })),
    ...rows.map(row => ({ id: row.id, name: documentDisplayName(row), to: `/documents/${row.id}`, icon: <FileKindIcon kind={documentFileKind(row)} size={18} />,
      type: documentFileKind(row), owner: row.createdByName || row.createdByUsername || "—", updated: row.versionCreatedAt || row.updatedAt ? formatTime(row.versionCreatedAt || row.updatedAt) : "—",
      updatedAt: row.versionCreatedAt || row.updatedAt,
      status: <ProcessBadge doc={row} />, action: <ShareControl triggerOnly compact kind="document" id={row.id} name={documentDisplayName(row)} /> })),
  ], [childFolders, rows, spaceId]);
  const empty = <EmptyState title={!spaces.length ? "还没有工作空间" : jumpQuery || orgFilter ? "没有匹配的文件" : "当前目录为空"}
    action={!spaces.length ? canManage && <Button onClick={requestCreateSpace}><IconPlus size={16} />新建空间</Button> : <Button variant="outline" onClick={() => setUpload(true)}>上传第一个文件</Button>}>
    {!spaces.length ? "创建工作空间，集中管理团队文档。" : "上传文件或调整筛选条件。"}
  </EmptyState>;
  return <div className="flex min-w-0 flex-col gap-5" data-knowledge-page>
    <UI.PageHeader title={folder?.name || space?.name || "知识库"} description={space?.description || "集中管理文档、资料与团队知识。"}
      breadcrumb={<span className="flex flex-wrap items-center gap-2"><Link to="/knowledge">知识库</Link><IconChevronRight size={16} /><span>{folder ? space?.name : "全部文件"}</span>{folder && <><IconChevronRight size={16} /><span>{folder.name}</span></>}</span>}
      actions={<>
        {spaceId && <ShareControl triggerOnly kind={folderId ? "folder" : "space"} id={folderId || spaceId} name={folder?.name || space?.name || "知识库"} />}
        <Button variant="outline" aria-label="新建文件夹" title="新建文件夹" disabled={!dataReady || !spaceId} onClick={() => setCreateFolderOpen(true)}><IconFolder size={18} /><span className="hidden sm:inline">新建文件夹</span></Button>
        <Button disabled={!dataReady || !spaceId} onClick={() => setUpload(true)}><IconUpload size={16} />上传文件</Button>
        {space?.canManage && !folderId && <Popover align="end">
          <PopoverTrigger>
            <Button size="icon" variant="ghost" aria-label="工作空间操作"><PotlabIcon name="MoreHorizontal" size={18} /></Button>
          </PopoverTrigger>
          <PopoverContent className="p-2">
            <Button variant="ghost" className="w-full" onClick={() => setLifecycle("archive")}>归档工作空间</Button>
            <Button variant="ghost" className="w-full" onClick={() => setLifecycle("delete")}><span className="text-destructive">删除工作空间</span></Button>
          </PopoverContent>
        </Popover>}
      </>} />
    <UI.Panel className="overflow-hidden">
      <div className="dw-panel-heading"><h2 className="text-body font-medium">文件列表</h2><span className="ml-auto text-caption text-ui-muted">{dataReady ? `${items.length} 项` : "准备目录"}</span></div>
      <UI.Toolbar>
        <form className="min-w-0 flex-1 sm:max-w-sm" onSubmit={event => { event.preventDefault(); if (jumpQuery.trim()) navigate(`/search?q=${encodeURIComponent(jumpQuery.trim())}&spaceId=${encodeURIComponent(spaceId)}`); }}>
          <Input aria-label="搜索当前目录" value={jumpQuery} onChange={setJumpQuery} disabled={!dataReady} placeholder="搜索当前目录，回车全文检索" leftIcon={<IconSearch size={16} />} />
        </form>
        <div className="w-44 shrink-0" role="group" aria-label="按所属组织筛选"><FieldSelect value={orgFilter} onChange={setOrgFilter} disabled={!directory} options={organizationOptions} /></div>
        <Button size="icon" variant="ghost" aria-label="刷新知识库" disabled={loading} onClick={() => void reload().catch(() => {})}><IconRotate size={16} /></Button>
        <span className="ml-auto text-caption text-ui-muted" role="status">{loading && ready ? "同步中…" : "权限范围内可见"}</span>
      </UI.Toolbar>
      <ContentStage ready={dataReady} identity={`${spaceId}/${folderId}`} error={documentErrors[spaceId] ? <div className="space-y-3"><p>{documentErrors[spaceId]}</p><Button onClick={() => void loadSpaceDocuments?.(spaceId)}>重新读取目录</Button></div> : undefined}>
        <UI.ResourceTable items={items} emptyState={empty} />
        <div className="dw-panel-footer"><span>{childFolders.length} 个文件夹 · {rows.length} 个文档</span><span>点击列标题排序</span></div>
      </ContentStage>
    </UI.Panel>
    <LifecycleDialog target={lifecycle && space ? { kind: "space", id: space.id, name: space.name } : undefined} action={lifecycle || "archive"} onClose={() => setLifecycle(undefined)} onComplete={async () => { navigate("/knowledge"); await reload(); }} />
    <UploadDialog open={upload} onOpenChange={setUpload} spaceId={spaceId} folderId={folderId || undefined} />
    <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} spaceId={spaceId} parentId={folderId || undefined} onCreated={reload} />
  </div>;
}

function CreateFolderDialog({
  open,
  onOpenChange,
  spaceId,
  parentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  parentId?: string;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setBusy(false);
  }, [open]);

  return (
    <AppModal open={open} onOpenChange={onOpenChange} title="新建文件夹" description="文件夹会出现在左侧目录树中当前空间下。">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || !spaceId) return;
          setBusy(true);
          try {
            await api(`/api/v1/spaces/${spaceId}/folders`, "POST", {
              name: name.trim(),
              parentId: parentId || null,
            });
            toast.success("文件夹已创建");
            onOpenChange(false);
            await onCreated();
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "无法创建文件夹");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="名称" value={name} onChange={setName} required maxLength={160} placeholder="例如 操作手册" />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <StatefulButton type="submit" state={busy ? "loading" : "idle"} loadingText="创建中…">
            创建
          </StatefulButton>
        </div>
      </form>
    </AppModal>
  );
}
