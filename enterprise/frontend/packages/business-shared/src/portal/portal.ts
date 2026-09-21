import { matchPath } from "react-router-dom";

export type PortalUser = {
  subjectId: string;
  username: string;
  displayName?: string;
};
export type PortalApplication = {
  moduleCode: string;
  displayName: string;
  entryUrl: string;
};
export type PortalCapabilities = {
  root: boolean;
  effectivePermissionKeys: string[];
  directDenyKeys: string[];
};

export const portalBrand = {
  name: import.meta.env.VITE_PORTAL_NAME?.trim() || "企业工作台",
  logo: import.meta.env.VITE_PORTAL_LOGO?.trim() || "",
};

export function isKnowledgePath(path: string) {
  return (
    /^\/(knowledge|search|archive)(\/|\?|#|$)/.test(path) ||
    /^\/documents\//.test(path)
  );
}

export function accessibleApplications(
  entries: PortalApplication[],
  capabilities: PortalCapabilities,
) {
  const applications = entries.filter(
    (entry) => entry.moduleCode !== "knowledge" && entry.moduleCode !== "forms",
  );
  // Company members can use forms independently of knowledge permissions.
  applications.unshift({ moduleCode: "forms", displayName: "应用与审批", entryUrl: "/apps" });
  // The current Portal deployment predates the DocWeave registry entry. Its
  // existing central capability remains authoritative until it is registered.
  const allowed =
    !capabilities.directDenyKeys.includes("knowledge.access") &&
    (capabilities.root ||
      capabilities.effectivePermissionKeys.includes("knowledge.access"));
  if (
    allowed &&
    !capabilities.directDenyKeys.includes("knowledge.access")
  ) {
    applications.unshift({
      moduleCode: "knowledge",
      displayName: "知识库",
      entryUrl: "/knowledge",
    });
  }
  return applications;
}

export function safeApplicationUrl(entryUrl: string) {
  try {
    const url = new URL(entryUrl, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function applicationDestination(entryUrl: string) {
  const href = safeApplicationUrl(entryUrl);
  if (!href) return null;
  const url = new URL(href);
  // Same origin alone is insufficient: other Portal modules own other paths.
  const internal = url.origin === window.location.origin &&
    ["/", "/knowledge", "/knowledge/settings", "/search", "/settings", "/preferences", "/archive", "/admin", "/documents/:id", "/forms/*", "/approvals/*", "/apps/*", "/workflows/*"].some(
      (path) => matchPath({ path, end: true }, url.pathname),
    );
  return {
    to: internal ? url.pathname + url.search + url.hash : href,
    reloadDocument: !internal,
  };
}

export function readPinnedApps(subjectId: string): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`portal:pins:${subjectId}`) || "[]",
    );
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}

export function readKnowledgePath(subjectId: string) {
  try {
    const value = sessionStorage.getItem(`portal:knowledge-path:${subjectId}`);
    return value && isKnowledgePath(value) ? value : "/knowledge";
  } catch {
    return "/knowledge";
  }
}
