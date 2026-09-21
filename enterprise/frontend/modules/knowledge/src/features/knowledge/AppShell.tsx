import { useKnowledgeSession } from "./KnowledgeSession";
import { MotionOutlet } from "@/shared/design-system/motion/PageMotion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
  useAnimatedSidebarPanel,
} from "@/components/motion/animated-sidebar";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/motion/file-tree";
import { Tooltip } from "@/components/motion/tooltip";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/shared/api/client";
import type { DocumentRow, Folder as SpaceFolder, Space } from "@/shared/api/types";
import { IconArchive, IconFile, IconFolder, IconMenu, IconNavGrid, IconNavSearch, IconNavSettings, IconPlus } from "@/shared/icons";
import { FileKindIcon } from "@/shared/icons/file-kind";
import { toast } from "@/shared/toast";
import { AppModal, Button, ErrorState, Input, StatefulButton } from "@/shared/ui";
import { cutItemClass, DirectoryMenu, type Clipboard } from "./DirectoryMenu";
import { documentDisplayName, documentFileKind } from "./status";

import { CatalogContext, type Catalog } from "./catalog";
export { useCatalog } from "./catalog";

function byName(left: string, right: string) {
  return left.localeCompare(right, "zh");
}

function allFolders(foldersBySpace: Record<string, SpaceFolder[]>) {
  return Object.values(foldersBySpace).flat();
}

function ancestorFolderValues(folders: SpaceFolder[], folderId?: string | null, includeSelf = true) {
  const values: string[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  if (current && !includeSelf) {
    const parentId = current.parentId;
    current = folders.find((folder) => folder.id === parentId);
  }
  while (current) {
    values.push(`folder:${current.id}`);
    const parentId = current.parentId;
    current = folders.find((folder) => folder.id === parentId);
  }
  return values;
}

function renderBranch(
  spaceId: string,
  folders: SpaceFolder[],
  documents: DocumentRow[],
  parentId?: string,
  clipboard?: Clipboard | null,
): ReactNode {
  const childFolders = folders
    .filter((folder) => (parentId ? folder.parentId === parentId : !folder.parentId))
    .slice()
    .sort((left, right) => byName(left.name, right.name));
  const childDocs = documents
    .filter((doc) => doc.spaceId === spaceId && (parentId ? doc.folderId === parentId : !doc.folderId))
    .slice()
    .sort((left, right) => byName(documentDisplayName(left), documentDisplayName(right)));

  return (
    <>
      {childDocs.map((doc) => (
        <FileTreeFile
          key={doc.id}
          value={`doc:${doc.id}`}
          name={documentDisplayName(doc)}
          dimmed={Boolean(cutItemClass(clipboard ?? null, "doc", doc.id))}
          icon={<FileKindIcon kind={documentFileKind(doc)} size={16} />}
        />
      ))}
      {childFolders.map((folder) => (
        <FileTreeFolder
          key={folder.id}
          value={`folder:${folder.id}`}
          name={folder.name}
          dimmed={Boolean(cutItemClass(clipboard ?? null, "folder", folder.id))}
        >
          {renderBranch(spaceId, folders, documents, folder.id, clipboard)}
        </FileTreeFolder>
      ))}
    </>
  );
}

function SidebarBrand() {
  const { collapsed } = useAnimatedSidebarPanel();
  const mark = (
    <span className="grid size-8 shrink-0 place-items-center rounded-card bg-primary/10 text-caption font-semibold text-primary">
      <IconFolder size={18} />
    </span>
  );

  if (collapsed) {
    return (
      <Tooltip content="DocWeave" side="right" wrapperClassName="shrink-0">
        {mark}
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {mark}
      <span className="min-w-0">
        <p className="truncate text-body font-medium text-foreground">知识库</p>
        <p className="truncate text-caption text-muted-foreground">团队文档与资料</p>
      </span>
    </div>
  );
}

function DirectoryHeading({
  canCreate,
  onCreate,
}: {
  canCreate: boolean;
  onCreate: () => void;
}) {
  const { collapsed } = useAnimatedSidebarPanel();
  const addButton = canCreate ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={collapsed ? "size-8 shrink-0" : "size-6 shrink-0"}
      aria-label="新建空间"
      onClick={onCreate}
    >
      <IconPlus size={16} />
    </Button>
  ) : null;

  if (collapsed) {
    return addButton ? (
      <div className="mb-1 flex justify-center">
        <Tooltip content="新建空间" side="right" wrapperClassName="shrink-0">
          {addButton}
        </Tooltip>
      </div>
    ) : null;
  }

  return (
    <div className="mb-1 flex h-7 items-center justify-between gap-1 px-2">
      <span className="text-caption font-medium uppercase tracking-widest text-muted-foreground">目录</span>
      {addButton}
    </div>
  );
}

function CollapsibleFileTree(props: Omit<Parameters<typeof FileTree>[0], "compact">) {
  const { collapsed } = useAnimatedSidebarPanel();
  return <FileTree {...props} compact={collapsed} className={props.className} />;
}

function DirectoryEmpty() {
  const { collapsed } = useAnimatedSidebarPanel();
  if (collapsed) return null;
  return <p className="px-3 py-2 text-caption text-muted-foreground">暂无可见空间</p>;
}

export function AppShell({ portal = false }: { portal?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const session = useKnowledgeSession();
  const { me, spaces, foldersBySpace, documents, reload, loadSpaceDocuments, rememberDocument, error: catalogError } = session;
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const revealedPathRef = useRef("");
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  const selectedDocId = location.pathname.startsWith("/documents/")
    ? location.pathname.slice("/documents/".length).split("/")[0]
    : undefined;
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId);
  const selectedSpace = params.get("spaceId") || selectedDoc?.spaceId || spaces[0]?.id;
  const selectedFolder = params.get("folderId") || selectedDoc?.folderId || undefined;
  const currentSpace = spaces.find((space) => space.id === selectedSpace);
  const treeValue = selectedDocId
    ? `doc:${selectedDocId}`
    : selectedFolder
      ? `folder:${selectedFolder}`
      : selectedSpace
        ? `space:${selectedSpace}`
        : null;

  useEffect(() => {
    const extra: string[] = [];
    if (selectedDoc) {
      extra.push(`space:${selectedDoc.spaceId}`);
      extra.push(...ancestorFolderValues(foldersBySpace[selectedDoc.spaceId] || [], selectedDoc.folderId, true));
    } else if (selectedSpace && selectedFolder) {
      extra.push(`space:${selectedSpace}`);
      extra.push(...ancestorFolderValues(foldersBySpace[selectedSpace] || [], selectedFolder, false));
    } else if (selectedSpace) {
      extra.push(`space:${selectedSpace}`);
    }
    const revealKey = selectedDocId
      ? `doc:${selectedDocId}`
      : selectedFolder
        ? `folder:${selectedFolder}`
        : selectedSpace
          ? `space:${selectedSpace}`
          : "";
    const signature = `${revealKey}|${extra.join(",")}`;
    if (!revealKey || revealedPathRef.current === signature) return;
    if (selectedDoc?.folderId && extra.length <= 1 && !(foldersBySpace[selectedDoc.spaceId] || []).length) {
      return;
    }
    revealedPathRef.current = signature;
    if (!extra.length) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const id of extra) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? Array.from(next) : current;
    });
  }, [foldersBySpace, selectedDoc, selectedDocId, selectedFolder, selectedSpace]);

  useEffect(() => {
    const wanted = new Set<string>();
    if (selectedSpace) wanted.add(selectedSpace);
    for (const id of expandedIds) {
      if (id.startsWith("space:")) wanted.add(id.slice(6));
    }
    for (const spaceId of wanted) {
      if (!spaceId || session.loadedSpaces.includes(spaceId) || session.documentErrors[spaceId]) continue;
      void loadSpaceDocuments(spaceId);
    }
  }, [session.ready, session.loading, session.loadedSpaces, session.documentErrors, expandedIds, loadSpaceDocuments, selectedSpace]);

  useEffect(() => {
    if (!selectedDocId || selectedDoc) return;
    let cancelled = false;
    api<DocumentRow>(`/api/v1/documents/${selectedDocId}`)
      .then((doc) => {
        if (cancelled) return;
        rememberDocument(doc);
        void loadSpaceDocuments(doc.spaceId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadSpaceDocuments, rememberDocument, selectedDoc, selectedDocId]);

  const catalog = useMemo<Catalog>(
    () => ({
      ...session,
      requestCreateSpace: () => setCreateSpaceOpen(true),
    }),
    [session],
  );

  const selectFolder = useCallback(
    (spaceId: string, folderId?: string) => {
      const next = new URLSearchParams();
      next.set("spaceId", spaceId);
      if (folderId) next.set("folderId", folderId);
      navigate({ pathname: "/knowledge", search: `?${next}` });
    },
    [navigate],
  );

  const selectTreeValue = useCallback(
    (next: string) => {
      if (next.startsWith("doc:")) {
        navigate(`/documents/${next.slice(4)}`);
        return;
      }
      if (next.startsWith("space:")) {
        selectFolder(next.slice(6));
        return;
      }
      if (next.startsWith("folder:")) {
        const folderId = next.slice(7);
        const folder = allFolders(foldersBySpace).find((item) => item.id === folderId);
        if (folder) selectFolder(folder.spaceId, folder.id);
      }
    },
    [foldersBySpace, navigate, selectFolder],
  );

  const navItems = [
    { to: "/archive", label: "归档", icon: <IconArchive size={18} />, match: (path: string) => path.startsWith("/archive") },
    {
      to: "/knowledge",
      label: "全部文件",
      icon: <IconNavGrid size={18} />,
      match: (path: string) => path === "/knowledge" || path.startsWith("/documents"),
    },
    {
      to: "/search",
      label: "全文搜索",
      icon: <IconNavSearch size={18} />,
      match: (path: string) => path.startsWith("/search"),
    },
    {
      to: "/knowledge/settings",
      label: "分类与标签",
      icon: <IconNavSettings size={18} />,
      match: (path: string) => path.startsWith("/knowledge/settings"),
    },
  ];

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "nav-knowledge",
        label: "打开知识库",
        group: "导航",
        icon: <IconNavGrid size={18} />,
        onSelect: () => navigate("/knowledge"),
      },
      {
        id: "nav-search",
        label: "打开搜索",
        group: "导航",
        icon: <IconNavSearch size={18} />,
        onSelect: () => navigate("/search"),
      },
      {
        id: "nav-settings",
        label: "打开设置",
        group: "导航",
        icon: <IconNavSettings size={18} />,
        onSelect: () => navigate("/knowledge/settings"),
      },
      ...(me?.systemRole === "ADMIN"
        ? [
            {
              id: "create-space",
              label: "新建空间",
              group: "工作空间",
              icon: <IconPlus size={16} />,
              onSelect: () => setCreateSpaceOpen(true),
            },
          ]
        : []),
      ...spaces.map((space) => ({
        id: `space-${space.id}`,
        label: space.name,
        group: "工作空间",
        icon: <IconFolder size={16} />,
        onSelect: () => selectFolder(space.id),
      })),
      ...documents.map((doc) => ({
        id: `doc-${doc.id}`,
        label: documentDisplayName(doc),
        group: "文档",
        icon: <IconFile size={16} />,
        onSelect: () => navigate(`/documents/${doc.id}`),
      })),
    ],
    [documents, me?.systemRole, navigate, selectFolder, spaces],
  );

  const tree: ReactNode =
    !session.ready ? (<div className="dw-tree-placeholder" aria-label="目录加载中"><i /><i /><i /><i /></div>) : spaces.length === 0 ? (
      <DirectoryEmpty />
    ) : (
      <DirectoryMenu
        spaces={spaces}
        foldersBySpace={foldersBySpace}
        documents={documents}
        activeValue={treeValue}
        onSelectValue={selectTreeValue}
        reload={reload}
      >
        {(clipboard) => (
          <CollapsibleFileTree
            ariaLabel="文件目录"
            value={treeValue}
            onValueChange={selectTreeValue}
            expandedIds={expandedIds}
            onExpandedChange={setExpandedIds}
          >
            {spaces.map((space) => (
              <FileTreeFolder key={space.id} value={`space:${space.id}`} name={space.name}>
                {renderBranch(space.id, foldersBySpace[space.id] || [], documents, undefined, clipboard)}
              </FileTreeFolder>
            ))}
          </CollapsibleFileTree>
        )}
      </DirectoryMenu>
    );

  return (
    <CatalogContext.Provider value={catalog}>
      <AnimatedSidebarProvider data-app-frame="knowledge" className={cn("min-h-0 flex-1", portal ? "h-full" : "h-dvh")}>
        {!portal && <CommandPalette items={commands} placeholder="跳转到页面、空间或文件…" emptyMessage="没有匹配的命令" />}
        <AnimatedSidebar ariaLabel="知识库导航" variant="sidebar" collapsible="icon" className="h-full" panelClassName="h-full">
          <AnimatedSidebarHeader>
            <SidebarBrand />
          </AnimatedSidebarHeader>
          <AnimatedSidebarContent>
            <AnimatedSidebarGroup>
              <AnimatedSidebarGroupLabel>导航</AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {navItems.map((item) => (
                    <AnimatedSidebarMenuItem key={item.to}>
                      <AnimatedSidebarMenuButton
                        isActive={item.match(location.pathname)}
                        icon={item.icon}
                        onSelect={() => navigate(item.to)}
                      >
                        {item.label}
                      </AnimatedSidebarMenuButton>
                    </AnimatedSidebarMenuItem>
                  ))}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
            <AnimatedSidebarGroup>
              <DirectoryHeading
                canCreate={me?.systemRole === "ADMIN"}
                onCreate={() => setCreateSpaceOpen(true)}
              />
              <AnimatedSidebarGroupContent>{tree}</AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          </AnimatedSidebarContent>
          <AnimatedSidebarFooter>
            <p className="px-3 py-2 text-caption text-muted-foreground">仅显示有权访问的内容</p>
          </AnimatedSidebarFooter>
        </AnimatedSidebar>
        <AnimatedSidebarInset className="h-full min-h-0 overflow-hidden">
          <header className="dw-local-bar">
            <AnimatedSidebarTrigger  aria-label="折叠或展开侧栏">
              <IconMenu size={16} />
            </AnimatedSidebarTrigger>
            <span className="text-caption text-muted-foreground">知识库</span><span className="text-muted-foreground/50">/</span><span className="truncate text-caption">{currentSpace?.name || "工作空间"}</span>
            <span className="ml-auto hidden truncate text-caption text-muted-foreground sm:block">
              {session.loading && session.ready ? "正在同步…" : "团队文档与资料"}
            </span>
          </header>
          <div
            className={
              location.pathname.startsWith("/documents/")
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "dw-workspace-scroll"
            }
          >
            <div
              className={
                location.pathname.startsWith("/documents/")
                  ? "flex min-h-0 flex-1 flex-col"
                  : "dw-page-content flex min-w-0 flex-1 flex-col gap-5"
              }
            >
              {catalogError ? (
                <div className="flex flex-col items-center gap-4 p-4">
                  <ErrorState portal={portal} status={catalogError.status || 503} title="知识库暂时无法加载">{catalogError.message}</ErrorState>
                  <Button onClick={() => void reload().catch(() => {})}>重新加载知识库</Button>
                </div>
              ) : <MotionOutlet />}
            </div>
          </div>
        </AnimatedSidebarInset>
      </AnimatedSidebarProvider>
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        onCreated={async (space) => {
          await reload();
          selectFolder(space.id);
        }}
      />
    </CatalogContext.Provider>
  );
}

function CreateSpaceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (space: Space) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setBusy(false);
  }, [open]);

  return (
    <AppModal open={open} onOpenChange={onOpenChange} title="新建空间" description="空间是文件目录的根。创建后会出现在左侧目录树。">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            const space = await api<Space>("/api/v1/spaces", "POST", {
              name: name.trim(),
              description: description.trim() || null,
            });
            toast.success("空间已创建");
            onOpenChange(false);
            await onCreated(space);
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "无法创建空间");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="名称" value={name} onChange={setName} required maxLength={160} placeholder="例如 产品手册" />
        <Input label="说明" value={description} onChange={setDescription} maxLength={400} placeholder="可选" />
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
