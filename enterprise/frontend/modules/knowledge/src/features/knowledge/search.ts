import { api } from "@/shared/api/client";
import type { Folder, Me, SearchHit, Space, Term } from "@/shared/api/types";
import { permits, type SearchEntry, type SearchModule } from "@/search/registry";

// Field identifiers are also the SettingsPage anchors: metadata and navigation share one contract.
export const knowledgeSearchFields = [
  { id: "ai-enabled", title: "AI 能力状态", keywords: ["aiEnabled", "AI", "模型", "人工智能"] },
  { id: "object-storage", title: "对象存储", keywords: ["objectStorageConfigured", "storage", "MinIO", "S3"] },
  { id: "instance-name", title: "实例名称", keywords: ["instanceName", "实例", "名称"] },
];

export const knowledgeSearchModule: SearchModule = {
  id: "knowledge",
  label: "知识库目录",
  application: "knowledge",
  permissions: ["knowledge.access"],
  entries: () => [
    { id: "archive", title: "归档", description: "知识库 › 归档", kind: "设置", keywords: ["archive", "删除"], href: "/archive" },
    { id: "settings", title: "知识库设置", description: "知识库 › 设置", kind: "设置", keywords: ["settings", "配置"], href: "/settings" },
    ...knowledgeSearchFields.map((field) => ({ ...field, description: `知识库 › 设置 › ${field.title}`, kind: "字段" as const, href: `/settings#${field.id}` })),
    ...["categories", "tags"].map((id) => ({ id, title: id === "categories" ? "分类" : "标签", description: "知识库 › 设置", kind: "设置" as const, keywords: [id, "设置"], href: `/settings#${id}` })),
  ],
  async index(context, signal) {
    const [spaces, categories, tags, me] = await Promise.all([
      api<Space[]>("/api/v1/spaces", "GET", undefined, signal),
      api<Term[]>("/api/v1/categories", "GET", undefined, signal),
      api<Term[]>("/api/v1/tags", "GET", undefined, signal),
      api<Me>("/api/v1/me", "GET", undefined, signal),
    ]);
    const entries: SearchEntry[] = spaces.map((space) => ({
      id: `space:${space.id}`, title: space.name, description: `知识库 › 空间${space.description ? ` · ${space.description}` : ""}`,
      kind: "知识库", keywords: ["空间", "space"], href: `/knowledge?spaceId=${encodeURIComponent(space.id)}`,
    }));
    for (const [path, terms] of [["categories", categories], ["tags", tags]] as const) {
      const title = path === "categories" ? "分类" : "标签";
      entries.push(...terms.filter((term) => term.status === "ACTIVE").map((term) => ({
        id: `${path}:${term.id}`, title: term.name, description: `知识库 › 设置 › ${title}`, kind: "知识库" as const,
        keywords: [title, path], href: `/settings#${path}`,
      })));
      if (me.systemRole === "ADMIN" && permits(context, ["knowledge.workspace.manage"])) {
        entries.push({ id: `new-${path}`, title: `新建${title}`, description: `知识库 › 设置 › ${title} › 名称`, kind: "字段", keywords: [path, "name", "名称", "创建"], href: `/settings#new-${path}` });
      }
    }
    return entries;
  },
};

export const knowledgeFolderSearchModule: SearchModule = {
  id: "knowledge-folders", label: "知识库文件夹", application: "knowledge", permissions: ["knowledge.access"], entries: () => [],
  async index(_context, signal) {
    const spaces = await api<Space[]>("/api/v1/spaces", "GET", undefined, signal);
    const entries: SearchEntry[] = [];
    // Bound concurrency for large organizations; every endpoint checks space membership.
    for (let offset = 0; offset < spaces.length; offset += 4) {
      signal.throwIfAborted();
      const batch = await Promise.all(spaces.slice(offset, offset + 4).map(async (space) => {
        const folders = await api<Folder[]>(`/api/v1/spaces/${encodeURIComponent(space.id)}/folders`, "GET", undefined, signal);
        return folders.map((folder) => ({ id: folder.id, title: folder.name, description: `知识库 › ${space.name} › 文件夹`, kind: "知识库" as const, keywords: [space.name, "folder", "目录"], href: `/knowledge?spaceId=${encodeURIComponent(space.id)}&folderId=${encodeURIComponent(folder.id)}` }));
      }));
      entries.push(...batch.flat());
    }
    return entries;
  },
};

export const knowledgeDocumentSearchModule: SearchModule = {
  id: "knowledge-documents", label: "文档全文", application: "knowledge", permissions: ["knowledge.access", "knowledge.document.read"], entries: () => [],
  async search(query, _context, signal) {
    const result = await api<{ items: SearchHit[]; total: number }>(`/api/v1/search?q=${encodeURIComponent(query)}&size=20`, "GET", undefined, signal);
    const entries: SearchEntry[] = result.items.map((hit) => ({
      id: hit.id, title: hit.title, description: hit.match?.content?.replace(/\s+/g, " ").slice(0, 180) || "知识库 › 文档",
      kind: "知识库", href: `/documents/${encodeURIComponent(hit.id)}`,
    }));
    if (result.total > result.items.length) entries.push({ id: "more", title: "查看全部文档结果", description: `知识库 · ${result.total} 条匹配`, kind: "知识库", href: `/search?q=${encodeURIComponent(query)}` });
    return entries;
  },
};
