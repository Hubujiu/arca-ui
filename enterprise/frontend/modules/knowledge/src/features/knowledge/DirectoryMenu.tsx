import { useNavigate } from "react-router-dom";
import { LifecycleDialog, type LifecycleTarget } from "./LifecycleDialog";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/motion/context-menu";
import { IconCopy, IconInfo, IconPaste, IconPencil, IconScissors } from "@/shared/icons";
import { api, ApiError } from "@/shared/api/client";
import type { DocumentRow, Folder as SpaceFolder, Space } from "@/shared/api/types";
import { actorLabel } from "@/shared/identity";
import { AppModal, Button, Input, StatefulButton } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { documentDisplayName, documentFileKind, formatTime } from "./status";

type TreeKind = "space" | "folder" | "doc";

type TreeTarget = {
  kind: TreeKind;
  id: string;
  spaceId: string;
  folderId?: string | null;
  name: string;
};

export type Clipboard = {
  mode: "cut" | "copy";
  kind: "folder" | "doc";
  id: string;
  spaceId: string;
};

function parseTreeValue(value: string | null): { kind: TreeKind; id: string } | null {
  if (!value) return null;
  if (value.startsWith("space:")) return { kind: "space", id: value.slice(6) };
  if (value.startsWith("folder:")) return { kind: "folder", id: value.slice(7) };
  if (value.startsWith("doc:")) return { kind: "doc", id: value.slice(4) };
  return null;
}

function folderAncestors(folders: SpaceFolder[], folderId?: string | null) {
  const ids: string[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  while (current) {
    ids.push(current.id);
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return ids;
}

function isSameOrInside(folders: SpaceFolder[], ancestorId: string, nodeId: string) {
  return ancestorId === nodeId || folderAncestors(folders, nodeId).includes(ancestorId);
}

function eventElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function treeItemValueFromEvent(event: { target: EventTarget | null; clientX?: number; clientY?: number }) {
  const fromNode = (node: EventTarget | null) => {
    const el = eventElement(node);
    if (!el) return null;
    return el.closest("[data-tree-item]") ?? el.querySelector("[data-tree-item]");
  };
  const direct = fromNode(event.target);
  if (direct) return direct.getAttribute("data-tree-item");
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    for (const el of document.elementsFromPoint(event.clientX, event.clientY)) {
      const item = el.closest("[data-tree-item]");
      if (item) return item.getAttribute("data-tree-item");
    }
  }
  return null;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function pasteDestination(target: TreeTarget | null, folders: SpaceFolder[]) {
  if (!target) return null;
  if (target.kind === "space") return { spaceId: target.spaceId, folderId: null as string | null, name: target.name };
  if (target.kind === "folder") return { spaceId: target.spaceId, folderId: target.id, name: target.name };
  const parent = folders.find((folder) => folder.id === target.folderId);
  return { spaceId: target.spaceId, folderId: target.folderId ?? null, name: parent?.name || "空间根目录" };
}

function resolveTargetFrom(
  value: string | null | undefined,
  spaces: Space[],
  folders: SpaceFolder[],
  documents: DocumentRow[],
): TreeTarget | null {
  const parsed = parseTreeValue(value ?? null);
  if (!parsed) return null;
  if (parsed.kind === "space") {
    const space = spaces.find((item) => item.id === parsed.id);
    return space ? { kind: "space", id: space.id, spaceId: space.id, name: space.name } : null;
  }
  if (parsed.kind === "folder") {
    const folder = folders.find((item) => item.id === parsed.id);
    return folder
      ? { kind: "folder", id: folder.id, spaceId: folder.spaceId, folderId: folder.parentId, name: folder.name }
      : null;
  }
  const doc = documents.find((item) => item.id === parsed.id);
  return doc
    ? {
        kind: "doc",
        id: doc.id,
        spaceId: doc.spaceId,
        folderId: doc.folderId,
        name: documentDisplayName(doc),
      }
    : null;
}

export function cutItemClass(clipboard: Clipboard | null, kind: "folder" | "doc", id: string) {
  return clipboard?.mode === "cut" && clipboard.kind === kind && clipboard.id === id ? "opacity-50" : undefined;
}

export function DirectoryMenu({
  spaces,
  foldersBySpace,
  documents,
  activeValue,
  onSelectValue,
  reload,
  children,
}: {
  spaces: Space[];
  foldersBySpace: Record<string, SpaceFolder[]>;
  documents: DocumentRow[];
  activeValue?: string | null;
  onSelectValue?: (value: string) => void;
  reload: () => Promise<void>;
  children: (clipboard: Clipboard | null) => ReactNode;
}) {
  const navigate = useNavigate();
  const [lifecycle, setLifecycle] = useState<{ target: LifecycleTarget; action: "archive" | "delete" }>();
  const folders = useMemo(() => Object.values(foldersBySpace).flat(), [foldersBySpace]);
  const pendingSelectRef = useRef<string | null>(null);
  const [menuTarget, setMenuTarget] = useState<TreeTarget | null>(null);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedTarget = useMemo(() => resolveTargetFrom(activeValue, spaces, folders, documents), [activeValue, documents, folders, spaces]);
  const target = menuTarget ?? selectedTarget;
  const destination = pasteDestination(target, folders);
  const canTransfer = target?.kind === "folder" || target?.kind === "doc";
  const pasteIntoSelf =
    !!clipboard &&
    clipboard.mode === "cut" &&
    clipboard.kind === "folder" &&
    !!destination &&
    (destination.folderId === clipboard.id ||
      (!!destination.folderId && isSameOrInside(folders, clipboard.id, destination.folderId)));
  const pasteBlocked =
    !clipboard || !destination || clipboard.spaceId !== destination.spaceId || pasteIntoSelf || busy;

  function captureTarget(event: {
    type?: string;
    button?: number;
    target: EventTarget | null;
    clientX?: number;
    clientY?: number;
  }) {
    const value = treeItemValueFromEvent(event);
    if (value) {
      const next = resolveTargetFrom(value, spaces, folders, documents);
      if (next) setMenuTarget(next);
      pendingSelectRef.current = value;
      if (event.type === "contextmenu" || event.button === 2) {
        onSelectValue?.(value);
        pendingSelectRef.current = null;
      }
      return;
    }
    const fallback = resolveTargetFrom(activeValue, spaces, folders, documents);
    if (fallback) setMenuTarget(fallback);
  }

  async function rename(name: string) {
    if (!target) return;
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      if (target.kind === "space") {
        const space = spaces.find((item) => item.id === target.id);
        await api(`/api/v1/spaces/${target.id}`, "PUT", {
          name: next,
          description: space?.description ?? null,
        });
      } else if (target.kind === "folder") {
        const folder = folders.find((item) => item.id === target.id);
        await api(`/api/v1/spaces/${target.spaceId}/folders/${target.id}`, "PUT", {
          name: next,
          parentId: folder?.parentId || null,
          sortOrder: folder?.sortOrder ?? 0,
        });
      } else {
        const latest = await api<DocumentRow>(`/api/v1/documents/${target.id}`);
        await api(`/api/v1/documents/${target.id}`, "PATCH", {
          title: next,
          description: latest.description ?? null,
          folderId: latest.folderId ?? null,
          categoryId: latest.categoryId ?? null,
          tagIds: latest.tagIds ?? [],
          aiPolicy: latest.aiPolicy,
          rowVersion: latest.rowVersion,
        });
      }
      toast.success("已重命名");
      setRenameOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "无法重命名");
    } finally {
      setBusy(false);
    }
  }

  function putClipboard(mode: "cut" | "copy") {
    if (!target || target.kind === "space") return;
    setClipboard({ mode, kind: target.kind, id: target.id, spaceId: target.spaceId });
    toast.success(mode === "cut" ? "已剪切，请在目标文件夹上粘贴" : "已复制，请在目标文件夹上右键粘贴或按 Ctrl+V");
  }

  async function paste() {
    if (!clipboard || !destination || pasteBlocked) return;
    const destinationFolderId = destination.folderId;
    setBusy(true);
    try {
      if (clipboard.mode === "cut") {
        if (clipboard.kind === "folder") {
          const folder = folders.find((item) => item.id === clipboard.id);
          if (!folder) throw new ApiError(404, "找不到要移动的文件夹");
          await api(`/api/v1/spaces/${folder.spaceId}/folders/${folder.id}`, "PUT", {
            name: folder.name,
            parentId: destinationFolderId,
            sortOrder: folder.sortOrder ?? 0,
          });
        } else {
          const latest = await api<DocumentRow>(`/api/v1/documents/${clipboard.id}`);
          await api(`/api/v1/documents/${clipboard.id}`, "PATCH", {
            title: latest.title,
            description: latest.description ?? null,
            folderId: destinationFolderId,
            categoryId: latest.categoryId ?? null,
            tagIds: latest.tagIds ?? [],
            aiPolicy: latest.aiPolicy,
            rowVersion: latest.rowVersion,
          });
        }
        toast.success("已移动");
        setClipboard(null);
      } else if (clipboard.kind === "folder") {
        await api(`/api/v1/spaces/${clipboard.spaceId}/folders/${clipboard.id}/copy`, "POST", {
          parentId: destinationFolderId,
        });
        toast.success("已粘贴副本");
      } else {
        await api(`/api/v1/documents/${clipboard.id}/copy`, "POST", { folderId: destinationFolderId });
        toast.success("已粘贴副本");
      }
      await reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "无法粘贴");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (renameOpen || propertiesOpen || isTypingTarget(event.target)) return;
      const meta = event.ctrlKey || event.metaKey;
      if (event.key === "F2") {
        if (!target) return;
        event.preventDefault();
        setRenameOpen(true);
        return;
      }
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        if (window.getSelection()?.toString()) return;
        if (!canTransfer) return;
        event.preventDefault();
        putClipboard("copy");
        return;
      }
      if (key === "x") {
        if (window.getSelection()?.toString()) return;
        if (!canTransfer) return;
        event.preventDefault();
        putClipboard("cut");
        return;
      }
      if (key === "v") {
        if (pasteBlocked) return;
        event.preventDefault();
        void paste();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, canTransfer, clipboard, destination, folders, pasteBlocked, propertiesOpen, renameOpen, target]);

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) return;
          const value = pendingSelectRef.current;
          if (!value) return;
          onSelectValue?.(value);
          pendingSelectRef.current = null;
        }}
      >
        <ContextMenuTrigger>
          <div className="min-w-0" onContextMenu={captureTarget} onPointerDown={captureTarget}>
            {children(clipboard)}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent ariaLabel="目录操作">
          <ContextMenuItem disabled={!target} onSelect={() => setRenameOpen(true)}>
            <IconPencil size={16} />
            重命名
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!canTransfer} onSelect={() => putClipboard("cut")}>
            <IconScissors size={16} />
            剪切
            <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!canTransfer} onSelect={() => putClipboard("copy")}>
            <IconCopy size={16} />
            复制
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={pasteBlocked} onSelect={() => void paste()}>
            <IconPaste size={16} />
            {clipboard && destination ? `粘贴到「${destination.name}」` : "粘贴"}
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          {target && target.kind !== "folder" && <>
            <ContextMenuItem disabled={busy} onSelect={() => setLifecycle({ target: { kind: target.kind as "space" | "doc", id: target.id, name: target.name }, action: "archive" })}>归档</ContextMenuItem>
            <ContextMenuItem disabled={busy} onSelect={() => setLifecycle({ target: { kind: target.kind as "space" | "doc", id: target.id, name: target.name }, action: "delete" })}>永久删除</ContextMenuItem>
          </>}
          <ContextMenuItem disabled={!target} onSelect={() => setPropertiesOpen(true)}>
            <IconInfo size={16} />
            属性
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <LifecycleDialog target={lifecycle?.target} action={lifecycle?.action || "archive"} onClose={() => setLifecycle(undefined)} onComplete={async () => { navigate("/knowledge"); await reload(); }} />
      <RenameDialog
        open={renameOpen}
        name={target?.name || ""}
        kind={target?.kind || "doc"}
        busy={busy}
        onOpenChange={setRenameOpen}
        onSubmit={rename}
      />
      <PropertiesDialog
        open={propertiesOpen}
        onOpenChange={setPropertiesOpen}
        target={target}
        spaces={spaces}
        folders={folders}
        documents={documents}
      />
    </>
  );
}

function RenameDialog({
  open,
  name,
  kind,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  name: string;
  kind: TreeKind;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const title = kind === "space" ? "重命名空间" : kind === "folder" ? "重命名文件夹" : "重命名文件";

  useEffect(() => {
    if (!open) return;
    setValue(name);
  }, [name, open]);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={kind === "doc" ? "会同步更新左侧目录和预览顶部的名称。" : "名称会立即出现在目录树中。"}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(value);
        }}
      >
        <Input
          key={`${kind}:${name}:${open}`}
          label="名称"
          value={value}
          onChange={setValue}
          required
          maxLength={kind === "doc" ? 300 : 160}
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

function PropertiesDialog({
  open,
  onOpenChange,
  target,
  spaces,
  folders,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TreeTarget | null;
  spaces: Space[];
  folders: SpaceFolder[];
  documents: DocumentRow[];
}) {
  const space = spaces.find((item) => item.id === target?.spaceId);
  const folder = target?.kind === "folder" ? folders.find((item) => item.id === target.id) : undefined;
  const parentFolder =
    target?.kind === "folder"
      ? folders.find((item) => item.id === folder?.parentId)
      : folders.find((item) => item.id === target?.folderId);
  const doc = target?.kind === "doc" ? documents.find((item) => item.id === target.id) : undefined;
  const kindLabel = target?.kind === "space" ? "空间" : target?.kind === "folder" ? "文件夹" : "文件";

  const rows = [
    ["类型", kindLabel],
    ["名称", target?.name || "—"],
    ["所在空间", space?.name || "—"],
    target?.kind !== "space" ? ["所在目录", parentFolder?.name || "空间根目录"] : null,
    doc ? ["源文件", doc.originalFilename || "—"] : null,
    doc ? ["格式", documentFileKind(doc)] : null,
    doc ? ["上传人", actorLabel(doc)] : null,
    doc?.versionNo ? ["当前版本", `v${doc.versionNo}`] : null,
    doc?.versionCreatedAt ? ["版本时间", formatTime(doc.versionCreatedAt)] : null,
    space?.description && target?.kind === "space" ? ["说明", space.description] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <AppModal open={open} onOpenChange={onOpenChange} title="属性" description="查看当前目录项的基本信息。">
      <dl className="grid grid-cols-record-labels gap-x-3 gap-y-2 text-body">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-foreground" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          关闭
        </Button>
      </div>
    </AppModal>
  );
}
