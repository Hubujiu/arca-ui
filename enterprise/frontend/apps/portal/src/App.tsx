import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  MicrofrontendLoader,
  ModuleRegistry,
  SessionClient,
  developmentManifests,
  normalizeSettings,
  type Capabilities,
  type ModuleManifest,
  type SessionSubject,
} from "@enterprise/module-sdk";
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FullPageState,
  HomePage,
  LoginPage,
  ModuleCanvas,
  SettingsPage,
} from "@enterprise/ui";

type Preferences = {
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  moduleSettings: Record<string, string | boolean>;
};

const session = new SessionClient();
import.meta.hot?.dispose(() => session.dispose());
const defaultPreferences: Preferences = {
  density: "comfortable",
  reduceMotion: false,
  moduleSettings: {},
};

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function useBrowserPath() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const update = () => setPath(currentPath());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = useCallback((next: string, replace = false) => {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return;
    const value = `${url.pathname}${url.search}${url.hash}`;
    window.history[replace ? "replaceState" : "pushState"]({}, "", value);
    setPath(value);
  }, []);
  return { path, pathname: path.split(/[?#]/)[0], navigate };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求未能完成，请稍后重试";
}

function parseManifests(value: unknown): ModuleManifest[] {
  if (Array.isArray(value)) return value as ModuleManifest[];
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: ModuleManifest[] }).items;
  }
  throw new Error("模块清单响应无效");
}

function developmentEntries(manifests: ModuleManifest[]) {
  if (!import.meta.env.DEV) return manifests;
  const local = new Map(developmentManifests(window.location.hostname).map(item => [item.id, item]));
  return manifests.map(manifest => {
    const replacement = local.get(manifest.id);
    return replacement ? { ...manifest, entry: replacement.entry, styles: replacement.styles } : manifest;
  });
}

function preferencesKey(subjectId: string) {
  return `enterprise.portal.preferences.${subjectId}`;
}

function loadPreferences(subjectId: string, registry: ModuleRegistry): Preferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(preferencesKey(subjectId)) || "{}") as Partial<Preferences>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      reduceMotion: parsed.reduceMotion === true,
      moduleSettings: normalizeSettings(registry, parsed.moduleSettings || {}),
    };
  } catch {
    return { ...defaultPreferences, moduleSettings: normalizeSettings(registry, {}) };
  }
}

export default function App() {
  const { path, pathname, navigate } = useBrowserPath();
  const returnPath = useRef(path === "/login" ? "/" : path);
  const [subject, setSubject] = useState<SessionSubject | null>(session.getSubject());
  const [restoring, setRestoring] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [registry, setRegistry] = useState<ModuleRegistry | null>(null);
  const [modules, setModules] = useState<ModuleManifest[]>([]);
  const [moduleError, setModuleError] = useState("");
  const [modulesLoading, setModulesLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => session.subscribe(() => setSubject(session.getSubject())), []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      session.restore(controller.signal),
      session.api<{ registrationEnabled?: boolean }>("/api/v1/auth/config", "GET", undefined, controller.signal),
    ]).then(([restored, config]) => {
      if (controller.signal.aborted) return;
      if (config.status === "fulfilled") setRegistrationEnabled(config.value.registrationEnabled === true);
      if (restored.status === "fulfilled") {
        setSubject(restored.value);
        if (pathname === "/login") navigate("/", true);
      } else if (!(restored.reason instanceof ApiError && restored.reason.status === 401)) {
        setSessionNotice(errorMessage(restored.reason));
      }
    }).finally(() => { if (!controller.signal.aborted) setRestoring(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (restoring || subject || pathname === "/login") return;
    returnPath.current = path;
    navigate("/login", true);
  }, [navigate, path, pathname, restoring, subject]);

  useEffect(() => {
    if (!restoring && subject && pathname === "/login") navigate("/", true);
  }, [navigate, pathname, restoring, subject]);

  useEffect(() => {
    if (!subject) {
      setRegistry(null);
      setModules([]);
      setPreferences(defaultPreferences);
      setPreferencesReady(false);
      return;
    }
    const controller = new AbortController();
    setModulesLoading(true);
    setModuleError("");
    Promise.all([
      session.api<unknown>("/api/v1/platform/modules", "GET", undefined, controller.signal),
      session.api<Capabilities>("/api/v1/me/capabilities", "GET", undefined, controller.signal),
    ]).then(([raw, capabilities]) => {
      const declared = new ModuleRegistry(developmentEntries(parseManifests(raw)));
      const allowed = declared.accessible(capabilities);
      const nextRegistry = new ModuleRegistry(allowed);
      setRegistry(nextRegistry);
      setModules(nextRegistry.list());
      setPreferences(loadPreferences(subject.subjectId, nextRegistry));
      setPreferencesReady(true);
    }).catch(error => {
      if (!controller.signal.aborted) {
        setRegistry(null);
        setModules([]);
        setModuleError(errorMessage(error));
        setPreferencesReady(false);
      }
    }).finally(() => { if (!controller.signal.aborted) setModulesLoading(false); });
    return () => controller.abort();
  }, [reloadVersion, subject?.subjectId]);

  useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
    document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
  }, [preferences.density, preferences.reduceMotion]);

  useEffect(() => {
    if (!subject || !preferencesReady) return;
    try { localStorage.setItem(preferencesKey(subject.subjectId), JSON.stringify(preferences)); }
    catch { /* Browser privacy settings can disable local preferences. */ }
  }, [preferences, preferencesReady, subject]);

  const loader = useMemo(() => registry ? new MicrofrontendLoader(registry, import.meta.env.DEV ? {
    allowedOrigins: Array.from({ length: 5 }, (_, index) => `http://${window.location.hostname}:${5174 + index}`),
  } : {}) : null, [registry]);

  const modulePreferences = useMemo(() => ({ ...preferences.moduleSettings,
    "portal.density": preferences.density, "portal.reduceMotion": preferences.reduceMotion,
  }), [preferences.moduleSettings, preferences.density, preferences.reduceMotion]);

  useEffect(() => () => loader?.unmount(), [loader]);

  const login = async (values: { username: string; password: string }, mode: "login" | "register") => {
    setLoginBusy(true);
    setSessionNotice("");
    try {
      if (mode === "register") await session.api("/api/v1/auth/register", "POST", values);
      const next = await session.login(values.username, values.password);
      setSubject(next);
      navigate(returnPath.current === "/login" ? "/" : returnPath.current, true);
    } catch (error) {
      setSessionNotice(errorMessage(error));
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    setSessionNotice("");
    try { await session.logout(); }
    catch (error) { setSessionNotice(errorMessage(error)); }
    finally { setSubject(null); navigate("/login", true); }
  };

  if (restoring) return <FullPageState type="loading" title="正在恢复登录状态"/>;
  if (!subject) return <LoginPage registrationEnabled={registrationEnabled} busy={loginBusy} error={sessionNotice} onSubmit={login}/>;

  const activeModule = registry?.resolve(pathname);
  const title = pathname === "/" ? "首页" : pathname === "/settings" ? "设置" : activeModule?.title || "页面未找到";
  return <AppShell user={subject} title={title} activePath={pathname} modules={modules} onNavigate={navigate} onLogout={logout}>
    {pathname === "/" ? <HomePage user={subject} modules={modules} loading={modulesLoading} error={moduleError} onRetry={() => setReloadVersion(value => value + 1)} onOpen={module => navigate(module.basePath)}/>
      : pathname === "/settings" ? <SettingsPage density={preferences.density} reduceMotion={preferences.reduceMotion} modules={modules} values={preferences.moduleSettings} loading={modulesLoading} error={moduleError} onRetry={() => setReloadVersion(value => value + 1)} onDensityChange={density => setPreferences(current => ({ ...current, density }))} onReduceMotionChange={reduceMotion => setPreferences(current => ({ ...current, reduceMotion }))} onModuleSettingChange={(key, value) => {
        if (!registry) return;
        setPreferences(current => ({ ...current, moduleSettings: normalizeSettings(registry, { ...current.moduleSettings, [key]: value }) }));
      }}/>
      : activeModule && loader ? <MountedModule key={`${activeModule.id}:${path}`} module={activeModule} loader={loader} path={path} navigate={navigate} settings={modulePreferences}/>
      : <Card><EmptyState title="找不到这个页面" description="该地址不存在，或你没有访问对应模块的权限。" action={<Button onClick={() => navigate("/")}>返回首页</Button>}/></Card>
    }
  </AppShell>;
}

function MountedModule({ module, loader, path, navigate, settings }: { module: ModuleManifest; loader: MicrofrontendLoader; path: string; navigate: (path: string, replace?: boolean) => void; settings: Record<string, string | boolean> }) {
  const element = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!element.current) return;
    let active = true;
    setLoading(true);
    setError("");
    loader.mount(module.id, element.current, {
      basePath: module.basePath,
      getAccessToken: session.getAccessToken,
      ensureSession: signal => session.ensureSession(signal),
      refreshSession: signal => session.refreshSession(signal),
      onUnauthorized: () => { session.clear(); navigate("/login", true); },
      navigate: next => {
        const url = new URL(next, window.location.origin);
        if (url.origin === window.location.origin) navigate(`${url.pathname}${url.search}${url.hash}`);
      },
      settings,
    }).then(() => { if (active) setLoading(false); }).catch(cause => { if (active) { setLoading(false); setError(errorMessage(cause)); } });
    return () => { active = false; loader.unmount(); };
  }, [attempt, loader, module.basePath, module.id, navigate, path, settings]);
  return <ModuleCanvas ref={element} title={module.title} loading={loading} error={error} onRetry={() => setAttempt(value => value + 1)}/>;
}
