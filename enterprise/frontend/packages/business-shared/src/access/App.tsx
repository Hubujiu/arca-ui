import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
} from "./shared/ui";
import { ShieldCheck as ShieldKeyhole24Regular, Users as People24Regular, Network as Organization24Regular, LayoutGrid as Grid24Regular, KeyRound as Key24Regular, History as History24Regular, LogOut as ArrowExit20Regular, RefreshCw as ArrowClockwise20Regular, Plus as Add20Regular, ArrowRight } from "./shared/icons";
import { NavigationDrawer } from "./components/portal-navigation";
import { ActionSurface, DataTable } from "./shared/ui";
import { toast } from "sonner";
import {
  api,
  restoreSession,
  ApiError,
  normalizeState,
  normalizeCatalog,
  normalizeRows,
  type Row,
  type State,
} from "./api";

type User = { subjectId: string; username: string };
type Application = { moduleCode: string; displayName: string; entryUrl: string };
type Catalog = { modules: Row[]; permissions: Row[] };
type FormValues = Record<string, string>;
const allSections = [
  ["overview", "我的工作台", ShieldKeyhole24Regular],
  ["groups", "组织与成员", Organization24Regular],
  ["templates", "权限模板", Key24Regular],
  ["identities", "身份模板", People24Regular],
  ["assignments", "成员授权", People24Regular],
  ["catalog", "模块与权限", Grid24Regular],
  ["audit", "策略审计", History24Regular],
] as const;
export type AccessScope = "identity" | "authorization" | "all";
const emptyState: State = {
  groups: [],
  templates: [],
  identities: [],
  members: [],
  bindings: {},
  subjects: [],
};
const id = (r: Row) =>
  String(
    r.id ??
      r.groupId ??
      r.templateId ??
      r.identityId ??
      r.subjectId ??
      r.workspaceId ??
      r.documentId ??
      "",
  );
const chineseLabel = (value: unknown, fallback: string) => typeof value === "string" && /[\u3400-\u9fff]/.test(value) ? value : fallback;
const safeEntry = (value: string) => { try { const url = new URL(value, location.origin); return ["http:", "https:"].includes(url.protocol); } catch { return false; } };
const auditAction = (value: string) => ({CREATE:"创建",UPDATE:"修改",DELETE:"删除",REVOKE:"撤销",BIND:"分配",UNBIND:"取消分配"}[value] || (/create/i.test(value) ? "创建配置" : /delete|revoke|remove/i.test(value) ? "撤销配置" : /bind|assign/i.test(value) ? "分配权限" : "更新配置"));
const stamp = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("zh-CN") : "长期有效";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请稍后重试";
function Status({ value }: { value: string }) {
  return (
    <Badge
      appearance="tint"
      color={
        value === "DENY" || value === "REVOKED" || value === "ARCHIVED"
          ? "danger"
          : value === "DEPRECATED" || value === "DRAFT"
            ? "warning"
            : "success"
      }
    >
      {(
        {
          ACTIVE: "有效",
          ARCHIVED: "已归档",
          REVOKED: "已撤销",
          EXPIRED: "已到期",
          DRAFT: "草稿",
          ALLOW: "允许",
          DENY: "拒绝",
          DEPRECATED: "已废弃",
        } as Record<string, string>
      )[value] || "未知状态"}
    </Badge>
  );
}
function Empty({
  children = "暂无记录，请通过上方表单开始配置。",
}: {
  children?: ReactNode;
}) {
  return <div className="empty">{children}</div>;
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}
function Form({
  children,
  onSubmit,
  submit = "保存",
  busy,
}: {
  children: ReactNode;
  onSubmit: (v: FormValues) => Promise<void>;
  submit?: string;
  busy?: boolean;
}) {
  return (
    <form
      className="form-grid"
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(
          new FormData(form).entries(),
        ) as FormValues;
        await onSubmit(data);
      }}
    >
      {children}
      <div className="form-actions">
        <Button type="submit" appearance="primary" disabled={busy}>
          {busy ? "处理中…" : submit}
        </Button>
      </div>
    </form>
  );
}
function TextField({
  label,
  name,
  required = true,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: "text" | "password" | "datetime-local";
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required}>
      <Input name={name} type={type} required={required} {...rest} />
    </Field>
  );
}
function Choice({
  label,
  name,
  rows,
  optional = false,
  value,
  onChange,
}: {
  label: string;
  name: string;
  rows: Row[];
  optional?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <Field label={label} required={!optional}>
      <Select
        name={name}
        required={!optional}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">{optional ? "不指定" : "请选择"}</option>
        {rows.map((r) => (
          <option key={id(r)} value={id(r)}>
            {r.name ||
              r.username ||
              r.displayName ||
              `成员 #${id(r)}`}
          </option>
        ))}
      </Select>
    </Field>
  );
}
function Records({
  rows,
  columns,
}: {
  rows: Row[];
  columns: { title: string; render: (r: Row) => ReactNode }[];
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  return rows.length ? (
    <>
      <div className="table-wrap">
        <DataTable>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.title}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 10, current * 10 + 10).map((r, i) => (
              <tr key={r.id ?? i}>
                {columns.map((c) => (
                  <td key={c.title}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
      {pages > 1 && (
        <div className="pagination">
          <span>
            共 {rows.length} 条 · 第 {current + 1} / {pages} 页
          </span>
          <Button disabled={current === 0} onClick={() => setPage(current - 1)}>
            上一页
          </Button>
          <Button
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </>
  ) : (
    <Empty />
  );
}

function Login({ onLogin, notice }: { onLogin: (u: User) => void; notice?: string }) {
  const [register, setRegister] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ registrationEnabled: boolean }>("/api/v1/auth/config", "GET", undefined, controller.signal)
      .then(config => setRegistrationEnabled(config.registrationEnabled === true))
      .catch(() => setRegistrationEnabled(false));
    return () => controller.abort();
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-layout">
      <div className="login-story">
        <div className="brand">
          <span className="brand-mark"><ShieldKeyhole24Regular size={24} aria-hidden="true" /></span>
          <span>统一门户<small>企业工作空间</small></span>
        </div>
        <div>
          <div className="eyebrow">统一工作入口</div>
          <h1>
            一个账号，
            <br />
            开启日常工作。
          </h1>
          <p>
            以组织为基础，组合身份与职责。
            <br />
            从这里进入你的工作应用。
          </p>
          <ul className="login-features">
            <li><Grid24Regular size={20} aria-hidden="true" />一个入口，连接工作应用</li>
            <li><Organization24Regular size={20} aria-hidden="true" />围绕组织，协同团队职责</li>
            <li><ShieldKeyhole24Regular size={20} aria-hidden="true" />按需授权，管理账号访问</li>
          </ul>
        </div>
        <span className="story-foot">
          独立企业实例 · 操作权限与资源权限分离
        </span>
      </div>
      <div className="login-side">
        <div className="login-card">
          <div className="brand login-mobile-brand">
            <span className="brand-mark"><ShieldKeyhole24Regular size={24} aria-hidden="true" /></span>
            <span>统一门户<small>企业工作空间</small></span>
          </div>
          <div className="eyebrow">欢迎使用</div>
          <h2>{register ? "创建账号" : "登录工作台"}</h2>
          <p>使用账号与密码访问统一身份认证系统。</p>
          {(error || notice) && (
            <MessageBar intent="error">
              <MessageBarBody>{error || notice}</MessageBarBody>
            </MessageBar>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const v = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api(
                  `/api/v1/auth/${register ? "register" : "login"}`,
                  "POST",
                  v,
                );
                if (register) await api("/api/v1/auth/login", "POST", v);
                onLogin(await api<User>("/api/v1/auth/me"));
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="账号" required>
              <Input
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={64}
                placeholder="请输入账号"
              />
            </Field>
            <Field
              label="密码"
              required
              hint={
                register ? "至少 10 位，建议组合字母、数字与符号" : undefined
              }
            >
              <Input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 10 : 1}
                maxLength={128}
                placeholder="请输入密码"
              />
            </Field>
            <Button appearance="primary" type="submit" disabled={busy}>
              {busy ? "正在验证…" : register ? "注册并进入" : "登录"}
            </Button>
          </form>
          {registrationEnabled && <div className="login-switch">
            {register ? "已有账号？" : "还没有账号？"}{" "}
            <Button
              appearance="transparent"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "返回登录" : "注册账号"}
            </Button>
          </div>}
          <p className="fine-print">{registrationEnabled ? "注册账号后，由管理员分配组织与权限。" : "如需开通账号，请联系管理员。"}</p>
        </div>
      </div>
    </main>
  );
}

export default function App({ scope = "all", embedded = false }: { scope?: AccessScope; embedded?: boolean }) {
  const sections = allSections.filter(([key]) => scope === "all" ||
    (scope === "identity" ? key === "groups" || key === "identities" : key === "templates" || key === "assignments" || key === "catalog" || key === "audit"));
  const defaultSection = scope === "identity" ? "groups" : scope === "authorization" ? "templates" : "overview";
  const [user, setUser] = useState<User | null>(null),
    [initializing, setInitializing] = useState(true),
    [section, setSection] = useState(defaultSection),
    [state, setState] = useState<State>(emptyState),
    [catalog, setCatalog] = useState<Catalog>({ modules: [], permissions: [] }),
    [applications, setApplications] = useState<Application[]>([]),
    [navigationOpen, setNavigationOpen] = useState(false),
    [snapshot, setSnapshot] = useState<Row>({}),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(""),
    [selectedTemplate, setSelectedTemplate] = useState(""),
    [selectedIdentity, setSelectedIdentity] = useState(""),
    [selectedSubject, setSelectedSubject] = useState(""),
    [permissionKeys, setPermissionKeys] = useState<string[]>([]),
    [audit, setAudit] = useState<Row[]>([]),
    [check, setCheck] = useState<Row | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    restoreSession(controller.signal).then(() => api<User>("/api/v1/auth/me", "GET", undefined, controller.signal))
      .then(setUser)
      .catch((e) => {
        if (!controller.signal.aborted && !(e instanceof ApiError && e.status === 401))
          setError(errorText(e));
      })
      .finally(() => { if (!controller.signal.aborted) setInitializing(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const ended = () => {setUser(null);setState(emptyState);setSnapshot({});setApplications([]);setCatalog({modules:[],permissions:[]});setSection(defaultSection);};
    window.addEventListener("portal-session-ended",ended);
    return () => window.removeEventListener("portal-session-ended",ended);
  }, []);
  async function refresh(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const me = await api<Row>("/api/v1/me/capabilities", "GET", undefined, signal);
      setApplications(await api<Application[]>("/api/v1/me/applications", "GET", undefined, signal));
      setSnapshot(me);
      const results = await Promise.allSettled([
        api<State>("/api/v1/authz/state", "GET", undefined, signal),
        api<Catalog>("/api/v1/authz/catalog", "GET", undefined, signal),
      ]);
      const currentCatalog =
        results[1].status === "fulfilled"
          ? normalizeCatalog(results[1].value)
          : { modules: [], permissions: [] };
      if (results[0].status === "fulfilled")
        setState(normalizeState(results[0].value, currentCatalog.permissions));
      else if (!(
        results[0].reason instanceof ApiError &&
        results[0].reason.status === 403
      ))
        throw results[0].reason;
      else setState(emptyState);
      if (results[1].status === "fulfilled") setCatalog(currentCatalog);
      else if (!(results[1].reason instanceof ApiError && results[1].reason.status === 403)) throw results[1].reason;
      else setCatalog({modules:[],permissions:[]});
    } catch (e) {
      if (!signal?.aborted) {setApplications([]);setSnapshot({});setState(emptyState);setError(errorText(e));}
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    if (user) void refresh(controller.signal);
    return () => controller.abort();
  }, [user]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(path, method, body);
      await refresh();
      toast.success("配置已保存");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const groups = state.groups || [],
    templates = state.templates || [],
    identities = state.identities || [],
    subjects = state.subjects || [];
  const permissionName = (key: string) => chineseLabel(catalog.permissions.find(p => p.permissionKey === key)?.name, "已授权操作");
  const groupName = (value: unknown) =>
    groups.find((g) => id(g) === String(value))?.name ||
    (value == null ? "全局" : `组织 #${value}`);
  const subjectName = (value: unknown) => {
    const row = subjects.find((s) => id(s) === String(value));
    return row?.username || row?.displayName || `成员 #${value}`;
  };
  const templateName = (value: unknown) =>
    templates.find((t) => id(t) === String(value))?.name || `模板 #${value}`;
  const identityName = (value: unknown) =>
    identities.find((t) => id(t) === String(value))?.name || `身份 #${value}`;
  const bindings = (key: string): Row[] =>
    state[key] ||
    (!Array.isArray(state.bindings) && state.bindings?.[key]) ||
    [];
  const effective: string[] = snapshot.effectivePermissionKeys || [];
  const canManage =
    snapshot.root ||
    effective.includes("authz.access") ||
    effective.includes("authz.root");
  useEffect(() => { if (!canManage && scope === "all") setSection("overview"); }, [canManage, scope]);
  const scopedBody = (v: FormValues) => ({
    ...v,
    scopeGroupId: v.scopeGroupId ? Number(v.scopeGroupId) : null,
    expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
  });
  if (initializing)
    return (
      <div className="app-loading">
        <Spinner label="正在连接身份服务…" />
      </div>
    );
  if (!user) return embedded
    ? <main className="app-loading"><MessageBar intent="error"><MessageBarBody>{error || "登录已结束，请返回门户重新登录。"}</MessageBarBody></MessageBar></main>
    : <Login onLogin={u => {setError("");setUser(u);}} notice={error} />;
  const active = sections.find((s) => s[0] === section)!;
  const navigation = (<nav aria-label="主导航">{sections.filter(s => canManage || s[0] === "overview").map(([key,label,Icon]) => <ActionSurface key={key} navigation active={section === key} aria-current={section === key ? "page" : undefined} onClick={() => {setSection(key); setNavigationOpen(false); setError(""); if(key === "audit") api<Row[] | {items:Row[]}>("/api/v1/authz/audit").then(v => setAudit(normalizeRows(Array.isArray(v) ? v : v.items))).catch(e => setError(errorText(e)));}}><Icon aria-hidden="true" />{label}</ActionSurface>)}</nav>);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><ShieldKeyhole24Regular size={24} aria-hidden="true" /></span>
          <span>
            统一门户<small>账号与访问管理</small>
          </span>
        </div>
        <div className="nav-label">工作台</div>
        {navigation}
        <div className="sidebar-bottom">
          <div className="avatar">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="account-summary">
            <strong>{user.username}</strong>
            <small>成员编号 {user.subjectId}</small>
          </div>
          <Button
            appearance="transparent"
            aria-label="退出登录"
            icon={<ArrowExit20Regular />}
            onClick={async () => {
              try {
                await api("/api/v1/auth/logout", "POST");
                setUser(null);
                setState(emptyState);
                setSnapshot({});
                setSection("overview");
              } catch (e) {
                setError(errorText(e));
              }
            }}
          />
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <NavigationDrawer open={navigationOpen} onOpenChange={setNavigationOpen}>{navigation}<div className="drawer-account"><Button icon={<ArrowExit20Regular />} onClick={async () => {try {await api("/api/v1/auth/logout", "POST");setNavigationOpen(false);} catch (e) {setError(errorText(e));setNavigationOpen(false);}}}>退出登录</Button></div></NavigationDrawer>
          <div className="topbar-location">
            <span>企业控制台<span className="breadcrumb-divider" aria-hidden="true">/</span></span>
            <span className="breadcrumb">{active[1]}</span>
          </div>
          <Badge appearance="outline" color="brand">
            {snapshot.root ? "系统管理员" : "企业成员"}
          </Badge>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{section === "overview" ? "门户概览" : "访问管理"}</div>
              <h1>{active[1]}</h1>
              <p>
                {
                  (
                    {
                      overview: "查看当前账号的有效权限与组织管理范围。",
                      groups: "维护组织层级、成员归属与组织公共权限。",
                      templates: "组合模块能力，复用到身份、组织和具体成员。",
                      identities: "定义成员身份，并组合多个可复用权限模板。",
                      assignments: "为成员分配身份、临时职责及单项权限例外。",
                      catalog:
                        "业务模块通过 接入声明登记权限，配置界面自动发现。",
                      audit: "追溯每一次策略变更及其版本。",
                    } as Record<string, string>
                  )[section]
                }
              </p>
            </div>
            <Button
              aria-label="刷新"
              icon={<ArrowClockwise20Regular />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              刷新
            </Button>
          </div>
          {error && (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}
          {success && (
            <MessageBar intent="success">
              <MessageBarBody>{success}</MessageBarBody>
            </MessageBar>
          )}
          {loading && <Spinner size="tiny" label="同步最新策略…" />}
          {section === "overview" && (
            <>
              <Panel title="我的应用" description="这里显示你可以使用的已接入应用。">
                {applications.length ? <div className="applications">{applications.filter(a => safeEntry(a.entryUrl)).map(a => <a className="application-link" key={a.moduleCode} href={a.entryUrl} aria-label={chineseLabel(a.displayName,"业务应用")}><span className="application-icon"><Grid24Regular size={24} aria-hidden="true"/></span><span className="application-title">{chineseLabel(a.displayName,"业务应用")}<small>进入应用</small></span><ArrowRight size={20} aria-hidden="true"/></a>)}</div> : <Empty>暂无可用应用。应用接入并获得访问权限后，会显示在这里。</Empty>}
              </Panel>
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label"><span>当前有效权限</span><span className="stat-icon"><Key24Regular size={20} aria-hidden="true" /></span></div>
                  <strong>{effective.length}</strong>
                  <small>已应用个人拒绝规则</small>
                </div>
                <div className="stat-card">
                  <div className="stat-label"><span>策略版本</span><span className="stat-icon"><History24Regular size={20} aria-hidden="true" /></span></div>
                  <strong>{snapshot.policyVersion ?? "暂无"}</strong>
                  <small>每次策略变更即时推进</small>
                </div>
                <div className="stat-card">
                  <div className="stat-label"><span>组织归属</span><span className="stat-icon"><Organization24Regular size={20} aria-hidden="true" /></span></div>
                  <strong>
                    {(snapshot.groups || snapshot.groupIds || []).length}
                  </strong>
                  <small>
                    {snapshot.root ? "系统管理员" : "按职责分配访问能力"}
                  </small>
                </div>
              </div>
              <Panel
                title="当前有效权限"
                description="操作权限仅表示允许执行某类操作，业务资源仍需单独授权。"
              >
                <div className="permission-chips">
                  {effective.length ? (
                    effective.map((k) => (
                      <Badge appearance="tint" color="brand" key={k}>
                        {permissionName(k)}
                      </Badge>
                    ))
                  ) : (
                    <Empty>
                      尚未分配权限。请联系管理员分配组织或职责模板。
                    </Empty>
                  )}
                </div>
              </Panel>
              <Panel
                title="操作权限预览"
                description="根据当前能力快照解释全局能力与组织范围；业务资源访问及授权写入仍由服务端最终校验。"
              >
                <Form
                  busy={busy}
                  submit="检查能力"
                  onSubmit={async (v) => {
                    setError("");
                    let allowed = effective.includes(v.permissionKey);
                    let reason =
                      "当前快照中的全局能力；不代表业务资源允许访问。";
                    const scopes: number[] =
                      snapshot.scopedAdminCapabilities?.[v.permissionKey] || [];
                    if (v.targetGroupId && scopes.length && !snapshot.root) {
                      let current = groups.find(
                        (g) => id(g) === v.targetGroupId,
                      );
                      let inScope = false;
                      const visited = new Set<string>();
                      while (
                        current?.parentGroupId &&
                        !visited.has(id(current))
                      ) {
                        visited.add(id(current));
                        if (scopes.includes(Number(current.parentGroupId))) {
                          inScope = true;
                          break;
                        }
                        current = groups.find(
                          (g) => id(g) === String(current?.parentGroupId),
                        );
                      }
                      allowed = inScope;
                      reason = inScope
                        ? "目标属于授权范围的下级组织。自我提权与委托权限上限仍由服务端校验。"
                        : "目标不属于授权范围的下级组织。";
                    }
                    setCheck({ allowed, reason });
                  }}
                >
                  <Field label="权限" required>
                    <Select name="permissionKey" required>
                      <option value="">请选择权限</option>
                      {catalog.permissions.map((p) => (
                        <option key={p.permissionKey} value={p.permissionKey}>
                          {permissionName(p.permissionKey)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Choice
                    label="目标组织（管理权限）"
                    name="targetGroupId"
                    rows={groups}
                    optional
                  />
                  {check && (
                    <div className="full">
                      <Status value={check.allowed ? "ALLOW" : "DENY"} />
                      <span className="result-text">
                        {check.reason || "检查结果来自服务端当前策略"}
                      </span>
                    </div>
                  )}
                </Form>
              </Panel>
            </>
          )}
          {section === "groups" && (
            <>
              <div className="split">
                <Panel
                  title="组织结构"
                  description="主管仅能管理其管理节点的下级组织。"
                >
                  <div className="org-tree">
                    {groups.length ? (
                      groups.map((g) => (
                        <ActionSurface
                          key={id(g)}
                          active={selectedGroup === id(g)} depth={Number(g.depth || 0)}
                          onClick={() => setSelectedGroup(id(g))}
                        >
                          <Organization24Regular />
                          <span>
                            {g.name}

                          </span>
                          <Status value={g.status} />
                        </ActionSurface>
                      ))
                    ) : (
                      <Empty />
                    )}
                  </div>
                </Panel>
                <Panel title="创建组织节点">
                  <Form
                    busy={busy}
                    submit="创建组织"
                    onSubmit={(v) =>
                      mutate("/api/v1/authz/groups", "POST", {
                        ...v,
                        parentId: Number(v.parentId),
                      })
                    }
                  >
                    <Choice label="上级组织" name="parentId" rows={groups} />
                    <TextField label="组织名称" name="name" />
                    <TextField label="内部编号" name="code" />
                  </Form>
                </Panel>
              </div>
              {selectedGroup && (
                <Panel title={`${groupName(selectedGroup)} · 组织设置`}>
                  <Form
                    busy={busy}
                    onSubmit={(v) =>
                      mutate(`/api/v1/authz/groups/${selectedGroup}`, "PATCH", {
                        name: v.name,
                        status: v.status,
                        version: groups.find((g) => id(g) === selectedGroup)
                          ?.version,
                      })
                    }
                  >
                    <TextField
                      key={selectedGroup}
                      label="名称"
                      name="name"
                      defaultValue={groupName(selectedGroup)}
                    />
                    <Field label="状态">
                      <Select
                        name="status"
                        key={`status-${selectedGroup}`}
                        defaultValue={
                          groups.find((g) => id(g) === selectedGroup)?.status
                        }
                      >
                        <option value="ACTIVE">有效</option>
                        <option value="ARCHIVED">归档</option>
                      </Select>
                    </Field>
                  </Form>
                  <h3>组织成员</h3>
                  <Form
                    busy={busy}
                    submit="添加成员"
                    onSubmit={(v) =>
                      mutate(
                        `/api/v1/authz/groups/${selectedGroup}/members/${v.subjectId}`,
                        "PUT",
                        { isPrimary: v.isPrimary === "on" },
                      )
                    }
                  >
                    <Choice label="成员账号" name="subjectId" rows={subjects} />
                    <Checkbox name="isPrimary" label="设为主要组织" />
                  </Form>
                  <Records
                    rows={(state.members || []).filter(
                      (m) => String(m.groupId) === selectedGroup,
                    )}
                    columns={[
                      {
                        title: "成员",
                        render: (r) => subjectName(r.subjectId),
                      },
                      {
                        title: "归属",
                        render: (r) => (r.isPrimary ? "主要组织" : "附属组织"),
                      },
                      {
                        title: "操作",
                        render: (r) => (
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                `/api/v1/authz/groups/${selectedGroup}/members/${r.subjectId}`,
                                "DELETE",
                              )
                            }
                          >
                            移出组织
                          </Button>
                        ),
                      },
                    ]}
                  />
                  <h3>组织公共权限模板</h3>
                  <Form
                    busy={busy}
                    submit="绑定模板"
                    onSubmit={(v) =>
                      mutate(
                        `/api/v1/authz/groups/${selectedGroup}/templates/${v.templateId}?inherit=${v.inherit === "on"}`,
                        "PUT",
                      )
                    }
                  >
                    <Choice
                      label="权限模板"
                      name="templateId"
                      rows={templates}
                    />
                    <Checkbox name="inherit" label="继承到后代组织" />
                  </Form>
                  <Records
                    rows={bindings("groupTemplates").filter(
                      (r) => String(r.groupId) === selectedGroup,
                    )}
                    columns={[
                      {
                        title: "模板",
                        render: (r) =>
                          templateName(r.templateId ?? r.permissionTemplateId),
                      },
                      {
                        title: "继承",
                        render: (r) =>
                          r.inheritToDescendants ? "包含后代" : "仅当前组织",
                      },
                      {
                        title: "操作",
                        render: (r) => (
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                `/api/v1/authz/groups/${selectedGroup}/templates/${r.templateId ?? r.permissionTemplateId}`,
                                "DELETE",
                              )
                            }
                          >
                            解除绑定
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Panel>
              )}
            </>
          )}
          {section === "templates" && (
            <>
              <Panel title="权限模板目录">
                <Records
                  rows={templates}
                  columns={[
                    {
                      title: "模板",
                      render: (r) => (
                        <>
                          <strong>{r.name}</strong>

                        </>
                      ),
                    },
                    {
                      title: "所属组织",
                      render: (r) => groupName(r.ownerGroupId),
                    },
                    {
                      title: "状态",
                      render: (r) => <Status value={r.status} />,
                    },
                    {
                      title: "操作",
                      render: (r) => (
                        <Button
                          onClick={() => {
                            setSelectedTemplate(id(r));
                            setPermissionKeys(r.permissionKeys || []);
                          }}
                        >
                          编辑
                        </Button>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title={selectedTemplate ? "编辑权限模板" : "创建权限模板"}
                description="模板仅保存正向能力；拒绝规则在成员授权中单独配置。"
              >
                <Form
                  key={selectedTemplate || "new"}
                  busy={busy}
                  onSubmit={(v) =>
                    mutate(
                      `/api/v1/authz/permission-templates${selectedTemplate ? `/${selectedTemplate}` : ""}`,
                      selectedTemplate ? "PATCH" : "POST",
                      {
                        ...v,
                        ownerGroupId: v.ownerGroupId
                          ? Number(v.ownerGroupId)
                          : undefined,
                        permissionKeys,
                        version: templates.find(
                          (t) => id(t) === selectedTemplate,
                        )?.version,
                      },
                    )
                  }
                >
                  {!selectedTemplate && (
                    <>
                      <Choice
                        label="所属组织"
                        name="ownerGroupId"
                        rows={groups}
                      />
                      <TextField label="内部编号" name="code" />
                    </>
                  )}
                  <TextField
                    label="模板名称"
                    name="name"
                    defaultValue={
                      templates.find((t) => id(t) === selectedTemplate)?.name
                    }
                  />
                  <TextField
                    label="说明"
                    name="description"
                    required={false}
                    defaultValue={
                      templates.find((t) => id(t) === selectedTemplate)
                        ?.description
                    }
                  />
                  {selectedTemplate && (
                    <Field label="状态">
                      <Select
                        name="status"
                        defaultValue={
                          templates.find((t) => id(t) === selectedTemplate)
                            ?.status
                        }
                      >
                        <option value="ACTIVE">有效</option>
                        <option value="DRAFT">草稿</option>
                        <option value="ARCHIVED">归档</option>
                      </Select>
                    </Field>
                  )}
                  <div className="full permission-picker">
                    {catalog.modules.map((m) => (
                      <div key={m.moduleCode}>
                        <h3>{m.moduleName}</h3>
                        {catalog.permissions
                          .filter((p) => p.moduleCode === m.moduleCode)
                          .map((p) => (
                            <Checkbox
                              key={p.permissionKey}
                              label={`${permissionName(p.permissionKey)}${p.status === "DEPRECATED" ? "（已废弃）" : ""}`}
                              checked={permissionKeys.includes(p.permissionKey)}
                              disabled={
                                p.status === "DEPRECATED" &&
                                !permissionKeys.includes(p.permissionKey)
                              }
                              onChange={(_, d) =>
                                setPermissionKeys(
                                  d.checked
                                    ? [...permissionKeys, p.permissionKey]
                                    : permissionKeys.filter(
                                        (k) => k !== p.permissionKey,
                                      ),
                                )
                              }
                            />
                          ))}
                      </div>
                    ))}
                  </div>
                </Form>
                {selectedTemplate && (
                  <Button
                    onClick={() => {
                      setSelectedTemplate("");
                      setPermissionKeys([]);
                    }}
                  >
                    返回新建
                  </Button>
                )}
              </Panel>
            </>
          )}
          {section === "identities" && (
            <>
              <Panel title="身份模板">
                <Records
                  rows={identities}
                  columns={[
                    {
                      title: "身份名称",
                      render: (r) => (
                        <>
                          <strong>{r.name}</strong>

                        </>
                      ),
                    },
                    {
                      title: "所属组织",
                      render: (r) => groupName(r.ownerGroupId),
                    },
                    {
                      title: "状态",
                      render: (r) => <Status value={r.status} />,
                    },
                    {
                      title: "操作",
                      render: (r) => (
                        <Button onClick={() => setSelectedIdentity(id(r))}>
                          配置
                        </Button>
                      ),
                    },
                  ]}
                />
              </Panel>
              <Panel
                title={selectedIdentity ? "编辑身份与模板组合" : "创建身份模板"}
              >
                <Form
                  key={selectedIdentity || "new"}
                  busy={busy}
                  onSubmit={(v) =>
                    mutate(
                      `/api/v1/authz/identity-templates${selectedIdentity ? `/${selectedIdentity}` : ""}`,
                      selectedIdentity ? "PATCH" : "POST",
                      {
                        ...v,
                        ownerGroupId: v.ownerGroupId
                          ? Number(v.ownerGroupId)
                          : undefined,
                        version: identities.find(
                          (t) => id(t) === selectedIdentity,
                        )?.version,
                      },
                    )
                  }
                >
                  {!selectedIdentity && (
                    <>
                      <Choice
                        label="所属组织"
                        name="ownerGroupId"
                        rows={groups}
                      />
                      <TextField label="内部编号" name="code" />
                    </>
                  )}
                  <TextField
                    label="身份名称"
                    name="name"
                    defaultValue={
                      identities.find((t) => id(t) === selectedIdentity)?.name
                    }
                  />
                  <TextField
                    label="说明"
                    name="description"
                    required={false}
                    defaultValue={
                      identities.find((t) => id(t) === selectedIdentity)
                        ?.description
                    }
                  />
                  {selectedIdentity && (
                    <Field label="状态">
                      <Select
                        name="status"
                        defaultValue={
                          identities.find((t) => id(t) === selectedIdentity)
                            ?.status
                        }
                      >
                        <option value="ACTIVE">有效</option>
                        <option value="ARCHIVED">归档</option>
                      </Select>
                    </Field>
                  )}
                </Form>
                {selectedIdentity && (
                  <>
                    <h3>组合权限模板</h3>
                    <Form
                      busy={busy}
                      submit="绑定权限模板"
                      onSubmit={(v) =>
                        mutate(
                          `/api/v1/authz/identities/${selectedIdentity}/templates/${v.templateId}`,
                          "PUT",
                        )
                      }
                    >
                      <Choice
                        label="权限模板"
                        name="templateId"
                        rows={templates}
                      />
                    </Form>
                    <Records
                      rows={bindings("identityTemplates").filter(
                        (r) =>
                          String(r.identityId ?? r.identityTemplateId) ===
                          selectedIdentity,
                      )}
                      columns={[
                        {
                          title: "权限模板",
                          render: (r) =>
                            templateName(
                              r.templateId ?? r.permissionTemplateId,
                            ),
                        },
                        {
                          title: "操作",
                          render: (r) => (
                            <Button
                              disabled={busy}
                              onClick={() =>
                                void mutate(
                                  `/api/v1/authz/identities/${selectedIdentity}/templates/${r.templateId ?? r.permissionTemplateId}`,
                                  "DELETE",
                                )
                              }
                            >
                              解除绑定
                            </Button>
                          ),
                        },
                      ]}
                    />
                    <Button onClick={() => setSelectedIdentity("")}>
                      返回新建
                    </Button>
                  </>
                )}
              </Panel>
            </>
          )}
          {section === "assignments" && (
            <>
              <Panel title="选择成员">
                <Choice
                  label="成员"
                  name="subjectId"
                  rows={subjects}
                  value={selectedSubject}
                  onChange={setSelectedSubject}
                />
              </Panel>
              {selectedSubject && (
                <>
                  <div className="split">
                    <Panel title="赋予身份">
                      <Form
                        busy={busy}
                        submit="分配身份"
                        onSubmit={(v) =>
                          mutate(
                            `/api/v1/authz/subjects/${selectedSubject}/identities`,
                            "POST",
                            {
                              ...scopedBody(v),
                              identityId: Number(v.identityId),
                            },
                          )
                        }
                      >
                        <Choice
                          label="身份模板"
                          name="identityId"
                          rows={identities}
                        />
                        <Choice
                          label="适用组织"
                          name="scopeGroupId"
                          rows={groups}
                        />
                        <TextField
                          label="到期时间"
                          name="expiresAt"
                          type="datetime-local"
                          required={false}
                        />
                      </Form>
                    </Panel>
                    <Panel title="分配临时 / 特殊职责">
                      <Form
                        busy={busy}
                        submit="分配职责"
                        onSubmit={(v) =>
                          mutate(
                            `/api/v1/authz/subjects/${selectedSubject}/templates`,
                            "POST",
                            {
                              ...scopedBody(v),
                              templateId: Number(v.templateId),
                            },
                          )
                        }
                      >
                        <Choice
                          label="权限模板"
                          name="templateId"
                          rows={templates}
                        />
                        <Choice
                          label="适用组织"
                          name="scopeGroupId"
                          rows={groups}
                          optional
                        />
                        <TextField
                          label="到期时间"
                          name="expiresAt"
                          type="datetime-local"
                          required={false}
                        />
                      </Form>
                    </Panel>
                  </div>
                  <Panel
                    title="单项权限例外"
                    description="个人禁止优先于身份、组织和职责中的允许；到期后自动失效。"
                  >
                    <Form
                      busy={busy}
                      submit="保存例外"
                      onSubmit={(v) =>
                        mutate(
                          `/api/v1/authz/subjects/${selectedSubject}/overrides`,
                          "POST",
                          scopedBody(v),
                        )
                      }
                    >
                      <Field label="权限" required>
                        <Select name="permissionKey" required>
                          <option value="">请选择权限</option>
                          {catalog.permissions
                            .filter((p) => p.status !== "DEPRECATED")
                            .map((p) => (
                              <option
                                value={p.permissionKey}
                                key={p.permissionKey}
                              >
                                {permissionName(p.permissionKey)}
                              </option>
                            ))}
                        </Select>
                      </Field>
                      <Field label="效果">
                        <Select name="effect">
                          <option value="ALLOW">额外允许</option>
                          <option value="DENY">明确禁止</option>
                        </Select>
                      </Field>
                      <Choice
                        label="适用组织"
                        name="scopeGroupId"
                        rows={groups}
                        optional
                      />
                      <TextField
                        label="到期时间"
                        name="expiresAt"
                        type="datetime-local"
                        required={false}
                      />
                      <TextField label="审计原因" name="reason" />
                    </Form>
                  </Panel>
                  <Panel title="已分配授权">
                    <Records
                      rows={[
                        ...bindings("subjectIdentities").map((r) => ({
                          ...r,
                          kind: "身份",
                          label: identityName(
                            r.identityId ?? r.identityTemplateId,
                          ),
                          endpoint: "subject-identities",
                        })),
                        ...bindings("subjectTemplates").map((r) => ({
                          ...r,
                          kind: "职责",
                          label: templateName(
                            r.templateId ?? r.permissionTemplateId,
                          ),
                          endpoint: "subject-templates",
                        })),
                        ...bindings("overrides").map((r) => ({
                          ...r,
                          kind: r.effect,
                          label: permissionName(r.permissionKey),
                          endpoint: "overrides",
                        })),
                      ].filter(
                        (r: Row) => String(r.subjectId) === selectedSubject,
                      )}
                      columns={[
                        { title: "来源", render: (r) => r.kind === "ALLOW" ? "个人允许" : r.kind === "DENY" ? "个人禁止" : r.kind },
                        { title: "身份 / 能力", render: (r) => r.label },
                        {
                          title: "适用范围",
                          render: (r) => groupName(r.scopeGroupId),
                        },
                        {
                          title: "到期时间",
                          render: (r) => stamp(r.expiresAt),
                        },
                        {
                          title: "状态",
                          render: (r) => <Status value={r.status} />,
                        },
                        {
                          title: "操作",
                          render: (r) => (
                            <Button
                              disabled={busy || r.status !== "ACTIVE"}
                              onClick={() =>
                                void mutate(
                                  `/api/v1/authz/${r.endpoint}/${r.id ?? r.subjectIdentityId ?? r.subjectPermissionTemplateId ?? r.overrideId}`,
                                  "DELETE",
                                )
                              }
                            >
                              撤销
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                </>
              )}
            </>
          )}
          {section === "catalog" &&
            catalog.modules.map((m) => (
              <Panel
                key={m.moduleCode}
                title={chineseLabel(m.moduleName, "已接入应用")}
                description="已接入应用提供的权限"
              >
                <Records
                  rows={catalog.permissions.filter(
                    (p) => p.moduleCode === m.moduleCode,
                  )}
                  columns={[
                    {
                      title: "权限",
                      render: (p) => (
                        <>
                          <strong>{p.name}</strong>

                        </>
                      ),
                    },
                    {
                      title: "类型",
                      render: (p) =>
                        p.moduleAccess || p.isModuleAccess
                          ? "模块入口"
                          : p.scopeBehavior === "GROUP_SUBTREE"
                            ? "组织管理"
                            : "业务能力",
                    },
                    {
                      title: "可委托",
                      render: (p) => (p.delegatable ? "是" : "否"),
                    },
                    {
                      title: "状态",
                      render: (p) => <Status value={p.status} />,
                    },
                  ]}
                />
              </Panel>
            ))}
          {section === "audit" && (
            <Panel title="策略变更记录">
              <Records
                rows={audit}
                columns={[
                  { title: "版本", render: (r) => `第 ${r.policyVersion} 版` },
                  { title: "时间", render: (r) => stamp(r.createdAt) },
                  {
                    title: "操作者",
                    render: (r) => subjectName(r.actorSubjectId ?? r.actorId),
                  },
                  { title: "动作", render: (r) => auditAction(r.action) },
                  {
                    title: "对象",
                    render: (r) =>
                      `记录 ${r.objectId ?? r.entityId}`,
                  },
                  {
                    title: "追踪标识",
                    render: (r) => <small>{r.traceId}</small>,
                  },
                ]}
              />
            </Panel>
          )}
          <footer className="page-footer">
            统一门户{" "}
            <span>策略事实集中管理 · 资源规则由业务模块执行</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
