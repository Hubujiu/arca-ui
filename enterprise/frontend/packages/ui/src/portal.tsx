import { forwardRef, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertIcon, ArrowRightIcon, ChevronRightIcon, CloseIcon, DensityIcon, HomeIcon, LogoutIcon, MenuIcon, ModuleIcon, MotionIcon, PortalIcon, SettingsIcon, UserIcon } from "./icons";
import { Alert, Badge, Button, Card, EmptyState, Field, IconButton, SelectInput, Spinner, Switch, TextInput, cx } from "./primitives";

export type PortalUser = { subjectId: string; username: string; displayName?: string };
export type PortalModule = { id: string; title: string; description: string; icon?: string; basePath: string; permissions?: string[]; settings?: Array<{ id: string; title: string; description?: string; fields: Array<{ key: string; label: string; type: "boolean" | "select"; defaultValue: unknown; options?: Array<{ label: string; value: string }> }> }> };
export type NavItem = { id: string; label: string; path: string; icon?: ReactNode };

export function ProductMark({ compact = false }: { compact?: boolean }) {
  return <div className={cx("ent-product", compact && "ent-product--compact")}><span className="ent-product__mark"><PortalIcon size={compact ? 18 : 22}/></span>{!compact && <span><strong>企业工作台</strong><small>统一业务门户</small></span>}</div>;
}

export function AppShell({ user, title, activePath, modules, children, onNavigate, onLogout }: { user: PortalUser; title: string; activePath: string; modules: PortalModule[]; children: ReactNode; onNavigate: (path: string) => void; onLogout: () => void | Promise<void> }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [activePath]);
  const navigate = (path: string) => { setDrawerOpen(false); onNavigate(path); };
  const nav = <><NavigationItem label="首页" path="/" active={activePath === "/"} icon={<HomeIcon/>} onSelect={navigate}/><div className="ent-nav__label">业务模块</div>{modules.map(module => <NavigationItem key={module.id} label={module.title} path={module.basePath} active={activePath === module.basePath || activePath.startsWith(`${module.basePath}/`)} icon={<ModuleIcon/>} onSelect={navigate}/>)}</>;
  return <div className="ent-shell">
    <aside className="ent-sidebar"><ProductMark/><nav className="ent-nav" aria-label="主导航">{nav}</nav><div className="ent-sidebar__footer"><NavigationItem label="设置" path="/settings" active={activePath === "/settings"} icon={<SettingsIcon/>} onSelect={navigate}/><Account user={user} onLogout={onLogout}/></div></aside>
    <div className="ent-shell__main"><header className="ent-topbar"><IconButton className="ent-mobile-menu" label="打开导航" onClick={() => setDrawerOpen(true)}><MenuIcon/></IconButton><div className="ent-topbar__location"><span>企业工作台</span><ChevronRightIcon size={15}/><strong>{title}</strong></div><Badge>{user.displayName || user.username}</Badge></header><main className="ent-workspace">{children}</main></div>
    {drawerOpen && <div className="ent-drawer" role="dialog" aria-modal="true" aria-label="主导航"><button className="ent-drawer__overlay" aria-label="关闭导航" onClick={() => setDrawerOpen(false)}/><div className="ent-drawer__panel"><div className="ent-drawer__heading"><ProductMark/><IconButton label="关闭导航" onClick={() => setDrawerOpen(false)}><CloseIcon/></IconButton></div><nav className="ent-nav" aria-label="移动端主导航">{nav}<NavigationItem label="设置" path="/settings" active={activePath === "/settings"} icon={<SettingsIcon/>} onSelect={navigate}/></nav><Account user={user} onLogout={onLogout}/></div></div>}
  </div>;
}

function NavigationItem({ label, path, active, icon, onSelect }: { label: string; path: string; active: boolean; icon: ReactNode; onSelect: (path: string) => void }) {
  return <button type="button" aria-current={active ? "page" : undefined} className={cx("ent-nav__item", active && "is-active")} onClick={() => onSelect(path)}>{icon}<span>{label}</span></button>;
}

function Account({ user, onLogout }: { user: PortalUser; onLogout: () => void | Promise<void> }) {
  return <div className="ent-account"><span className="ent-account__avatar"><UserIcon size={18}/></span><span><strong>{user.displayName || user.username}</strong><small>{user.subjectId}</small></span><IconButton label="退出登录" onClick={() => void onLogout()}><LogoutIcon/></IconButton></div>;
}

export function LoginPage({ registrationEnabled, busy, error, onSubmit }: { registrationEnabled: boolean; busy?: boolean; error?: string; onSubmit: (values: { username: string; password: string }, mode: "login" | "register") => void | Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onSubmit({ username: String(data.get("username") || ""), password: String(data.get("password") || "") }, mode); };
  return <main className="ent-login"><section className="ent-login__story"><ProductMark/><div className="ent-login__message"><Badge>统一工作入口</Badge><h1>让每项工作，<br/>从同一个地方开始。</h1><p>使用一个企业账号进入知识、表单、流程和管理应用。</p><ul><li><ModuleIcon/>按职责呈现可用模块</li><li><SettingsIcon/>集中管理工作偏好</li><li><PortalIcon/>统一、安全的会话体验</li></ul></div><small>企业专属实例 · 访问由组织权限决定</small></section><section className="ent-login__panel"><div className="ent-login__card"><div className="ent-login__mobile-brand"><ProductMark/></div><p className="ent-kicker">欢迎使用</p><h2>{mode === "register" ? "创建企业账号" : "登录企业工作台"}</h2><p className="ent-muted">输入账号和密码继续。</p>{error && <Alert intent="error">{error}</Alert>}<form onSubmit={submit}><Field label="账号"><TextInput name="username" autoComplete="username" required minLength={3} maxLength={64} placeholder="请输入账号" autoFocus/></Field><Field label="密码" hint={mode === "register" ? "至少 10 位" : undefined}><TextInput name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={mode === "register" ? 10 : 1} maxLength={128} placeholder="请输入密码"/></Field><Button variant="primary" size="large" type="submit" disabled={busy}>{busy ? <Spinner label="正在验证"/> : mode === "register" ? "注册并登录" : "登录"}</Button></form>{registrationEnabled && <div className="ent-login__switch"><span>{mode === "register" ? "已有账号？" : "还没有账号？"}</span><Button variant="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "register" ? "返回登录" : "注册账号"}</Button></div>}<p className="ent-login__help">{registrationEnabled ? "注册后由管理员分配模块权限。" : "如需开通账号，请联系管理员。"}</p></div></section></main>;
}

export function HomePage({ user, modules, loading, error, onOpen, onRetry }: { user: PortalUser; modules: PortalModule[]; loading?: boolean; error?: string; onOpen: (module: PortalModule) => void; onRetry?: () => void }) {
  return <div className="ent-page"><PageHeader eyebrow="工作概览" title={`你好，${user.displayName || user.username}`} description="从这里进入你有权使用的业务模块。"/>{error && <Alert intent="error" title="模块暂时无法载入">{error}{onRetry && <div className="ent-alert__action"><Button onClick={onRetry}>重新加载</Button></div>}</Alert>}{loading ? <ModuleGridSkeleton/> : modules.length ? <div className="ent-module-grid">{modules.map(module => <button type="button" className="ent-module-card" key={module.id} onClick={() => onOpen(module)}><span className="ent-module-card__icon"><ModuleIcon size={24}/></span><span className="ent-module-card__body"><strong>{module.title}</strong><small>{module.description}</small></span><ArrowRightIcon className="ent-module-card__arrow"/></button>)}</div> : <Card><EmptyState icon={<ModuleIcon size={26}/>} title="暂无可用模块" description="获得模块访问权限后，它们会出现在这里。"/></Card>}<section className="ent-home-note"><Alert title="统一工作空间">模块会共享当前登录会话和个人偏好，切换时无需重复登录。</Alert></section></div>;
}

export function SettingsPage({ density, reduceMotion, modules, values, loading, error, onRetry, onDensityChange, onReduceMotionChange, onModuleSettingChange }: { density: "comfortable" | "compact"; reduceMotion: boolean; modules: PortalModule[]; values: Record<string, unknown>; loading?: boolean; error?: string; onRetry?: () => void; onDensityChange: (value: "comfortable" | "compact") => void; onReduceMotionChange: (value: boolean) => void; onModuleSettingChange: (key: string, value: unknown) => void }) {
  const configurable = modules.filter(module => module.settings?.length);
  return <div className="ent-page"><PageHeader eyebrow="个人设置" title="调整工作体验" description="偏好保存在当前浏览器，并应用到支持这些设置的模块。"/>{error && <Alert intent="error" title="模块设置暂时无法载入">{error}{onRetry && <div className="ent-alert__action"><Button onClick={onRetry}>重新加载</Button></div>}</Alert>}{loading && <Alert><Spinner label="正在同步模块设置"/></Alert>}<div className="ent-settings-layout"><div><Card className="ent-settings-card"><div className="ent-settings-card__heading"><span><DensityIcon/></span><div><h2>界面密度</h2><p>控制导航、卡片和表单的垂直间距。</p></div></div><Field label="显示密度"><SelectInput value={density} onChange={event => onDensityChange(event.target.value as "comfortable" | "compact")}><option value="comfortable">舒适</option><option value="compact">紧凑</option></SelectInput></Field></Card><Card className="ent-settings-card"><div className="ent-settings-card__heading"><span><MotionIcon/></span><div><h2>动效</h2><p>减少页面切换与加载提示中的动画。</p></div></div><Switch checked={reduceMotion} onChange={onReduceMotionChange} label="减少动态效果" description="适合偏好更稳定界面的用户。"/></Card></div><div><Card className="ent-settings-card"><div className="ent-settings-card__heading"><span><SettingsIcon/></span><div><h2>模块设置</h2><p>各业务模块公开的个人选项。</p></div></div>{configurable.length ? configurable.map(module => <ModuleSettings key={module.id} module={module} values={values} onChange={onModuleSettingChange}/>) : <EmptyState title="暂无模块设置" description="当前可用模块没有额外的个人选项。"/>}</Card></div></div></div>;
}

function ModuleSettings({ module, values, onChange }: { module: PortalModule; values: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  return <section className="ent-module-settings"><h3>{module.title}</h3>{module.settings?.map(group => <div className="ent-setting-group" key={group.id}><div><strong>{group.title}</strong>{group.description && <p>{group.description}</p>}</div>{group.fields.map(field => { const key = `${module.id}.${group.id}.${field.key}`; const value = values[key] ?? field.defaultValue; return field.type === "boolean" ? <Switch key={key} label={field.label} checked={Boolean(value)} onChange={next => onChange(key, next)}/> : <Field key={key} label={field.label}><SelectInput value={String(value)} onChange={event => onChange(key, event.target.value)}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></Field>; })}</div>)}</section>;
}

export const ModuleCanvas = forwardRef<HTMLDivElement, { title: string; loading?: boolean; error?: string; onRetry?: () => void }>(function ModuleCanvas({ title, loading, error, onRetry }, ref) {
  return <div className="ent-module-page"><div ref={ref} className="ent-module-mount" aria-label={`${title}模块内容`}/>{error ? <div className="ent-module-loading"><Card><EmptyState icon={<AlertIcon/>} title="模块载入失败" description={error} action={onRetry && <Button onClick={onRetry}>重新载入</Button>}/></Card></div> : loading ? <div className="ent-module-loading"><Spinner label={`正在载入${title}`}/></div> : null}</div>;
});

export function FullPageState({ type, title, description, action }: { type: "loading" | "error" | "empty"; title: string; description?: string; action?: ReactNode }) {
  return <main className="ent-full-state"><ProductMark/><Card>{type === "loading" ? <Spinner label={title}/> : <EmptyState icon={type === "error" ? <AlertIcon/> : <ModuleIcon/>} title={title} description={description || ""} action={action}/>}</Card></main>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="ent-page-header"><div><p className="ent-kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function ModuleGridSkeleton() { return <div className="ent-module-grid" aria-label="正在加载模块">{Array.from({ length: 5 }, (_, index) => <div className="ent-module-card ent-module-card--skeleton" key={index}><span/><span><i/><i/></span></div>)}</div>; }
