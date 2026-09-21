export interface SessionSubject { subjectId: string; username: string; displayName?: string }
export interface Session { accessToken: string; expiresIn: number; subject: SessionSubject }
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); this.name = 'ApiError'; }
}
type Fetch = typeof fetch;

/** The portal owns tokens. Remotes receive a memory-only accessor, never storage. */
export class SessionClient {
  private token: string | null = null;
  private expiresAt = 0;
  private generation = 0;
  private refreshFlight?: Promise<SessionSubject>;
  private subject: SessionSubject | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly channel?: BroadcastChannel;
  constructor(private readonly fetcher: Fetch = (...args) => fetch(...args), private readonly now = () => Date.now()) {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('portal-session');
      this.channel.addEventListener('message', event => {
        if (event.data?.type === 'logout') this.reset(false);
        if (event.data?.type === 'session') {
          try { this.accept(event.data.session, this.generation, false); } catch { /* ignore invalid same-origin broadcasts */ }
        }
      });
    }
  }
  dispose(): void { this.channel?.close(); this.listeners.clear(); }
  getAccessToken = (): string | null => this.token;
  getSubject = (): SessionSubject | null => this.subject && { ...this.subject };
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private emit() { this.listeners.forEach(listener => listener()); }
  private reset(broadcast: boolean): void {
    this.generation++; this.token = null; this.subject = null; this.expiresAt = 0;
    if (broadcast) this.channel?.postMessage({ type: 'logout' });
    this.emit();
  }
  clear = (): void => this.reset(true);
  private accept(session: Session, generation: number, broadcast = true): SessionSubject {
    if (generation !== this.generation) throw new ApiError(401, '登录已结束，请重新登录');
    if (!session?.accessToken || !session.subject?.subjectId || !(session.expiresIn > 0)) throw new ApiError(502, '会话响应无效');
    this.token = session.accessToken; this.expiresAt = this.now() + session.expiresIn * 1000;
    this.subject = { ...session.subject };
    if (broadcast) this.channel?.postMessage({ type: 'session', session });
    this.emit(); return { ...this.subject };
  }
  private safePath(path: string): void {
    if (!path.startsWith('/api/') || /[\\\r\n]/.test(path)) throw new Error('Only same-origin API paths are allowed');
  }
  private async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    this.safePath(path);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (!['GET', 'HEAD'].includes(method) && path.startsWith('/api/v1/auth/')) {
      const csrf = await this.request<{ token: string; headerName: string }>('/api/v1/auth/csrf', 'GET', undefined, signal);
      if (!csrf.token || !/^x-[a-z0-9-]+$/i.test(csrf.headerName)) throw new ApiError(502, '安全验证响应无效');
      headers[csrf.headerName] = csrf.token;
    }
    let response: Response;
    try { response = await this.fetcher(path, { method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body), signal }); }
    catch (error) { if (signal?.aborted) throw error; throw new ApiError(0, '连接失败，请检查网络后重试'); }
    const text = await response.text();
    let value: unknown;
    try { value = text ? JSON.parse(text) : undefined; }
    catch { throw new ApiError(response.status || 502, '服务返回了无法识别的内容'); }
    if (!response.ok) {
      const data = value as { message?: string; code?: string } | undefined;
      throw new ApiError(response.status, data?.message || ({ 401: '登录已过期，请重新登录', 403: '你没有执行此操作的权限', 429: '操作过于频繁，请稍后重试' }[response.status] ?? '请求未能完成，请稍后重试'), data?.code);
    }
    return value as T;
  }
  async login(username: string, password: string): Promise<SessionSubject> {
    const generation = ++this.generation;
    return this.accept(await this.request<Session>('/api/v1/auth/login', 'POST', { username, password }), generation);
  }
  async logout(): Promise<void> {
    // Invalidate outstanding refresh/login responses before any network wait.
    const request = this.request<void>('/api/v1/auth/logout', 'POST');
    this.clear();
    await request;
  }
  restore(signal?: AbortSignal): Promise<SessionSubject> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.subject && this.token && this.expiresAt > this.now() + 30000) return Promise.resolve({ ...this.subject });
    if (!this.refreshFlight) {
      const generation = this.generation;
      const previous = this.token;
      const refresh = async () => {
        if (generation !== this.generation) throw new ApiError(401, '登录已结束，请重新登录');
        if (this.token !== previous && this.subject && this.expiresAt > this.now() + 30000) return { ...this.subject };
        return this.accept(await this.request<Session>('/api/v1/auth/refresh', 'POST'), generation);
      };
      this.refreshFlight = (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('portal-session-refresh', refresh) : refresh())
        .catch(error => { if (error instanceof ApiError && error.status === 401 && generation === this.generation) this.clear(); throw error; })
        .finally(() => { this.refreshFlight = undefined; });
    }
    const flight = this.refreshFlight;
    if (!signal) return flight;
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      flight.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
    });
  }
  async ensureSession(signal?: AbortSignal): Promise<void> { await this.restore(signal); }
  async refreshSession(signal?: AbortSignal): Promise<void> { this.expiresAt = 0; await this.restore(signal); }
  async api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    this.safePath(path); method = method.toUpperCase();
    const auth = path.startsWith('/api/v1/auth/') && !path.endsWith('/me');
    if (!auth && this.token && this.expiresAt <= this.now() + 30000) await this.restore(signal);
    const token = this.token;
    try { return await this.request<T>(path, method, body, signal); }
    catch (error) {
      if (auth || !(error instanceof ApiError) || error.status !== 401) throw error;
      if (this.token === token) { this.expiresAt = 0; await this.restore(signal); }
      // Never automatically replay mutations (submission, approval, upload).
      if (!['GET', 'HEAD'].includes(method)) throw new ApiError(401, '登录已恢复，请重新提交本次操作');
      try { return await this.request<T>(path, method, body, signal); }
      catch (retryError) { if (retryError instanceof ApiError && retryError.status === 401) this.clear(); throw retryError; }
    }
  }
}
