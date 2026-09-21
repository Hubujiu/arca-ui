import { ActionSurface, DataTable } from "@/components/controls";
import { useId, useState } from "react";
import { useParams } from "react-router-dom";
import * as Select from "@/components/overlays/select";
import { Check, ChevronDown, RotateCcw, ShieldCheck, Table2, Users } from "@/shared/icons/catalog";
import { PlusAction, SaveAction, TrashAction } from "@/shared/icons/motion";
import { AlertBanner, AppModal, Button, EmptyState, FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import { api, ApiError } from "@/shared/api/client";
import { cn } from "@/lib/utils";
import { type Directory } from "@/organization/model";
import { PeoplePicker } from "@/organization/PeoplePicker";
import { AppIcon, BackLink, LoadState } from "./common";
import { base, message, useLoad, type Application, type Grant, type Role, type Scope, type Table } from "./model";

type RoleData = { app: Application; roles: Role[]; tables: Table[] };
const NEW = "new-group";
const scopes: { value: Scope; label: string }[] = [{ value: "NONE", label: "无权限" }, { value: "OWN", label: "本人创建" }, { value: "ALL", label: "全部记录" }];
const scopeColumns = [{ key: "readScope", label: "查看" }, { key: "updateScope", label: "修改" }, { key: "deleteScope", label: "删除" }] as const;
function blankGrant(tableId: string): Grant { return { tableId, canCreate: false, readScope: "NONE", updateScope: "NONE", deleteScope: "NONE" }; }
function blankRole(): Role { return { name: "", manager: false, revision: 0, userIds: [], permissions: [] }; }
function rolePayload(role: Role) {
  return { name: role.name.trim(), manager: role.manager, revision: role.revision, userIds: role.userIds, permissions: role.permissions.map(({ tableId, canCreate, readScope, updateScope, deleteScope }) => ({ tableId, canCreate, readScope, updateScope, deleteScope })) };
}

function ScopePicker({ label, value, onChange, disabled }: { label: string; value: Scope; onChange: (value: Scope) => void; disabled: boolean }) {
  return <Select.Root value={value} onValueChange={(next) => onChange(next as Scope)} disabled={disabled}>
    <Select.Trigger aria-label={label} className={cn("", value === "NONE" && "")}><Select.Value /><Select.Icon><span className="inline-flex size-3.5"><ChevronDown  /></span></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content position="popper" sideOffset={5} collisionPadding={12} className="overflow-hidden p-1"><Select.Viewport>
      {scopes.map((scope) => <Select.Item key={scope.value} value={scope.value} ><Select.ItemIndicator ><span className="inline-flex size-3"><Check  /></span></Select.ItemIndicator><Select.ItemText>{scope.label}</Select.ItemText></Select.Item>)}
    </Select.Viewport></Select.Content></Select.Portal>
  </Select.Root>;
}

function PermissionEditor({ appId }: { appId: string }) {
  const resource = useLoad<RoleData>(`${base}/applications/${appId}/roles`);
  const directory = useLoad<Directory>("/api/v1/organization");
  const [selectedKey, setSelectedKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Role>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Role>();
  const editorId = useId();
  const data = resource.data;
  const key = selectedKey === NEW || data?.roles.some((role) => role.id === selectedKey) ? selectedKey : data?.roles[0]?.id ?? "";
  const savedRole = data?.roles.find((role) => role.id === key);
  const role = drafts[key] ?? savedRole;
  const dirty = !!role && (key === NEW || JSON.stringify(rolePayload(role)) !== JSON.stringify(savedRole && rolePayload(savedRole)));
  function select(next: string) { setSelectedKey(next); setError(""); setConflict(false); setNotice(""); }
  function update(patch: Partial<Role>) {
    if (!role || busy) return;
    setDrafts((current) => ({ ...current, [key]: { ...role, ...patch } })); setNotice("");
  }
  function clearDraft(target: string) { setDrafts((current) => { const next = { ...current }; delete next[target]; return next; }); }
  function add() {
    setDrafts((current) => ({ ...current, [NEW]: current[NEW] ?? blankRole() })); select(NEW);
  }
  function grant(tableId: string, patch: Partial<Grant>) {
    if (!role) return;
    const current = role.permissions.find((entry) => entry.tableId === tableId) ?? blankGrant(tableId);
    update({ permissions: [...role.permissions.filter((entry) => entry.tableId !== tableId), { ...current, ...patch }] });
  }
  function reload() { if (key) clearDraft(key); setError(""); setConflict(false); resource.refresh(); directory.refresh(); }
  async function save() {
    if (!role || !data || !role.name.trim() || busy) return;
    if (role.userIds.some((userId) => !directory.data?.people.some((person) => person.id === userId && person.enabled && person.loginBound))) {
      setError("请先移除已停用、未绑定或不在当前公司中的成员。"); return;
    }
    setBusy(true); setError(""); setConflict(false); setNotice("");
    try {
      const payload = rolePayload(role);
      payload.permissions = data.tables.map((table) => role.permissions.find((entry) => entry.tableId === table.id) ?? blankGrant(table.id));
      const result = await api<{ id: string }>(`${base}/applications/${appId}/roles${role.id ? `/${role.id}` : ""}`, role.id ? "PUT" : "POST", payload);
      clearDraft(key); setSelectedKey(result.id); setNotice("权限组已保存，新的权限将在后续请求中生效。"); resource.refresh();
    } catch (caught) { setError(message(caught)); setConflict(caught instanceof ApiError && caught.status === 409); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting?.id || busy) return;
    setBusy(true); setError("");
    try {
      await api(`${base}/applications/${appId}/roles/${deleting.id}?revision=${deleting.revision}`, "DELETE");
      clearDraft(deleting.id); setSelectedKey(""); setDeleting(undefined); setNotice("权限组已删除。"); resource.refresh();
    } catch (caught) { setError(message(caught)); setConflict(caught instanceof ApiError && caught.status === 409); setDeleting(undefined); }
    finally { setBusy(false); }
  }
  if (resource.error || directory.error) return <LoadState error={resource.error || directory.error} retry={() => { resource.refresh(); directory.refresh(); }} />;
  if (!data || !directory.data) return <LoadState retry={resource.refresh} title="正在加载应用权限…" />;
  return <section className="min-w-0 space-y-4">
    <header className="flex items-center gap-3"><AppIcon icon={data.app.icon} color={data.app.color} small /><div><h2 className="text-body font-semibold">{data.app.name}</h2><p className="mt-0.5 text-caption text-muted-foreground">应用创建者和门户超级管理员始终拥有管理权限。</p></div></header>
    {error && <AlertBanner title={error}>{conflict && <Button variant="outline" size="sm" onClick={reload}>放弃当前修改并重新加载</Button>}</AlertBanner>}
    {notice && <p role="status" className="rounded-card border border-primary/20 bg-primary/5 px-4 py-3 text-body text-primary">{notice}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-permission-settings">
      <aside className="self-start rounded-card border border-border bg-background p-3" aria-label="应用权限组">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-body font-semibold">权限组 <span className="ml-1 font-normal text-muted-foreground">{data.roles.length}</span></h3><Button variant="ghost" size="icon" aria-label="新建权限组" onClick={add} disabled={busy}><PlusAction size={16} /></Button></div>
        <div className="space-y-1">{data.roles.map((saved) => {
          const current = drafts[saved.id!] ?? saved;
          return <ActionSurface key={saved.id} type="button" disabled={busy} aria-pressed={key === saved.id} onClick={() => select(saved.id!)} className={"flex w-full items-start gap-2.5 text-left disabled:opacity-50"}>
            {current.manager ? <span className="inline-flex mt-0.5 size-4 shrink-0 text-primary"><ShieldCheck  /></span> : <span className="inline-flex mt-0.5 size-4 shrink-0 text-muted-foreground"><Users  /></span>}<span className="min-w-0"><span className="block truncate text-body font-medium">{current.name || "未命名权限组"}</span><span className="mt-0.5 block text-caption text-muted-foreground">{current.userIds.length} 位成员{drafts[saved.id!] ? " · 未保存" : current.manager ? " · 应用管理员" : ""}</span></span>
          </ActionSurface>;
        })}
          {drafts[NEW] && <ActionSurface type="button" disabled={busy} onClick={() => select(NEW)} aria-pressed={key === NEW} className={cn("flex w-full items-center gap-2 text-left", key === NEW && "")}><PlusAction size={16} /><span className="truncate">{drafts[NEW].name || "新权限组"}</span><span className="ml-auto whitespace-nowrap text-caption text-muted-foreground">草稿</span></ActionSurface>}
        </div>
        {!data.roles.length && !drafts[NEW] && <p className="px-2 py-5 text-caption leading-5 text-muted-foreground">应用当前保持私有。添加权限组并选择成员后，为他们配置数据访问范围。</p>}
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={add} disabled={busy}><PlusAction size={14} />新建权限组</Button>
      </aside>
      {role ? <div className="min-w-0 space-y-5 rounded-card border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-body font-semibold">{role.name || "新权限组"}</h3><p className="mt-1 text-caption text-muted-foreground">{dirty ? "有未保存的修改" : "配置已保存"}</p></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled={busy || !dirty} onClick={() => { if (key === NEW) { clearDraft(key); setSelectedKey(""); } else clearDraft(key); }}><span className="inline-flex size-3.5"><RotateCcw  /></span>重置</Button><Button size="sm" onClick={save} disabled={busy || !dirty || !role.name.trim()}><SaveAction running={busy} size={14} />{busy ? "保存中…" : "保存权限组"}</Button></div></div>
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <div className="max-w-md"><Input label="权限组名称" value={role.name} onChange={(name) => update({ name })} maxLength={128} placeholder="例如：项目成员、部门负责人" /></div>
          <section className="rounded-card bg-muted/40 p-4"><Checkbox checked={role.manager} onCheckedChange={(manager) => update({ manager })} disabled={busy} label="设为应用管理员" aria-describedby={`${editorId}-manager-help`} /><p id={`${editorId}-manager-help`} className="ml-8 mt-2 text-caption leading-5 text-muted-foreground">管理员可以设计表单与流程、管理权限和分享，并新增、查看、修改、删除本应用的全部记录。启用后，下方逐表权限不再限制该组成员。</p></section>
          <section className="space-y-3" aria-labelledby={`${editorId}-members-title`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 id={`${editorId}-members-title`} className="text-body font-semibold">成员 <span className="ml-1 font-normal text-muted-foreground">已选择 {role.userIds.length} / 500</span></h4>{role.userIds.length > 0 && <Button variant="ghost" size="sm" onClick={() => update({ userIds: [] })} disabled={busy}>清空成员</Button>}</div>
            <PeoplePicker directory={directory.data} value={role.userIds} onChange={(userIds) => update({ userIds })} disabled={busy} limit={500} className="h-88" />
          </section>
          <section className="space-y-3" aria-labelledby={`${editorId}-matrix-title`}>
            <h4 id={`${editorId}-matrix-title`} className="text-body font-semibold">数据表权限</h4><p className="text-caption leading-5 text-muted-foreground">“本人创建”始终指记录的原始创建人。同一成员加入多个权限组时，各组授予的权限合并生效。新权限组默认没有数据权限。</p>
            {role.manager && <p className="rounded-control bg-primary/5 px-3 py-2 text-caption text-primary">此组是应用管理员，拥有全部表的完整权限。关闭管理员后，下方配置才会生效。</p>}
            {!data.tables.length ? <div className="rounded-card border border-dashed border-border p-6 text-center text-body text-muted-foreground">应用还没有数据表。创建数据表后，可在此配置权限。</div>
              : <div className="max-w-full overflow-x-auto rounded-card border border-border"><DataTable className="w-full min-w-160"><caption className="sr-only">逐表配置新增、查看、修改和删除权限</caption><thead className="bg-muted/60 text-caption text-muted-foreground"><tr><th scope="col" className="min-w-40 px-4 py-3 text-left font-medium">数据表</th><th scope="col" className="px-3 py-3 text-center font-medium">新增</th>{scopeColumns.map((column) => <th key={column.key} scope="col" className="px-3 py-3 text-left font-medium">{column.label}范围</th>)}</tr></thead><tbody>
                {data.tables.map((table) => { const permission = role.permissions.find((entry) => entry.tableId === table.id) ?? blankGrant(table.id); return <tr key={table.id} className="border-t border-border"><th scope="row" className="px-4 py-3 text-left font-medium"><span className="flex items-center gap-2"><span className="inline-flex size-4 shrink-0 text-muted-foreground"><Table2  /></span><span className="max-w-60 truncate" title={table.name}>{table.name}</span></span></th><td className="px-3 py-3 text-center"><Checkbox checked={role.manager || permission.canCreate} onCheckedChange={(canCreate) => grant(table.id, { canCreate })} disabled={busy || role.manager} aria-label={`允许在${table.name}新增记录`} /></td>{scopeColumns.map((column) => <td key={column.key} className="px-3 py-3"><ScopePicker label={`${table.name}的${column.label}范围`} value={role.manager ? "ALL" : permission[column.key]} onChange={(scope) => grant(table.id, { [column.key]: scope })} disabled={busy || role.manager} /></td>)}</tr>; })}
              </tbody></DataTable></div>}
          </section>
        </fieldset>
        {role.id && <div className="border-t border-border pt-4"><Button variant="ghost" size="sm"  disabled={busy} onClick={() => setDeleting(savedRole ?? role)}><TrashAction size={14} />删除权限组</Button></div>}
      </div> : <EmptyState title="为应用设置权限组" action={<Button onClick={add}><PlusAction size={16} />新建权限组</Button>}>选择成员，再逐表配置新增、查看、修改和删除权限。</EmptyState>}
    </div>
    <AppModal open={!!deleting} onOpenChange={(open) => { if (!busy && !open) setDeleting(undefined); }} title={`删除权限组“${deleting?.name ?? ""}”`} description="删除后，成员通过此权限组获得的访问权会被收回。其他权限组授予的访问权仍然有效。" dismissible={!busy}
      footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(undefined)}>取消</Button><Button disabled={busy} onClick={remove} >{busy ? "删除中…" : "删除权限组"}</Button></div>}><p className="text-body text-muted-foreground">此权限组包含 {deleting?.userIds.length ?? 0} 位成员。</p></AppModal>
  </section>;
}

export function PermissionsPage() {
  const { appId } = useParams();
  if (!appId) return <EmptyState title="请选择一个应用" />;
  return <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-7"><BackLink to={`/apps/${appId}`}>返回应用</BackLink><header><h1 className="text-heading font-semibold tracking-tight">应用权限</h1><p className="mt-2 text-body text-muted-foreground">用权限组为公司成员分配应用管理权和数据范围。</p></header><PermissionEditor key={appId} appId={appId} /></div>;
}

export function AppPermissionsAdmin() {
  const applications = useLoad<Application[]>(`${base}/applications`);
  const [selected, setSelected] = useState("");
  if (applications.error || !applications.data) return <LoadState error={applications.error} retry={applications.refresh} title="正在加载可管理的应用…" />;
  const manageable = applications.data.filter((app) => app.canManage);
  const appId = manageable.some((app) => app.id === selected) ? selected : manageable[0]?.id;
  return <section className="min-w-0 space-y-5"><header><h2 className="text-title font-semibold">应用权限管理</h2><p className="mt-1 text-body text-muted-foreground">统一管理每个应用的权限组、成员与逐表数据范围。</p></header>
    {!appId ? <EmptyState title="暂无可管理的应用">创建应用后，可在此设置权限。</EmptyState> : <><div className="max-w-sm"><FieldSelect label="选择应用" value={appId} options={manageable.map((app) => ({ value: app.id, label: app.name }))} onChange={setSelected} /></div><PermissionEditor key={appId} appId={appId} /></>}
  </section>;
}
