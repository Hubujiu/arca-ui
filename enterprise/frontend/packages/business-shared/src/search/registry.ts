import type { PortalApplication, PortalCapabilities, PortalUser } from "../portal/portal.ts";

export const searchKinds = ["应用", "设置", "字段", "知识库"] as const;
export type SearchKind = typeof searchKinds[number];
export type SearchContext = {
  user: PortalUser;
  applications: PortalApplication[];
  capabilities: PortalCapabilities;
};
export type SearchEntry = {
  id: string;
  title: string;
  description: string;
  kind: SearchKind;
  keywords?: string[];
  permissions?: string[];
  href?: string;
  action?: "account" | "help";
};
export type SearchModule = {
  id: string;
  label: string;
  /** Omit only for the portal itself. The application list is server-authorized. */
  application?: string;
  permissions?: string[];
  entries: (context: SearchContext) => SearchEntry[];
  /** Load searchable metadata only while the palette is open. Never load secrets. */
  index?: (context: SearchContext, signal: AbortSignal) => Promise<SearchEntry[]>;
  /** The module's server must enforce record-level access before returning hits. */
  search?: (query: string, context: SearchContext, signal: AbortSignal) => Promise<SearchEntry[]>;
};

export function permits(context: SearchContext, permissions: string[] = []) {
  const { root, effectivePermissionKeys, directDenyKeys } = context.capabilities;
  return permissions.every((key) => !directDenyKeys.includes(key) && (root || effectivePermissionKeys.includes(key)));
}

export function availableModules(modules: SearchModule[], context: SearchContext) {
  return modules.filter((module) =>
    (!module.application || context.applications.some((app) => app.moduleCode === module.application)) &&
    permits(context, module.permissions));
}

export function authorizedEntries(module: SearchModule, entries: SearchEntry[], context: SearchContext) {
  return entries.filter((entry) => permits(context, entry.permissions)).map((entry) => ({
    ...entry, id: `${module.id}:${entry.id}`,
  }));
}

function normalize(value: string) { return value.normalize("NFKC").toLocaleLowerCase(); }

/** Multi-token AND matching, title-first ranking; server relevance is retained separately. */
export function matchEntries(entries: SearchEntry[], query: string) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  const ranked = entries.map((entry, index) => {
    const title = normalize(entry.title);
    const text = normalize([entry.title, entry.description, ...(entry.keywords ?? [])].join(" "));
    const score = tokens.every((token) => text.includes(token))
      ? tokens.reduce((sum, token) => sum + (title === token ? 100 : title.startsWith(token) ? 40 : title.includes(token) ? 20 : 1), 0)
      : -1;
    return { entry, index, score };
  });
  return ranked.filter(({ score }) => score >= 0).sort((a, b) => b.score - a.score || a.index - b.index).map(({ entry }) => entry);
}
