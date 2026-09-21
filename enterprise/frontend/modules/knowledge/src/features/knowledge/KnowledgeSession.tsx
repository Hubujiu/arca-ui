import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { api, ApiError } from "@/shared/api/client";
import type { DocumentRow, Folder, Me, Space, SystemStatus, Term } from "@/shared/api/types";
import type { Directory } from "@/organization/model";
import { isKnowledgePath } from "@/portal/portal";

export type KnowledgeSnapshot = {
  me?: Me; system?: SystemStatus; spaces: Space[]; foldersBySpace: Record<string, Folder[]>;
  documents: DocumentRow[]; categories: Term[]; tags: Term[]; directory?: Directory;
  ready: boolean; loading: boolean; error?: ApiError; loadedSpaces: string[];
  documentErrors: Record<string, string>; loadingSpaces: string[];
};
const empty = (): KnowledgeSnapshot => ({ spaces: [], foldersBySpace: {}, documents: [], categories: [], tags: [], ready: false, loading: false, loadedSpaces: [], loadingSpaces: [], documentErrors: {} });
type Session = KnowledgeSnapshot & {
  reload: () => Promise<void>;
  loadSpaceDocuments: (id: string) => Promise<void>;
  rememberDocument: (doc: DocumentRow) => void;
};
const Context = createContext<Session | null>(null);

async function documentsInSpace(id: string, signal: AbortSignal) {
  const rows: DocumentRow[] = [];
  for (let offset = 0; offset <= 10000; offset += 100) {
    const batch = await api<DocumentRow[]>(`/api/v1/documents?spaceId=${encodeURIComponent(id)}&limit=100&offset=${offset}`, "GET", undefined, signal);
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

/** Memory-only, scoped to the authenticated shell. Never caches data across users.
 * The initial folder list and documents publish in one generation, so an empty
 * state cannot appear between a metadata response and its document response.
 */
export function KnowledgeSessionProvider({ allowed = true, children }: { allowed?: boolean; children: ReactNode }) {
  const location = useLocation();
  const active = allowed && isKnowledgePath(location.pathname);
  const path = useRef(location);
  path.current = location;
  const [state, setState] = useState<KnowledgeSnapshot>(empty);
  const latest = useRef(state); latest.current = state;
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const pending = useRef(new Set<string>());
  const allowedRef = useRef(allowed); allowedRef.current = allowed;

  const reload = useCallback(async () => {
    if (!allowedRef.current) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const signal = request.signal, epoch = ++generation.current;
    pending.current.clear();
    setState(value => ({ ...value, loading: true, error: undefined, loadingSpaces: [] }));
    try {
      const [me, system, spaces, categories, tags] = await Promise.all([
        api<Me>("/api/v1/me", "GET", undefined, signal),
        api<SystemStatus>("/api/v1/system", "GET", undefined, signal),
        api<Space[]>("/api/v1/spaces", "GET", undefined, signal),
        api<Term[]>("/api/v1/categories", "GET", undefined, signal),
        api<Term[]>("/api/v1/tags", "GET", undefined, signal),
      ]);
      const requested = new URLSearchParams(path.current.search).get("spaceId");
      const selected = spaces.find(space => space.id === requested)?.id ?? spaces[0]?.id;
      // Only the active space is on the critical path. Other spaces load on expand.
      const [folders, documents] = selected ? await Promise.all([
        api<Folder[]>(`/api/v1/spaces/${selected}/folders`, "GET", undefined, signal),
        documentsInSpace(selected, signal),
      ]) : [[], []];
      if (signal.aborted || epoch !== generation.current) return;
      setState({ me, system, spaces, categories: categories.filter(x => x.status === "ACTIVE"), tags: tags.filter(x => x.status === "ACTIVE"),
        foldersBySpace: selected ? { [selected]: folders } : {}, documents, ready: true, loading: false,
        loadedSpaces: selected ? [selected] : [], loadingSpaces: [], documentErrors: {} });
      // This optional filter has a reserved slot; it never pushes the table down.
      void api<Directory>("/api/v1/organization", "GET", undefined, signal).then(directory => {
        if (!signal.aborted && epoch === generation.current) setState(value => ({ ...value, directory }));
      }).catch(() => {});
    } catch (error) {
      if (signal.aborted || epoch !== generation.current) return;
      const failure = error instanceof ApiError ? error : new ApiError(503, "无法加载知识库，请重试");
      // Do not expose cached rows after a permission-related or ambiguous failure.
      setState({ ...empty(), error: failure });
      throw failure;
    }
  }, []);

  const loadSpaceDocuments = useCallback(async (id: string) => {
    if (!allowedRef.current || !latest.current.ready || latest.current.loading || latest.current.loadedSpaces.includes(id) || pending.current.has(id)) return;
    if (!latest.current.spaces.some(space => space.id === id)) return;
    pending.current.add(id);
    const epoch = generation.current;
    const signal = controller.current?.signal;
    if (!signal || signal.aborted) { pending.current.delete(id); return; }
    setState(value => ({ ...value, loadingSpaces: [...value.loadingSpaces, id], documentErrors: { ...value.documentErrors, [id]: "" } }));
    try {
      const [folders, documents] = await Promise.all([
        api<Folder[]>(`/api/v1/spaces/${id}/folders`, "GET", undefined, signal), documentsInSpace(id, signal),
      ]);
      if (signal.aborted || epoch !== generation.current) return;
      setState(value => ({ ...value, foldersBySpace: { ...value.foldersBySpace, [id]: folders }, documents: [...value.documents.filter(doc => doc.spaceId !== id), ...documents],
        loadedSpaces: [...value.loadedSpaces, id], loadingSpaces: value.loadingSpaces.filter(key => key !== id) }));
    } catch (error) {
      if (!signal.aborted && epoch === generation.current) setState(value => ({ ...value, loadingSpaces: value.loadingSpaces.filter(key => key !== id),
        documentErrors: { ...value.documentErrors, [id]: error instanceof Error ? error.message : "无法读取目录" } }));
    } finally { if (epoch === generation.current) pending.current.delete(id); }
  }, []);
  const rememberDocument = useCallback((doc: DocumentRow) => {
    setState(value => value.documents.some(item => item.id === doc.id) ? value : { ...value, documents: [...value.documents, doc] });
  }, []);

  useEffect(() => {
    if (active && !latest.current.error) void reload().catch(() => {});
  }, [active, reload]);
  useEffect(() => {
    const invalidate = () => {
      controller.current?.abort(); generation.current++; pending.current.clear();
      setState(empty());
      if (allowedRef.current && isKnowledgePath(path.current.pathname)) void reload().catch(() => {});
    };
    window.addEventListener("portal-permissions-changed", invalidate);
    const endSession = () => { controller.current?.abort(); generation.current++; setState(empty()); };
    window.addEventListener("portal-session-ended", endSession);
    return () => { controller.current?.abort(); window.removeEventListener("portal-permissions-changed", invalidate); window.removeEventListener("portal-session-ended", endSession); };
  }, [reload]);
  useEffect(() => {
    if (!allowed) { controller.current?.abort(); generation.current++; setState(empty()); }
  }, [allowed]);
  return <Context.Provider value={{ ...state, reload, loadSpaceDocuments, rememberDocument }}>{children}</Context.Provider>;
}
export function useKnowledgeSession() {
  const session = useContext(Context);
  if (!session) throw new Error("KnowledgeSessionProvider is required inside the authenticated shell");
  return session;
}
