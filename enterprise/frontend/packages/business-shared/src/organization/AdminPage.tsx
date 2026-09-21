import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { DataTable, TextEntry } from "@/components/controls";
import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  Users,
  BriefcaseBusiness,
  ScrollText,
  Network,
} from "@/shared/icons/catalog";
import { PencilAction, PlusAction, TrashAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import {
  AppModal,
  Button,
  EmptyState,
  ErrorState,
  FieldSelect,
  Input,
  StatefulButton,
} from "@/shared/ui";
import { toast } from "@/shared/toast";
import { useAdminAccess } from "../portal/useAdminAccess";
const AppPermissionsAdmin = lazy(() => import("../lowcode/PermissionsPage").then(m => ({ default: m.AppPermissionsAdmin })));
import {
  contains,
  departmentLeaderCandidates,
  managerCandidates,
  relationshipName,
  unitKinds,
  unitPath,
  type Directory,
  type Unit,
  type Person,
} from "./model";

const blank: Directory = { units: [], positions: [], people: [] };
const tabs = [
  { id: "people", label: "人员管理", icon: Users },
  { id: "organization", label: "组织架构", icon: Network },
  { id: "positions", label: "职位管理", icon: BriefcaseBusiness },
  { id: "audit", label: "审计日志", icon: ScrollText },
  { id: "applications", label: "应用权限", icon: Building2 },
];
const message = (e: unknown) =>
  e instanceof Error ? e.message : "操作未完成，请重试";

export function AdminPage() {
  const { me, loading: accessLoading, error: accessError, retry: retryAccess } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "people";
  const [directory, setDirectory] = useState<Directory>(blank);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("");
  const [person, setPerson] = useState<Partial<Person>>();
  const [password, setPassword] = useState("");
  const [creationKey, setCreationKey] = useState("");
  const [resetting, setResetting] = useState<Person>();
  const [demoOpen, setDemoOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Partial<Unit>>();
  const [deleting, setDeleting] = useState<Unit>();
  const [position, setPosition] = useState("");
  const [formError, setFormError] = useState("");
  async function reload() {
    try {
      setDirectory(await api<Directory>("/api/v1/organization"));
      setError("");
      setLoaded(true);
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    if (me?.systemRole === "ADMIN") void reload();
  }, [me?.id, me?.systemRole]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setFormError("");
    try {
      await api(path, method, body);
      window.dispatchEvent(new Event("portal-permissions-changed"));
      await reload();
      toast.success("已保存");
      return true;
    } catch (e) {
      setFormError(message(e));
      toast.error(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (accessLoading) return <EmptyState loading title="正在确认管理权限…" />;
  if (accessError && accessError.status !== 403) return <EmptyState title="无法加载后台设置" action={<Button onClick={retryAccess}>重试</Button>}>{accessError.message}</EmptyState>;
  if (me?.systemRole !== "ADMIN")
    return (
      <ErrorState status={403} title="需要管理员权限">
        请联系管理员维护组织和人员。
      </ErrorState>
    );
  const unitOptions = [
    { value: "", label: "未分配组织" },
    ...directory.units.map((u) => ({
      value: u.id,
      label: unitPath(directory.units, u.id),
    })),
  ];
  const people = directory.people.filter(
    (p) =>
      (!unit || contains(directory.units, unit, p.orgUnitId)) &&
      (!status || String(p.enabled) === status) &&
      [p.displayName, p.username, p.email]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function newPerson() {
    setFormError("");
    setPassword("");
    setCreationKey(crypto.randomUUID());
    setPerson({
      username: "",
      displayName: "",
      email: "",
      orgUnitId: unit || "",
      positionId: "",
      managerId: "",
      enabled: true,
      systemRole: "USER",
      portalRoot: false,
      knowledgeAccess: false,
    });
  }
  function unitTree(
    parentId: string | null = null,
    depth = 0,
  ): React.ReactNode {
    return directory.units
      .filter((u) => (u.parentId || null) === parentId)
      .map((u) => (
        <div key={u.id}>
          <div
            className="dw-data-admin-page-1 flex flex-wrap items-center gap-3 border-b border-border py-4 pr-4"
            style={({ "--dw-data-admin-page-1-padding-left": cssLength(16 + depth * 22) }) as DataStyle}
          >
            <span className="inline-flex shrink-0 text-muted-foreground"><Building2 size={18}  /></span>
            <div className="min-w-0 flex-1">
              <strong className="block text-body font-medium">{u.name}</strong>
              <span className="text-caption text-muted-foreground">
                {unitKinds[u.kind]} ·{" "}
                {
                  directory.people.filter(
                    (p) =>
                      p.enabled && contains(directory.units, u.id, p.orgUnitId),
                  ).length
                }{" "}
                位在职人员
                {u.kind === "DEPARTMENT" && ` · 负责人：${relationshipName(directory, u.leaderId)}`}
              </span>
            </div>
            {u.kind !== "TEAM" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormError("");
                  setEditingUnit({
                    name: "",
                    kind: u.kind === "COMPANY" ? "DEPARTMENT" : "TEAM",
                    parentId: u.id,
                  });
                }}
                aria-label={`在${u.name}下新建`}
              >
                <PlusAction size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-label={`编辑${u.name}`}
              onClick={() => {
                setFormError("");
                setEditingUnit(u);
              }}
            >
              <PencilAction size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`删除${u.name}`}
              onClick={() => {
                setFormError("");
                setDeleting(u);
              }}
            >
              <TrashAction size={14} />
            </Button>
          </div>
          {unitTree(u.id, depth + 1)}
        </div>
      ));
  }
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-caption text-muted-foreground">管理中心</p>
          <h1 className="text-heading font-medium tracking-tight">后台设置</h1>
          <p className="mt-2 text-body text-muted-foreground">
            统一维护门户的组织、人员和职位，查看审计记录。
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => { setPassword(""); setFormError(""); setDemoOpen(true); }}
        >
          创建示例公司
        </Button>
      </header>
      <div className="flex flex-wrap gap-7 border-b border-border pb-5 text-body">
        <span>
          <strong className="mr-2 text-title font-medium">
            {directory.people.filter((p) => p.enabled).length}
          </strong>
          在职人员
        </span>
        <span>
          <strong className="mr-2 text-title font-medium">
            {directory.units.filter((u) => u.kind === "DEPARTMENT").length}
          </strong>
          部门
        </span>
        <span>
          <strong className="mr-2 text-title font-medium">
            {directory.units.filter((u) => u.kind === "TEAM").length}
          </strong>
          小组
        </span>
        <span>
          <strong className="mr-2 text-title font-medium">
            {directory.positions.length}
          </strong>
          职位
        </span>
      </div>
      <nav aria-label="后台设置导航" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "primary" : "ghost"}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => {
              setParams({ tab: t.id });
              setFormError("");
            }}
          >
            <t.icon size={16} />
            {t.label}
          </Button>
        ))}
      </nav>
      {error ? (
        <EmptyState
          title="加载失败"
          action={<Button onClick={() => void reload()}>重试</Button>}
        >
          {error}
        </EmptyState>
      ) : !loaded ? (
        <EmptyState loading title="正在加载组织…" />
      ) : (
        <>
          {tab === "people" && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-44 flex-1">
                  <Input
                    label="搜索人员"
                    value={query}
                    onChange={setQuery}
                    placeholder="姓名、账号或邮箱"
                  />
                </div>
                <FieldSelect
                  label="所属组织"
                  value={unit}
                  onChange={setUnit}
                  options={[
                    { value: "", label: "所有组织" },
                    ...unitOptions.slice(1),
                  ]}
                />
                <FieldSelect
                  label="状态"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "", label: "全部状态" },
                    { value: "true", label: "在职" },
                    { value: "false", label: "已停用" },
                  ]}
                />
                <Button onClick={newPerson}>
                  <PlusAction size={16} />
                  新增人员
                </Button>
              </div>
              <div className="overflow-x-auto rounded-control border border-border bg-card">
                <DataTable className="w-full min-w-175 text-left">
                  <thead className="border-b border-border bg-muted/30 text-caption text-muted-foreground">
                    <tr>
                      {[
                        "人员",
                        "部门 / 小组",
                        "职位",
                        "直属上级",
                        "角色与状态",
                        "操作",
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {p.displayName.slice(0, 1)}
                            </span>
                            <span>
                              <strong className="block font-medium">
                                {p.displayName}
                                {p.isDemo && (
                                  <small className="ml-2 text-muted-foreground">
                                    示例
                                  </small>
                                )}
                              </strong>
                              <small className="block text-muted-foreground">账号：{p.username}</small>
                              <small className="block text-muted-foreground">{p.email || "未填写邮箱"} · 编号 {p.subjectId}</small>
                            </span>
                          </div>
                        </td>
                        <td className="max-w-56 px-4 py-4 text-caption">
                          {unitPath(directory.units, p.orgUnitId)}
                        </td>
                        <td className="px-4 py-4">
                          {directory.positions.find(
                            (j) => j.id === p.positionId,
                          )?.name || "未设置"}
                        </td>
                        <td className="px-4 py-4">
                          {relationshipName(directory, p.managerId)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-caption ${p.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            {p.enabled ? "在职" : "已停用"}
                          </span>
                          <small className="mt-2 block text-muted-foreground">
                            {p.portalRoot ? "超级管理员" : "公司成员"} · {p.knowledgeAccess ? "已开通知识库" : "未开通知识库"}
                          </small>
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`编辑${p.displayName}`}
                            onClick={() => {
                              setFormError("");
                              setPerson(p);
                            }}
                          >
                            编辑
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={`重置${p.displayName}的密码`}
                            onClick={() => { setPassword(""); setFormError(""); setResetting(p); }}>重置密码</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                {!people.length && (
                  <EmptyState  title="没有匹配的人员">
                    新增人员，或调整筛选条件。
                  </EmptyState>
                )}
              </div>
              <p className="text-caption text-muted-foreground">
                所有人员均为真实门户账号。超级管理员管理公司账号；知识库开通后，具体内容仍按部门、成员和共享权限展示。
              </p>
            </>
          )}
          {tab === "organization" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-body text-muted-foreground">
                  公司 → 部门 → 小组；部门共享会包含其下所有小组。
                </p>
                <Button
                  onClick={() => {
                    setFormError("");
                    setEditingUnit({ name: "", kind: "COMPANY", parentId: "" });
                  }}
                >
                  <PlusAction size={16} />
                  新建组织
                </Button>
              </div>
              <div className="overflow-x-auto rounded-control border border-border bg-card">
                {directory.units.length ? (
                  unitTree()
                ) : (
                  <EmptyState title="还没有组织">
                    建立公司和部门，或创建示例公司。
                  </EmptyState>
                )}
              </div>
            </>
          )}
          {tab === "positions" && (
            <section className="rounded-control border border-border bg-card p-5">
              <h2 className="font-medium">职位目录</h2>
              <p className="mt-1 text-body text-muted-foreground">
                为不同职能设置职位，可在人员档案中分配。
              </p>
              <form
                className="my-5 flex items-end gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate("/api/v1/organization/positions", "POST", {
                      name: position,
                    })
                  )
                    setPosition("");
                }}
              >
                <div className="flex-1">
                  <Input
                    label="职位名称"
                    value={position}
                    onChange={setPosition}
                    required
                    maxLength={128}
                    placeholder="例如：研发工程师"
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  添加职位
                </Button>
              </form>
              <div className="divide-y divide-border">
                {directory.positions.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    <span className="inline-flex text-muted-foreground"><BriefcaseBusiness
                      size={16}

                    /></span>
                    <span className="flex-1 text-body">{p.name}</span>
                    <span className="text-caption text-muted-foreground">
                      {
                        directory.people.filter(
                          (person) => person.positionId === p.id,
                        ).length
                      }{" "}
                      人
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {tab === "audit" && <AuditPanel directory={directory} />}
          {tab === "applications" && <Suspense fallback={<EmptyState loading title="正在读取应用权限…" />}><AppPermissionsAdmin /></Suspense>}
        </>
      )}
      <AppModal
        open={!!person}
        onOpenChange={(open) => {
          if (!open) setPerson(undefined);
        }}
        title={person?.id ? "编辑人员" : "新增人员"}
        description="创建后即可登录门户；停用会同时禁止门户登录并使已有会话失效。"
        dismissible={!busy}
      >
        {person && (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(
                  `/api/v1/organization/people${person.id ? `/${person.id}` : ""}`,
                  person.id ? "PUT" : "POST",
                  {
                    ...person,
                    password: person.id ? undefined : password,
                    creationKey: person.id ? undefined : creationKey,
                    orgUnitId: person.orgUnitId || null,
                    positionId: person.positionId || null,
                    managerId: person.managerId || null,
                  },
                )
              )
                setPerson(undefined);
            }}
          >
            <Input
              label="姓名"
              value={person.displayName || ""}
              onChange={(displayName) => setPerson({ ...person, displayName })}
              required
              maxLength={128}
            />
            <Input
              label="账号"
              value={person.username || ""}
              onChange={(username) => setPerson({ ...person, username })}
              required
              maxLength={64}
              disabled={!!person.id}
              pattern={"[a-z0-9][a-z0-9_.\\-]{2,63}"}
              autoComplete="username"
            />
            {!person.id && <Input label="初始密码" type="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" placeholder="至少 6 个字符，可设置为 123456" />}
            <Input
              label="邮箱"
              type="email"
              value={person.email || ""}
              onChange={(email) => setPerson({ ...person, email })}
              maxLength={254}
            />
            <FieldSelect
              label="部门 / 小组"
              value={person.orgUnitId || ""}
              onChange={(orgUnitId) => setPerson({ ...person, orgUnitId })}
              options={unitOptions}
            />
            <FieldSelect
              label="职位"
              value={person.positionId || ""}
              onChange={(positionId) => setPerson({ ...person, positionId })}
              options={[
                { value: "", label: "未设置" },
                ...directory.positions.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect
                label="直属上级"
                value={person.managerId || ""}
                onChange={(managerId) => setPerson({ ...person, managerId })}
                options={[
                  { value: "", label: "未设置" },
                  ...managerCandidates(directory, person.id).map((candidate) => ({
                    value: candidate.id,
                    label: `${candidate.displayName} · ${candidate.username}`,
                  })),
                  ...(person.managerId && !managerCandidates(directory, person.id).some((candidate) => candidate.id === person.managerId)
                    ? [{ value: person.managerId, label: relationshipName(directory, person.managerId) }]
                    : []),
                ]}
              />
            </div>
            <p className="text-caption text-muted-foreground">直属上级用于流程分派，可跨部门指定；本人和下属不可选。</p>
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect
                label="知识库角色"
                value={person.systemRole || "USER"}
                onChange={(systemRole) =>
                  setPerson({
                    ...person,
                    systemRole: systemRole as Person["systemRole"],
                  })
                }
                options={[
                  { value: "USER", label: "成员" },
                  { value: "ADMIN", label: "知识库管理员" },
                ]}
              />
              <FieldSelect
                label="状态"
                value={String(person.enabled)}
                onChange={(enabled) =>
                  setPerson({ ...person, enabled: enabled === "true" })
                }
                options={[
                  { value: "true", label: "在职" },
                  { value: "false", label: "停用" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect label="门户角色" value={String(!!person.portalRoot)} onChange={value => setPerson({ ...person, portalRoot: value === "true" })}
                options={[{ value: "false", label: "公司成员" }, { value: "true", label: "超级管理员" }]} />
              <FieldSelect label="知识库权限" value={String(!!person.knowledgeAccess)} onChange={value => setPerson({ ...person, knowledgeAccess: value === "true" })}
                options={[{ value: "false", label: "未开通" }, { value: "true", label: "已开通" }]} />
            </div>
            {formError && (
              <p role="alert" className="text-body text-destructive">
                {formError}
              </p>
            )}
            <StatefulButton
              type="submit"
              state={busy ? "loading" : "idle"}
              loadingText="保存中…"
            >
              保存人员
            </StatefulButton>
          </form>
        )}
      </AppModal>
      <AppModal open={!!resetting || demoOpen} onOpenChange={open => { if(!open) { setResetting(undefined); setDemoOpen(false); setPassword(""); } }}
        title={resetting ? `重置 ${resetting.displayName} 的密码` : "创建示例公司的真实账号"}
        description={resetting ? `登录账号：${resetting.username}。保存后原密码和已有登录会话立即失效。` : "为 12 位示例员工创建可登录账号；仅研发部及其小组开通知识库。已有账号的密码和授权保持原设置。"} dismissible={!busy}>
        <form className="flex flex-col gap-4" onSubmit={async e => {
          e.preventDefault();
          if (await mutate(resetting ? `/api/v1/organization/people/${resetting.id}/password` : "/api/v1/organization/demo", "POST", { password })) {
            setResetting(undefined); setDemoOpen(false); setPassword("");
          }
        }}>
          <Input label={resetting ? "新密码" : "员工初始密码"} type="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" placeholder="至少 6 个字符，可设置为 123456" />
          {resetting && <TextEntry type="hidden" name="username" autoComplete="username" value={resetting.username} />}
          {formError && <p role="alert" className="text-body text-destructive">{formError}</p>}
          <StatefulButton type="submit" state={busy ? "loading" : "idle"}>{resetting ? "确认重置密码" : "创建真实账号"}</StatefulButton>
        </form>
      </AppModal>
      <AppModal
        open={!!editingUnit}
        onOpenChange={(open) => {
          if (!open) setEditingUnit(undefined);
        }}
        title={editingUnit?.id ? "编辑组织" : "新建组织"}
        dismissible={!busy}
      >
        {editingUnit && (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(
                  `/api/v1/organization/units${editingUnit.id ? `/${editingUnit.id}` : ""}`,
                  editingUnit.id ? "PUT" : "POST",
                  { ...editingUnit, parentId: editingUnit.parentId || null, leaderId: editingUnit.leaderId || null },
                )
              )
                setEditingUnit(undefined);
            }}
          >
            <Input
              label="组织名称"
              value={editingUnit.name || ""}
              onChange={(name) => setEditingUnit({ ...editingUnit, name })}
              required
              maxLength={128}
            />
            <FieldSelect
              label="组织类型"
              value={editingUnit.kind || "COMPANY"}
              onChange={(kind) =>
                setEditingUnit({
                  ...editingUnit,
                  kind: kind as Unit["kind"],
                  parentId: "",
                  leaderId: kind === "DEPARTMENT" ? editingUnit.leaderId : null,
                })
              }
              options={Object.entries(unitKinds).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            {editingUnit.kind !== "COMPANY" && (
              <FieldSelect
                label="上级组织"
                value={editingUnit.parentId || ""}
                onChange={(parentId) =>
                  setEditingUnit({ ...editingUnit, parentId })
                }
                options={[
                  { value: "", label: "请选择上级" },
                  ...directory.units
                    .filter(
                      (u) =>
                        u.kind !== "TEAM" &&
                        (editingUnit.kind !== "DEPARTMENT" ||
                          u.kind === "COMPANY") &&
                        (!editingUnit.id ||
                          !contains(directory.units, editingUnit.id, u.id)),
                    )
                    .map((u) => ({
                      value: u.id,
                      label: unitPath(directory.units, u.id),
                    })),
                ]}
              />
            )}
            {editingUnit.kind === "DEPARTMENT" && (
              <>
                <FieldSelect
                  label="部门负责人"
                  value={editingUnit.leaderId || ""}
                  onChange={(leaderId) => setEditingUnit({ ...editingUnit, leaderId })}
                  options={[
                    { value: "", label: "未设置" },
                    ...departmentLeaderCandidates(directory, editingUnit.id).map((candidate) => ({
                      value: candidate.id,
                      label: `${candidate.displayName} · ${candidate.username}`,
                    })),
                    ...(editingUnit.leaderId && !departmentLeaderCandidates(directory, editingUnit.id).some((candidate) => candidate.id === editingUnit.leaderId)
                      ? [{ value: editingUnit.leaderId, label: relationshipName(directory, editingUnit.leaderId) }]
                      : []),
                  ]}
                />
                <p className="text-caption text-muted-foreground">
                  {editingUnit.id ? "可选择本部门及下级小组的在职成员。调动负责人或其小组前，请先调整负责人。" : "请先创建部门并分配人员，再设置部门负责人。"}
                </p>
              </>
            )}
            {formError && (
              <p role="alert" className="text-body text-destructive">
                {formError}
              </p>
            )}
            <StatefulButton type="submit" state={busy ? "loading" : "idle"}>
              保存组织
            </StatefulButton>
          </form>
        )}
      </AppModal>
      <AppModal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title={`删除「${deleting?.name || ""}」？`}
        description="只有没有下级、人员和知识库关联的组织才能删除。"
        dismissible={!busy}
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="text-body text-destructive">
              {formError}
            </p>
          )}
          <Button
            disabled={busy}
            onClick={async () => {
              if (
                deleting &&
                (await mutate(
                  `/api/v1/organization/units/${deleting.id}`,
                  "DELETE",
                ))
              )
                setDeleting(undefined);
            }}
          >
            确认删除
          </Button>
        </div>
      </AppModal>
    </>
  );
}

type AuditEvent = {
  id: string;
  actorId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  result: string;
  createdAt: string;
};
const actions: Record<string, string> = {
  RESET_PASSWORD: "重置门户密码",
  UPDATE: "更新门户账号与权限",
  CREATE: "创建门户账号",
  UPDATE_SHARING: "更新共享",
  CREATE_PERSON: "新增人员",
  UPDATE_PERSON: "更新人员",
  CREATE_ORG_UNIT: "创建组织",
  UPDATE_ORG_UNIT: "更新组织",
  DELETE_ORG_UNIT: "删除组织",
  CREATE_POSITION: "添加职位",
  CREATE_DEMO_ORGANIZATION: "创建示例公司",
  MANAGE_SPACE: "管理空间",
  MANAGE_FOLDER: "管理文件夹",
  MANAGE_MEMBER: "管理空间成员",
  ACCESS_DENIED: "访问被拒绝",
  UPLOAD: "上传文件",
  DOWNLOAD: "下载文件",
  PREVIEW: "预览文件",
};
function AuditPanel({ directory }: { directory: Directory }) {
  const [source, setSource] = useState("portal");
  const [events, setEvents] = useState<AuditEvent[]>([]),
    [offset, setOffset] = useState(0),
    [resource, setResource] = useState(""),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<AuditEvent[]>(
      source === "portal" ? `/api/v1/company/accounts/audit?offset=${offset}` : `/api/v1/audit?offset=${offset}&limit=30${filter ? `&resourceId=${encodeURIComponent(filter)}` : ""}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setEvents)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [offset, filter, attempt, source]);
  return (
    <div className="flex flex-col gap-4">
      <FieldSelect label="日志范围" value={source} onChange={v => { setSource(v); setOffset(0); setFilter(""); setResource(""); }} options={[{ value: "portal", label: "门户账号与密码" }, { value: "knowledge", label: "组织与知识库操作" }]} />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setFilter(resource.trim());
        }}
      >
        {source !== "portal" && <div className="min-w-52 flex-1">
          <Input
            label="按资源查找"
            value={resource}
            onChange={setResource}
            placeholder="输入文件、文件夹或空间的资源 ID"
          />
        </div>}
        {source !== "portal" && <Button type="submit">筛选</Button>}
        <Button
          variant="secondary"
          onClick={() => {
            setResource("");
            setFilter("");
            setOffset(0);
            setAttempt((a) => a + 1);
          }}
        >
          刷新 / 重置
        </Button>
      </form>
      <p className="text-caption text-muted-foreground">
        按时间倒序展示；审计记录只读，无法在后台修改或删除。
      </p>
      {loading ? (
        <EmptyState loading title="正在加载日志…" />
      ) : error ? (
        <EmptyState
          title="无法加载日志"
          action={
            <Button onClick={() => setAttempt((a) => a + 1)}>重试</Button>
          }
        >
          {error}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-control border border-border bg-card">
          <DataTable className="w-full min-w-162.5 text-left">
            <thead className="bg-muted/30">
              <tr>
                {["时间", "操作人", "操作", "资源", "结果"].map((h) => (
                  <th className="px-4 py-3 font-medium" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-4">
                    {new Date(e.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-4">
                    {directory.people.find((p) => source === "portal" ? p.subjectId === String(e.actorId) : p.id === e.actorId)
                      ?.displayName || "系统 / 未识别用户"}
                  </td>
                  <td className="px-4 py-4">{actions[e.action] || e.action}</td>
                  <td
                    className="max-w-52 truncate px-4 py-4"
                    title={e.resourceId}
                  >
                    {source === "portal" ? (() => {
                      const target=directory.people.find(p => p.subjectId === String(e.resourceId));
                      return target ? `${target.displayName}（${target.username}）` : `门户账号 ${e.resourceId}`;
                    })() : `${e.resourceType} · ${e.resourceId || "—"}`}
                  </td>
                  <td className="px-4 py-4">
                    {e.result === "SUCCESS"
                      ? "成功"
                      : e.result === "DENIED"
                        ? "已拒绝"
                        : e.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {!events.length && (
            <EmptyState title="暂无审计记录"  />
          )}
        </div>
      )}
      <div className="flex items-center justify-end gap-3 text-caption">
        <span>第 {offset / 30 + 1} 页</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={offset === 0 || loading}
          onClick={() => setOffset((n) => n - 30)}
        >
          上一页
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={events.length < 30 || loading || !!error || offset >= 9990}
          onClick={() => setOffset((n) => n + 30)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
