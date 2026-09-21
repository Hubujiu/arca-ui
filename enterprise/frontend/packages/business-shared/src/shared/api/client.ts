export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

export type Json = Record<string, unknown>;

function messageFor(status: number, value?: { message?: string; code?: string }) {
  const message = value?.message?.trim();
  if (message && /[\u3400-\u9fff]/.test(message)) return message;
  return (
    {
      400: "请检查填写的内容",
      401: "登录已过期，请重新登录",
      403: "你没有执行此操作的权限",
      404: "要找的内容不存在或已不可见",
      409: "内容已发生变化，请刷新后重试",
      500: "门户或知识库服务暂时不可用",
      502: "无法连接到门户或知识库服务",
      503: "依赖服务暂时不可用，请稍后重试",
    } as Record<number, string>
  )[status] || "请求未能完成，请稍后重试";
}

export function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function camel<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => camel(item)) as T;
  if (value && typeof value === "object" && !(value instanceof Blob)) {
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, nested]) => [camelKey(key), camel(nested)]),
    ) as T;
  }
  return value;
}

type Session = {
  accessToken: string;
  expiresIn: number;
  subject?: { subjectId: string; username: string };
};

export type ShellBridge = {
  getAccessToken: () => string | null;
  ensureSession?: (signal?: AbortSignal) => Promise<void>;
  refreshSession?: (signal?: AbortSignal) => Promise<void>;
  onUnauthorized: () => void;
  basePath?: string;
};

let bridge: ShellBridge | undefined;
let accessToken: string | undefined;
let expiresAt = 0;
let generation = 0;
let refreshFlight: Promise<void> | undefined;
const channel = typeof window === "undefined" || typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("portal-session");

function accept(session: Session, broadcast = true) {
  accessToken = session.accessToken;
  expiresAt = Date.now() + session.expiresIn * 1000;
  if (broadcast) channel?.postMessage({ type: "session", session });
}

function clear(broadcast = true) {
  generation += 1;
  accessToken = undefined;
  expiresAt = 0;
  if (broadcast) channel?.postMessage({ type: "logout" });
  window.dispatchEvent(new Event("portal-session-ended"));
}

channel?.addEventListener("message", (event) => {
  if (event.data?.type === "session") accept(event.data.session, false);
  if (event.data?.type === "logout") clear(false);
});

export function configureSession(next?: ShellBridge) {
  bridge = next;
}

export function currentAccessToken() {
  return bridge ? bridge.getAccessToken() : accessToken ?? null;
}

export function hasStandaloneSession() {
  return !bridge && Boolean(accessToken);
}

async function parseBody(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as { message?: string; code?: string; requestId?: string };
  } catch {
    throw new ApiError(response.status, "服务返回了无法识别的内容，请稍后重试");
  }
}

async function rawRequest(path: string, method: string, body?: unknown, signal?: AbortSignal, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = currentAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (method !== "GET" && path.startsWith("/api/v1/auth/") && !bridge) {
    const csrf = await rawRequest("/api/v1/auth/csrf", "GET", undefined, signal) as { token: string; headerName: string };
    headers[csrf.headerName] = csrf.token;
  }
  let response: Response;
  try {
    response = await fetch(path, { method, headers, credentials: "include", body: payload, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "连接失败，请检查网络后重试");
  }
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") || "";
  const disposition = response.headers.get("content-disposition") || "";
  if (/^(?:attachment|inline)(?:\s*;|\s*$)/i.test(disposition) || contentType.includes("application/octet-stream") || contentType.includes("application/pdf") || contentType.startsWith("image/") || contentType.includes("text/html")) {
    if (!response.ok) throw new ApiError(response.status, messageFor(response.status));
    return response;
  }
  const value = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, messageFor(response.status, value), value?.code, value?.requestId);
  }
  return value;
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function restoreSession(signal?: AbortSignal) {
  if (bridge) {
    if (bridge.ensureSession) return bridge.ensureSession(signal);
    if (bridge.getAccessToken()) return abortable(Promise.resolve(), signal);
    bridge.onUnauthorized();
    return abortable(Promise.reject(new ApiError(401, "登录已过期，请重新登录")), signal);
  }
  if (accessToken && expiresAt > Date.now() + 30000) return abortable(Promise.resolve(), signal);
  if (!refreshFlight) {
    const previous = accessToken;
    const started = generation;
    const run = async () => {
      if (accessToken && accessToken !== previous && expiresAt > Date.now() + 30000) return;
      try {
        // Refresh is shared by all callers, including StrictMode's remount.
        // An individual caller can stop waiting without aborting the shared request.
        const session = await rawRequest("/api/v1/auth/refresh", "POST") as Session;
        if (generation !== started) throw new ApiError(401, "登录已结束，请重新登录");
        accept(session);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clear();
        throw error;
      }
    };
    refreshFlight = (navigator.locks ? navigator.locks.request("portal-session-refresh", run) : run()).finally(() => {
      refreshFlight = undefined;
    });
  }
  return abortable(refreshFlight, signal);
}

export async function api<T = unknown>(path: string, method = "GET", body?: unknown, signal?: AbortSignal, extraHeaders?: Record<string, string>): Promise<T> {
  const sessionBridge = bridge;
  const auth = path.startsWith("/api/v1/auth/") && !path.endsWith("/me");
  if (!auth && sessionBridge?.ensureSession) await sessionBridge.ensureSession(signal);
  if (sessionBridge && bridge !== sessionBridge) throw new DOMException("Module was unmounted", "AbortError");
  if (!auth && !bridge && accessToken && expiresAt <= Date.now() + 30000) await restoreSession(signal);
  const usedToken = currentAccessToken();
  try {
    const value = await rawRequest(path, method, body, signal, extraHeaders);
    if (path.endsWith("/auth/login") && value && typeof value === "object" && !(value instanceof Response)) accept(value as Session);
    if (path.endsWith("/auth/logout") || path.endsWith("/auth/logout-all")) clear();
    if (value instanceof Response) return value as T;
    return camel(value) as T;
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) throw error;
    if (error instanceof ApiError && error.status === 403) throw error;
    if (auth || !(error instanceof ApiError) || error.status !== 401) throw error;
    if (sessionBridge) {
      if (bridge !== sessionBridge) throw new DOMException("Module was unmounted", "AbortError");
      if (!sessionBridge.refreshSession) { sessionBridge.onUnauthorized(); throw error; }
      try {
        if (sessionBridge.getAccessToken() === usedToken) await sessionBridge.refreshSession(signal);
      } catch (refreshError) {
        if (bridge === sessionBridge && (refreshError as { status?: number })?.status === 401) sessionBridge.onUnauthorized();
        throw refreshError;
      }
      if (bridge !== sessionBridge) throw new DOMException("Module was unmounted", "AbortError");
      if (method !== "GET" && method !== "HEAD") throw new ApiError(401, "登录已恢复，请重新提交本次操作");
      try {
        const retried = await rawRequest(path, method, body, signal, extraHeaders);
        return (retried instanceof Response ? retried : camel(retried)) as T;
      } catch (retryError) {
        if (bridge === sessionBridge && retryError instanceof ApiError && retryError.status === 401) sessionBridge.onUnauthorized();
        throw retryError;
      }
    }
    if (currentAccessToken() === usedToken) {
      expiresAt = 0;
      await restoreSession(signal);
    }
    if (method !== "GET" && method !== "HEAD") throw new ApiError(401, "登录已恢复，请重新提交本次操作");
    try {
      const retried = await rawRequest(path, method, body, signal, extraHeaders);
      return (retried instanceof Response ? retried : camel(retried)) as T;
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) clear();
      throw retryError;
    }
  }
}

export async function download(path: string) {
  const file = await fetchFile(path);
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchFile(path: string, filename?: string, signal?: AbortSignal) {
  const response = await api<Response>(path, "GET", undefined, signal);
  if (response === undefined) throw new ApiError(204, "下载未返回文件。若启用了下载管理器，请暂时取消该站点的自动接管后重试", "DOWNLOAD_EMPTY_RESPONSE");
  if (!(response instanceof Response)) throw new ApiError(500, "无法打开文件");
  const raw = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(disposition);
  const name = decodeURIComponent(match?.[1] || match?.[2] || filename || "document");
  const mime = previewMime(name, raw.type);
  const blob = mime && raw.type !== mime ? new Blob([raw], { type: mime }) : raw;
  return { blob, filename: name, mime: blob.type || mime };
}

function previewMime(filename: string, reported?: string) {
  const name = filename.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (reported && reported !== "application/octet-stream") return reported;
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".md")) return "text/markdown";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return reported || "application/octet-stream";
}
