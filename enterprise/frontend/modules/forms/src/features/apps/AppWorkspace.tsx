import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { ActionSurface } from "@/components/controls";
import { useDesignerNavigation, reserveDesignerWindow } from "@/shared/design-system/designer-navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import * as Dropdown from "@/components/overlays/dropdown";
import { Drawer } from "@/components/motion/drawer";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  GitBranch,
  LayoutList,
  Share2,
  ShieldCheck,
  Table2,
} from "@/shared/icons/catalog";
import { CloseAction, RefreshAction, SearchAction, CopyAction, PlusAction, TrashAction, FilePenAction, FolderPlusAction, SettingsAction, MoreAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import {
  AppModal,
  Button,
  EmptyState,
  Field,
  FieldSelect,
  Input,
} from "@/shared/ui";
import { toast } from "@/shared/toast";
import { cn } from "@/lib/utils";
import { Table as MotionTable, type TableColumn } from "@/components/motion/table";
import type { Directory } from "@/organization/model";
import { FieldRenderer } from "@/lowcode/FieldRenderer";
import { RecordDetail } from "@/lowcode/RecordDetail";
import { ruleMatches } from "@/lowcode/rules";
import {
  fieldValueLabel,
  initialValues,
  isDecoration,
  isFieldVisible,
  validateValues,
  type DefaultUser,
  type LowcodeField,
  type TableSchema,
} from "@/lowcode/field-model";
import { AppIcon, LoadState } from "@/lowcode/common";
import {
  base,
  blankDirectory,
  dateLabel,
  message,
  useLoad,
  type Application,
  type Change,
  type Group,
  type Row,
  type Share,
  type Table,
} from "@/lowcode/model";

const menuItem =
  "";
const directoryDesktopQuery = "(min-width: 1024px)";
function subscribeDirectoryViewport(onChange: () => void) {
  const query = window.matchMedia(directoryDesktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isDesktopDirectory = () => window.matchMedia(directoryDesktopQuery).matches;
const serverDirectoryViewport = () => false;

type Naming = {
  kind: "group" | "editGroup" | "table" | "move" | "app";
  name: string;
  parentId: string;
  group?: Group;
  table?: Table;
  description?: string;
  color?: string;
  icon?: string;
};
export function AppWorkspace() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const openDesigner = useDesignerNavigation();
  const [params, setParams] = useSearchParams();
  const workspace = useLoad<Application>(`${base}/applications/${appId}`);
  const directory = useLoad<Directory>("/api/v1/organization");
  const me = useLoad<DefaultUser>("/api/v1/me");
  const app = workspace.data;
  const tableId = params.get("table") || app?.tables[0]?.id;
  const tableState = useLoad<Table>(
    tableId ? `${base}/tables/${tableId}` : undefined,
  );
  const table = tableState.data;
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [showTree, setShowTree] = useState(false);
  const desktopDirectory = useSyncExternalStore(subscribeDirectoryViewport, isDesktopDirectory, serverDirectoryViewport);
  const [naming, setNaming] = useState<Naming>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState<Table>();
  const [archivingApp, setArchivingApp] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group>();
  const [sharing, setSharing] = useState(false);
  const [editor, setEditor] = useState<{
    mode: "create" | "edit" | "read";
    row?: Row;
    schema: TableSchema;
    requestKey: string;
  }>();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [uploading, setUploading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Row>();
  const rows = useLoad<{ items: Row[]; total: number; offset: number }>(
    table?.publishedVersion && table.appId === appId && table.permissions.read !== "NONE"
      ? `${base}/tables/${table.id}/records?offset=${offset}&q=${encodeURIComponent(query)}&mine=${mine}`
      : undefined,
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setOffset(0);
    setSearch("");
    setQuery("");
    setEditor(undefined);
    if (tableId)
      setTabs((old) => (old.includes(tableId) ? old : [...old, tableId]));
  }, [tableId]);
  useEffect(() => {
    setTabs([]);
    setCollapsed([]);
  }, [appId]);
  useEffect(() => {
    setShowTree(false);
    setMenu("");
  }, [desktopDirectory, appId]);
  if (workspace.loading || workspace.error || !app)
    return <LoadState error={workspace.error} retry={workspace.refresh} />;
  const people = directory.data || blankDirectory;
  const fields =
    table?.publishedVersion?.schema.fields.filter((f) => !isDecoration(f) && isFieldVisible(f, "edit", true)) ||
    [];
  function select(id: string) {
    setParams({ table: id });
    setShowTree(false);
  }
  function openNaming(value: Naming) {
    setError("");
    setNaming(value);
  }
  async function mutation(work: () => Promise<unknown>, success = "已保存") {
    setBusy(true);
    setError("");
    try {
      await work();
      toast.success(success);
      workspace.refresh();
      tableState.refresh();
      rows.refresh();
      return true;
    } catch (e) {
      setError(message(e));
      toast.error(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveName() {
    if (!naming || !app) return;
    const n = naming;
    const reserved = n.kind === "table" ? reserveDesignerWindow() : undefined;
    const ok = await mutation(async () => {
      if (n.kind === "group" || n.kind === "editGroup")
        await api(
          `${base}/applications/${app.id}/groups${n.group ? `/${n.group.id}` : ""}`,
          n.group ? "PUT" : "POST",
          {
            name: n.name,
            parentId: n.parentId || null,
            position: n.group?.position || 0,
          },
        );
      if (n.kind === "table") {
        const created = await api<Table>(
          `${base}/applications/${app.id}/tables`,
          "POST",
          { name: n.name, groupId: n.parentId || null },
        );
        select(created.id);
        openDesigner(`/apps/${app.id}/tables/${created.id}/design`, reserved);
      }
      if (n.kind === "move" && n.table) {
        const current = await api<Table>(
          `${base}/tables/${n.table.id}?manage=true`,
        );
        await api(`${base}/tables/${n.table.id}`, "PUT", {
          revision: current.revision,
          draft: current.draft,
          groupId: n.parentId || null,
        });
      }
      if (n.kind === "app")
        await api(`${base}/applications/${app.id}`, "PUT", {
          revision: app.revision,
          name: n.name,
          description: n.description ?? app.description,
          icon: n.icon ?? app.icon,
          color: n.color ?? app.color,
        });
    });
    if (ok) setNaming(undefined);
    else reserved?.close();
  }
  async function openRow(row: Row, edit: boolean) {
    if (!table) return;
    setError("");
    try {
      const detail = await api<Row>(`${base}/records/${row.id}`);
      const config = edit ? table.publishedVersion!.schema : detail.schema!;
      setValues(valuesForFields(config.fields, detail.data));
      setErrors({});
      setEditor({
        mode: edit ? "edit" : "read",
        row: { ...row, ...detail },
        schema: config,
        requestKey: crypto.randomUUID(),
      });
    } catch (e) {
      toast.error(message(e));
    }
  }
  async function saveRecord(submit: boolean) {
    if (!editor || !table || uploading || resolving || busy) return;
    const invalid = validateValues(editor.schema, values, submit, {
      mode: editor.mode === "create" ? "create" : "edit", existing: editor.row?.data,
    });
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Change>(
        `${base}/tables/${table.id}/records${editor.mode === "edit" ? `/${editor.row!.id}` : ""}`,
        editor.mode === "edit" ? "PUT" : "POST",
        {
          requestKey: editor.requestKey,
          data: values,
          title: table.name,
          submit,
          revision: editor.row?.revision,
        },
      );
      setEditor(undefined);
      rows.refresh();
      toast.success(
        result.status === "DRAFT"
            ? "已保存到我的申请草稿"
            : "记录已保存，相关流程将独立运行",
      );
      if (result.status === "DRAFT") navigate(`/workflows/${result.id}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const groupOptions = [
    { value: "", label: "应用根目录" },
    ...app.groups
      .filter((g) => g.id !== naming?.group?.id)
      .map((g) => ({ value: g.id, label: g.name })),
  ];
  function tableItem(item: Table) {
    return (
      <div
        key={item.id}
        onContextMenu={(event) => {
          if (app!.canManage) {
            event.preventDefault();
            setMenu(item.id);
          }
        }}
        className={cn(
          "group flex items-center rounded-control pl-3",
          item.id === tableId
            ? "bg-primary/8 text-primary"
            : "hover:bg-muted/60",
        )}
      >
        <ActionSurface
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-current={item.id === tableId ? "page" : undefined}
          onClick={() => select(item.id)}
        >
          <span className="inline-flex shrink-0"><Table2 size={16} /></span>
          <span className="truncate">{item.name}</span>
          {!item.publishedVersionId && (
            <span className="ml-auto text-caption text-muted-foreground">
              草稿
            </span>
          )}
        </ActionSurface>
        {app!.canManage && (
          <Dropdown.Root
            open={menu === item.id}
            onOpenChange={(open) => setMenu(open ? item.id : "")}
          >
            <Dropdown.Trigger asChild>
              <ActionSurface
                aria-label={`${item.name}的操作`}
                className="m-1"
              >
                <MoreAction size={16} />
              </ActionSurface>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content data-dw-surface="menu"
                side="right"
                align="start"
                sideOffset={8}
                className="p-1.5"
              >
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() =>
                    openDesigner(`/apps/${appId}/tables/${item.id}/design`)
                  }
                >
                  <FilePenAction size={15} />
                  设计表单
                </Dropdown.Item>
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() =>
                    openDesigner(`/apps/${appId}/tables/${item.id}/workflow`)
                  }
                >
                  <GitBranch size={15} />
                  编辑流程
                </Dropdown.Item>
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() => {
                    select(item.id);
                    setSharing(true);
                  }}
                >
                  <Share2 size={15} />
                  分享表单
                </Dropdown.Item>
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() =>
                    openNaming({
                      kind: "move",
                      table: item,
                      name: item.name,
                      parentId: item.groupId || "",
                    })
                  }
                >
                  <Folder size={15} />
                  移动到分组
                </Dropdown.Item>
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() => navigate(`/apps/${appId}/permissions`)}
                >
                  <ShieldCheck size={15} />
                  配置权限
                </Dropdown.Item>
                <Dropdown.Separator className="my-1" />
                <Dropdown.Item
                  className={cn(menuItem, "")}
                  onSelect={() => setArchiving(item)}
                >
                  <TrashAction size={15} />
                  归档数据表
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        )}
      </div>
    );
  }
  function branch(parent: string | null, depth = 0): React.ReactNode {
    if (depth > 12) return null;
    return (
      <>
        {app!.groups
          .filter((g) => (g.parentId || null) === parent)
          .map((group) => (
            <div key={group.id} className="mt-2">
              <div className="flex items-center rounded-control px-2 py-1 text-muted-foreground">
                <ActionSurface
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  onClick={() =>
                    setCollapsed((v) =>
                      v.includes(group.id)
                        ? v.filter((id) => id !== group.id)
                        : [...v, group.id],
                    )
                  }
                >
                  {collapsed.includes(group.id) ? (
                    <ChevronRight size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  <Folder size={14} />
                  <span className="truncate">{group.name}</span>
                </ActionSurface>
                {app!.canManage && (
                  <Dropdown.Root>
                    <Dropdown.Trigger asChild>
                      <ActionSurface

                        aria-label={`${group.name}分组操作`}
                      >
                        <MoreAction size={15} />
                      </ActionSurface>
                    </Dropdown.Trigger>
                    <Dropdown.Portal>
                      <Dropdown.Content data-dw-surface="menu"
                        side="right"
                        className="p-1.5"
                      >
                        <Dropdown.Item
                          className={menuItem}
                          onSelect={() =>
                            openNaming({
                              kind: "table",
                              name: "",
                              parentId: group.id,
                            })
                          }
                        >
                          <PlusAction size={14} />
                          新建数据表
                        </Dropdown.Item>
                        <Dropdown.Item
                          className={menuItem}
                          onSelect={() =>
                            openNaming({
                              kind: "group",
                              name: "",
                              parentId: group.id,
                            })
                          }
                        >
                          <FolderPlusAction size={14} />
                          新建子分组
                        </Dropdown.Item>
                        <Dropdown.Item
                          className={menuItem}
                          onSelect={() =>
                            openNaming({
                              kind: "editGroup",
                              name: group.name,
                              parentId: group.parentId || "",
                              group,
                            })
                          }
                        >
                          <SettingsAction size={14} />
                          编辑分组
                        </Dropdown.Item>
                        <Dropdown.Item
                          className={cn(menuItem, "")}
                          onSelect={() => setDeletingGroup(group)}
                        >
                          <TrashAction size={14} />
                          删除空分组
                        </Dropdown.Item>
                      </Dropdown.Content>
                    </Dropdown.Portal>
                  </Dropdown.Root>
                )}
              </div>
              {!collapsed.includes(group.id) && (
                <div className="ml-3 border-l border-border/60 pl-1">
                  {branch(group.id, depth + 1)}
                  {app!.tables
                    .filter((t) => t.groupId === group.id)
                    .map(tableItem)}
                  {!app!.tables.some((t) => t.groupId === group.id) &&
                    !app!.groups.some((g) => g.parentId === group.id) && (
                      <p className="px-4 py-2 text-caption text-muted-foreground/60">
                        暂无数据表
                      </p>
                    )}
                </div>
              )}
            </div>
          ))}
      </>
    );
  }
  const navigation = (
      <>
        <Link to="/apps" className="mb-5 flex items-center gap-3 px-2 pt-2">
          <AppIcon icon={app.icon} color={app.color} small />
          <span className="min-w-0">
            <span className="block truncate text-body font-medium">
              {app.name}
            </span>
            <span className="text-caption text-muted-foreground">
              切换应用 <span className="inline-flex"><ChevronDown size={16} /></span>
            </span>
          </span>
        </Link>
        {app.canManage && (
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button variant="secondary" className="mb-4 w-full">
                <PlusAction size={16} />
                新建
                  <ChevronDown size={16} className="ml-auto" />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content data-dw-surface="menu" className="p-1.5">
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() =>
                    openNaming({ kind: "table", name: "", parentId: "" })
                  }
                >
                  <Table2 size={16} />
                  新建数据表
                </Dropdown.Item>
                <Dropdown.Item
                  className={menuItem}
                  onSelect={() =>
                    openNaming({ kind: "group", name: "", parentId: "" })
                  }
                >
                  <FolderPlusAction size={16} />
                  新建分组
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        )}
        <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="分组与数据表">
          {app.tables.filter((t) => !t.groupId).map(tableItem)}
          {branch(null)}
          {!app.tables.length && !app.groups.length && (
            <p className="p-3 text-caption leading-6 text-muted-foreground">
              按业务建立分组，再添加表单与数据。
            </p>
          )}
        </nav>
        {app.canManage && (
          <div className="mt-6 space-y-1 border-t border-border pt-3">
            <Link
              to={`/apps/${app.id}/permissions`}
              className="flex items-center gap-2 rounded-control px-3 py-2.5 text-body text-muted-foreground hover:bg-muted"
            >
              <ShieldCheck size={16} />
              权限组
            </Link>
            <ActionSurface
              onClick={() =>
                openNaming({
                  kind: "app",
                  name: app.name,
                  parentId: "",
                  description: app.description,
                  color: app.color,
                  icon: app.icon,
                })
              }
              className="flex w-full items-center gap-2"
            >
              <SettingsAction size={16} />
              应用设置
            </ActionSurface>
          </div>
        )}
      </>
  );
  return (
    <div data-app-frame="application" className="relative flex min-h-workspace-body min-w-0 flex-1 bg-ui-ground">
      {desktopDirectory ? (
        <aside aria-label="应用目录" className="flex w-sidebar shrink-0 flex-col border-r border-ui-border bg-ui-surface p-3">
          {navigation}
        </aside>
      ) : (
        <Drawer
          open={showTree}
          onOpenChange={(open) => {
            setShowTree(open);
            if (!open) setMenu("");
          }}
          side="left"
          ariaLabel="应用目录"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
            <p className="text-body font-semibold">应用目录</p>
            <Button variant="ghost" size="icon" aria-label="关闭应用目录" onClick={() => setShowTree(false)}>
              <CloseAction size={18} />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">{navigation}</div>
        </Drawer>
      )}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="dw-local-bar overflow-x-auto">
          {!desktopDirectory && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="展开应用目录"
              aria-expanded={showTree}
              aria-haspopup="dialog"
              onClick={() => setShowTree(true)}
            >
              <LayoutList size={18} />
            </Button>
          )}
          {tabs
            .map((id) => app.tables.find((t) => t.id === id))
            .filter((t): t is Table => Boolean(t))
            .map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex shrink-0 items-center rounded-t-control px-2 text-caption",
                  t.id === tableId
                    ? "h-full border-b-2 border-primary bg-background text-primary"
                    : "text-muted-foreground",
                )}
              >
                <ActionSurface
                  className="flex items-center gap-2"
                  onClick={() => select(t.id)}
                >
                  <Table2 size={16} />
                  {t.name}
                </ActionSurface>
                {tabs.length > 1 && (
                  <ActionSurface
                    aria-label={`关闭${t.name}标签`}

                    onClick={() => {
                      const next = tabs.filter((id) => id !== t.id);
                      setTabs(next);
                      if (t.id === tableId && next[0]) select(next[0]);
                    }}
                  >
                    <CloseAction size={16} />
                  </ActionSurface>
                )}
              </div>
            ))}
        </div>
        {!tableId ? (
          <div className="m-auto w-full max-w-xl p-8">
            <EmptyState
              title="为应用添加第一张数据表"
              action={
                app.canManage ? (
                  <Button
                    onClick={() =>
                      openNaming({ kind: "table", name: "", parentId: "" })
                    }
                  >
                    <PlusAction size={16} />
                    新建数据表
                  </Button>
                ) : undefined
              }
            >
              每张表都可以设计自己的字段、权限和审批流程。
            </EmptyState>
          </div>
        ) : tableState.loading || tableState.error || !table || table.appId !== app.id ? (
          <LoadState error={tableState.error || (table && table.appId !== app.id ? "数据表不属于当前应用" : "")} retry={tableState.refresh} />
        ) : (
          <>
            <header data-dw-enter="header" className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4 sm:p-7">
              <div>
                <div className="mb-2 flex items-center gap-2 text-caption text-muted-foreground">
                  <span>{app.name}</span>
                  <ChevronRight size={12} />
                  <span>
                    {app.groups.find((g) => g.id === table.groupId)?.name ||
                      "数据表"}
                  </span>
                </div>
                <h1 className="text-title font-medium">{table.name}</h1>
                {table.description && (
                  <p className="mt-2 max-w-2xl text-body text-muted-foreground">
                    {table.description}
                  </p>
                )}
              </div>
              {table.permissions.manage && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      openDesigner(`/apps/${app.id}/tables/${table.id}/design`)
                    }
                  >
                    <FilePenAction size={15} />
                    表单设计
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      openDesigner(`/apps/${app.id}/tables/${table.id}/workflow`)
                    }
                  >
                    <GitBranch size={15} />
                    审批流程
                  </Button>
                </div>
              )}
            </header>
            {!table.publishedVersion ? (
              <div className="m-auto w-full max-w-xl p-8">
                <EmptyState
                  title="设计并发布表单"
                  action={
                    table.permissions.manage ? (
                      <Button
                        onClick={() =>
                          openDesigner(`/apps/${app.id}/tables/${table.id}/design`)
                        }
                      >
                        开始设计
                      </Button>
                    ) : undefined
                  }
                >
                  添加字段后发布，即可新增数据或分享给成员填写。
                </EmptyState>
              </div>
            ) : (
              <div className="flex min-h-96 min-w-0 flex-1 flex-col px-5 pb-5 sm:px-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Input

                        leftIcon={<SearchAction size={15} />}
                        aria-label="搜索记录"
                        placeholder="搜索记录内容"
                        value={search}
                        onChange={(e) => setSearch(e)}
                      />
                    </div>
                    {table.permissions.read === "ALL" && (
                      <Button
                        size="sm"
                        variant={mine ? "secondary" : "ghost"}
                        onClick={() => {
                          setMine(!mine);
                          setOffset(0);
                        }}
                      >
                        只看我的
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="刷新数据"
                      onClick={rows.refresh}
                    >
                      <RefreshAction running={rows.loading} size={15} />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {table.permissions.manage && (
                      <Button
                        variant="secondary"
                        onClick={() => setSharing(true)}
                      >
                        <Share2 size={15} />
                        分享
                      </Button>
                    )}
                    {table.permissions.create && (
                      <Button disabled={!me.data} title={me.error || undefined}
                        onClick={() => {
                          setError("");
                          setErrors({});
                          setValues(
                            initialValues(table.publishedVersion!.schema, me.data),
                          );
                          setEditor({
                            mode: "create",
                            schema: table.publishedVersion!.schema,
                            requestKey: crypto.randomUUID(),
                          });
                        }}
                      >
                        <PlusAction size={16} />
                        新增记录
                      </Button>
                    )}
                  </div>
                </div>
                {table.permissions.read === "NONE" ? (
                  <EmptyState title="你可以在这里新增记录">
                    当前权限组未开放已有数据的查看权限。
                  </EmptyState>
                ) : rows.error ? (
                  <LoadState error={rows.error} retry={rows.refresh} />
                ) : (
                  <RecordsTable
                    ruleFields={table.publishedVersion!.schema.fields}
                    fields={fields}
                    items={rows.data?.items ?? []}
                    total={rows.data?.total ?? 0}
                    offset={offset}
                    directory={people}
                    loading={rows.loading}
                    query={query}
                    onView={(row) => void openRow(row, false)}
                    onEdit={(row) => void openRow(row, true)}
                    onDelete={(row) => {
                      setError("");
                      setDeleting(row);
                    }}
                    onPrev={() => setOffset((n) => Math.max(0, n - 50))}
                    onNext={() => setOffset((n) => n + 50)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </section>
      <AppModal
        open={Boolean(naming)}
        onOpenChange={(open) => {
          if (!open) setNaming(undefined);
        }}
        dismissible={!busy}
        title={
          naming?.kind === "move"
            ? "移动数据表"
            : naming?.kind === "app"
              ? "应用设置"
              : naming?.kind === "editGroup"
                ? "编辑分组"
                : naming?.kind === "table"
                  ? "新建数据表"
                  : "新建分组"
        }
        footer={
          <Button disabled={busy} onClick={() => void saveName()}>
            {busy ? "保存中…" : "保存"}
          </Button>
        }
      >
        <div className="space-y-4">
          {naming?.kind !== "move" && (
            <Field label="名称">
              <Input
                autoFocus
                aria-label="名称"
                value={naming?.name || ""}
                maxLength={128}
                onChange={(e) => setNaming((n) => (n ? { ...n, name: e } : n))}
              />
            </Field>
          )}
          {naming?.kind !== "app" && (
            <FieldSelect
              label="所在分组"
              value={naming?.parentId || ""}
              options={groupOptions}
              onChange={(parentId) =>
                setNaming((n) => (n ? { ...n, parentId } : n))
              }
            />
          )}
          {naming?.kind === "app" && (
            <>
              <Field label="应用说明">
                <Input
                  value={naming.description || ""}
                  aria-label="应用说明"
                  onChange={(description) =>
                    setNaming((n) => (n ? { ...n, description } : n))
                  }
                  maxLength={2000}
                />
              </Field>
              <div>
                <FieldSelect
                  label="图标"
                  value={naming.icon || "layers"}
                  onChange={(icon) =>
                    setNaming((n) => (n ? { ...n, icon } : n))
                  }
                  options={[
                    { value: "layers", label: "应用" },
                    { value: "briefcase", label: "工作" },
                    { value: "users", label: "团队" },
                    { value: "target", label: "目标" },
                    { value: "calendar", label: "日程" },
                    { value: "box", label: "资产" },
                  ]}
                />
              </div>
              <div className="border-t border-border pt-3">
                <Button
                  variant="ghost"

                  onClick={() => {
                    setNaming(undefined);
                    setError("");
                    setArchivingApp(true);
                  }}
                >
                  归档应用
                </Button>
              </div>
            </>
          )}
          <ErrorLine error={error} />
        </div>
      </AppModal>
      <AppModal
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(undefined);
        }}
        dismissible={!busy}
        className="max-w-7xl"
        bodyClassName="max-h-record-panel"
        title={
          editor?.mode === "read"
            ? "记录详情"
            : editor?.mode === "edit"
              ? "修改记录"
              : "新增记录"
        }
        description={
          editor?.mode === "edit"
            ? "提交后保存新版本；相关流程独立处理，拒绝不会自动恢复旧值。"
            : undefined
        }
        footer={
          editor?.mode !== "read" ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={busy || uploading || resolving}
                onClick={() => void saveRecord(false)}
              >
                存为草稿
              </Button>
              <Button disabled={busy || uploading || resolving} onClick={() => void saveRecord(true)}>
                {resolving ? "正在读取字段数据…" : uploading ? "等待文件上传…" : busy ? "正在保存…" : "提交"}
              </Button>
            </div>
          ) : undefined
        }
      >
        {editor && (
          <>
            {editor.mode === "read" && editor.row ? <RecordDetail row={editor.row} schema={editor.schema} directory={people} onOwnershipChanged={()=>{rows.refresh();setEditor(undefined);toast.success("记录归属已更新");}}/> :
            <FieldRenderer
              schema={editor.schema}
              originalValue={editor.row?.data}
              mode={editor.mode === "create" ? "create" : "edit"}
              fileContext={tableId ? { tableId, versionId: table?.publishedVersion?.id ?? table?.publishedVersionId, recordId: editor.row?.id, recordRevision: editor.row?.revision } : undefined}
              onUploadingChange={setUploading}
              onResolvingChange={setResolving}
              directory={people}
              value={values}
              onChange={setValues}
              readOnly={editor.mode === "read"}
              disabled={busy}
              errors={errors}
            />
            }
            <ErrorLine error={error} />
          </>
        )}
      </AppModal>
      <AppModal
        open={Boolean(deleting || archiving || deletingGroup || archivingApp)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(undefined);
            setArchiving(undefined);
            setDeletingGroup(undefined);
            setArchivingApp(false);
          }
        }}
        dismissible={!busy}
        title={
          archivingApp
            ? "归档应用"
            : archiving
              ? "归档数据表"
              : deletingGroup
                ? "删除空分组"
                : "删除记录"
        }
        description={
          archivingApp
            ? `归档“${app.name}”后将关闭应用入口及分享链接。已有审批和审计记录保留。`
            : archiving
              ? `归档“${archiving.name}”后将关闭新增和分享入口，已有审批记录保留。`
              : deletingGroup
                ? `将删除“${deletingGroup.name}”。非空分组无法删除。`
                : "记录将从数据表中移除，变更历史会保留。"
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDeleting(undefined);
                setArchiving(undefined);
                setDeletingGroup(undefined);
                setArchivingApp(false);
              }}
            >
              取消
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void mutation(async () => {
                  if (deleting)
                    await api(
                      `${base}/records/${deleting.id}?revision=${deleting.revision}`,
                      "DELETE",
                    );
                  if (archiving)
                    await api(
                      `${base}/tables/${archiving.id}/archive`,
                      "POST",
                      { revision: archiving.revision },
                    );
                  if (deletingGroup)
                    await api(
                      `${base}/applications/${app.id}/groups/${deletingGroup.id}`,
                      "DELETE",
                    );
                  if (archivingApp) {
                    await api(
                      `${base}/applications/${app.id}/archive`,
                      "POST",
                      { revision: app.revision },
                    );
                    navigate("/apps");
                  }
                  setDeleting(undefined);
                  setArchiving(undefined);
                  setDeletingGroup(undefined);
                  setArchivingApp(false);
                  if (archiving) setParams({});
                })
              }
            >
              确认
            </Button>
          </div>
        }
      >
        <ErrorLine error={error} />
      </AppModal>
      {table && (
        <ShareDialog open={sharing} onOpenChange={setSharing} table={table} />
      )}
    </div>
  );
}
/** Editing uses the current schema; historical detail uses its own pinned schema. */
function valuesForFields(fields: LowcodeField[], values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(fields.filter((field) => !isDecoration(field) && values[field.id] !== undefined).map((field) => {
    const value = values[field.id];
    if (field.type !== "subtable" || !field.subtableConfig || !Array.isArray(value)) return [field.id, value];
    return [field.id, value.map((row: { id: string; values: Record<string, unknown> }) => ({
      id: row.id, values: valuesForFields(field.subtableConfig!.fields, row.values),
    }))];
  }));
}
function fieldCell(field: LowcodeField, row: Row, directory: Directory, primary: boolean, onView: (row: Row) => void, ruleFields: LowcodeField[]) {
  if (field.visibleWhen && !ruleMatches(field.visibleWhen, row.data, ruleFields)) return <span className="text-muted-foreground">—</span>;
  const label = fieldValueLabel(field, row.data[field.id], directory);
  if (primary) {
    return (
      <ActionSurface
        type="button"
        onClick={() => onView(row)}
        className="block max-w-64 truncate"
      >
        {label}
      </ActionSurface>
    );
  }
  if (field.type === "progress" && typeof row.data[field.id] === "number") {
    return (
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <span
            className="dw-data-app-workspace-1 block h-full rounded-full bg-primary"
            style={({ "--dw-data-app-workspace-1-width": cssLength(`${Math.max(0, Math.min(100, Number(row.data[field.id])))}%`) }) as DataStyle}
          />
        </span>
        <span className="text-caption tabular-nums">{String(row.data[field.id])}%</span>
      </span>
    );
  }
  if (field.type === "checkbox") {
    return (
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-control border",
          row.data[field.id] ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {row.data[field.id] === true && <Check size={12} />}
      </span>
    );
  }
  return (
    <span className="block max-w-64 truncate" title={label}>
      {label}
    </span>
  );
}

function RecordsTable({
  fields,
  ruleFields,
  items,
  total,
  offset,
  directory,
  loading,
  query,
  onView,
  onEdit,
  onDelete,
  onPrev,
  onNext,
}: {
  fields: LowcodeField[];
  ruleFields: LowcodeField[];
  items: Row[];
  total: number;
  offset: number;
  directory: Directory;
  loading: boolean;
  query: string;
  onView: (row: Row) => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(440);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const sync = () => setHeight(Math.max(240, el.clientHeight));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const seq = useMemo(
    () => new Map(items.map((row, index) => [row.id, offset + index + 1])),
    [items, offset],
  );
  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      {
        key: "_index",
        header: "#",
        width: "56px",
        cell: (row) => (
          <span className="text-caption text-muted-foreground">{seq.get(row.id)}</span>
        ),
      },
      ...fields.map((field, index) => ({
        key: field.id,
        header: field.label,
        sortable: true,
        width: index === 0 ? "1.4fr" : "180px",
        sortValue: (row: Row) => {
          if (field.visibleWhen && !ruleMatches(field.visibleWhen, row.data, ruleFields)) return "";
          const value = row.data[field.id];
          if (typeof value === "number") return value;
          if (field.type === "date" || field.type === "datetime") {
            const time = Date.parse(String(value ?? ""));
            return Number.isNaN(time) ? "" : time;
          }
          return fieldValueLabel(field, value, directory);
        },
        cell: (row: Row) => fieldCell(field, row, directory, index === 0, onView, ruleFields),
      })),
      {
        key: "_title",
        header: "记录标题",
        width: "220px",
        cell: (row) => <ActionSurface type="button" className="max-w-full truncate text-left" onClick={()=>onView(row)}>{row.title||"查看记录"}</ActionSurface>,
      },
      {
        key: "_owner",
        header: "业务负责人",
        width: "120px",
        cell: (row) => <span className="text-caption">{row.ownerName??directory.people.find(person=>person.id===row.ownerId)?.displayName??row.creatorName}</span>,
      },
      {
        key: "_creator",
        header: "创建人",
        sortable: true,
        width: "120px",
        sortValue: (row) => row.creatorName,
        cell: (row) => <span className="text-caption">{row.creatorName}</span>,
      },
      {
        key: "_created",
        header: "创建时间",
        sortable: true,
        width: "160px",
        sortValue: (row) => Date.parse(row.createdAt) || 0,
        cell: (row) => (
          <span className="text-caption text-muted-foreground">{dateLabel(row.createdAt)}</span>
        ),
      },
      {
        key: "_actions",
        header: "操作",
        width: "220px",
        cell: (row) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onView(row)}>
              查看
            </Button>
            {row.pendingChange && (
              <span className="pr-2 text-caption text-status-warning">审批中</span>
            )}
                {row.canUpdate && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                    修改
                  </Button>
                )}
                {row.canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="删除记录"
                    onClick={() => onDelete(row)}
                  >
                    <TrashAction size={14} />
                  </Button>
                )}
          </div>
        ),
      },
    ],
    [directory, fields, ruleFields, onDelete, onEdit, onView, seq],
  );
  return (
    <div className="flex min-h-80 min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border">
      <div ref={frame} className="min-h-0 min-w-0 flex-1">
        <MotionTable
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          resizable
          reorderable
          height={height}
          rowHeight={52}
          className="h-full"
          emptyState={
            query ? "没有匹配的记录，试试其他关键词。" : "还没有数据。点击新增记录，或分享表单邀请成员填写。"
          }
        />
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-caption text-muted-foreground">
        <span>共 {total} 条记录</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" disabled={offset === 0} onClick={onPrev}>
            上一页
          </Button>
          <span>
            {Math.floor(offset / 50) + 1} / {Math.max(1, Math.ceil(total / 50))}
          </span>
          <Button variant="ghost" size="sm" disabled={offset + 50 >= total} onClick={onNext}>
            下一页
          </Button>
        </div>
      </footer>
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="mt-3 text-body text-destructive">
      {error}
    </p>
  ) : null;
}
function ShareDialog({
  open,
  onOpenChange,
  table,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table;
}) {
  const links = useLoad<Share[]>(
    open ? `${base}/tables/${table.id}/shares` : undefined,
  );
  const [mode, setMode] = useState("FILL");
  const [days, setDays] = useState("7");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setUrl("");
    setError("");
  }, [open, table.id]);
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={`分享 · ${table.name}`}
      description="接收人使用公司账号登录后即可访问。"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <FieldSelect
          label="分享方式"
          value={mode}
          onChange={setMode}
          options={[
            { value: "FILL", label: "填写表单 · 仅允许新增" },
            { value: "DATA", label: "进入数据表 · 按权限组授权" },
          ]}
        />
        <p className="rounded-card bg-muted p-3 text-caption leading-6 text-muted-foreground">
          {mode === "FILL"
            ? "收到链接的公司成员可以提交新记录。链接不会授予已有数据的查看、修改或删除权限。"
            : "此链接打开应用数据表。接收人可执行的操作和数据范围由应用权限组决定。"}
        </p>
        <FieldSelect
          label="有效期"
          value={days}
          onChange={setDays}
          options={[
            { value: "1", label: "1 天" },
            { value: "7", label: "7 天" },
            { value: "30", label: "30 天" },
            { value: "90", label: "90 天" },
          ]}
        />
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const created = await api<{ token: string }>(
                `${base}/tables/${table.id}/shares`,
                "POST",
                { mode, days: Number(days) },
              );
              setUrl(`${location.origin}/apps/shared/${created.token}`);
              links.refresh();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Share2 size={15} />
          生成分享链接
        </Button>
        {url && (
          <Field label="分享链接">
            <div className="flex gap-2">
              <Input value={url} readOnly aria-label="分享链接" />
              <Button
                variant="secondary"
                aria-label="复制分享链接"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("链接已复制");
                  } catch {
                    setError("复制失败，请选中链接手动复制");
                  }
                }}
              >
                <CopyAction size={16} />
              </Button>
            </div>
          </Field>
        )}
        <ErrorLine error={error} />
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-caption font-medium text-muted-foreground">
            已生成的分享
          </h3>
          {links.error ? (
            <p role="alert" className="text-body text-destructive">
              {links.error}
            </p>
          ) : links.loading ? (
            <p className="text-caption text-muted-foreground">正在加载…</p>
          ) : !links.data?.length ? (
            <p className="text-caption text-muted-foreground">尚未创建分享链接</p>
          ) : (
            links.data.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-3 border-b border-border/50 py-3 text-caption"
              >
                <div>
                  <p>
                    {link.mode === "FILL" ? "仅填表新增" : "按权限访问数据表"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {link.revoked
                      ? "已撤销"
                      : new Date(link.expiresAt) < new Date()
                        ? "已过期"
                        : `${dateLabel(link.expiresAt)} 到期`}
                  </p>
                </div>
                {!link.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`${base}/shares/${link.id}`, "DELETE");
                        links.refresh();
                      } catch (e) {
                        setError(message(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    撤销
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppModal>
  );
}

