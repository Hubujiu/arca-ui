/** Pure, space-scoped lookup layer. No UI, network requests or mutation of API data. */
export type IndexedFolder = { id: string; spaceId: string; parentId?: string | null; orgUnitId?: string | null };
export type IndexedDocument = { spaceId: string; folderId?: string | null; orgUnitId?: string | null };
export type IndexedUnit = { id: string; parentId?: string | null };

function append<T>(map: Map<string, T[]>, key: string, value: T) {
  const items = map.get(key);
  if (items) items.push(value);
  else map.set(key, [value]);
}

/**
 * Build once per catalogue/filter change, not once per visible folder or keystroke.
 * Each folder/organization edge is traversed at most a constant number of times.
 * Iterative walks also tolerate deep, orphaned and cyclic server data.
 */
export function buildCatalogIndex<F extends IndexedFolder, D extends IndexedDocument>({
  folders, documents, units, spaceId, spaceOrgId, orgFilter = "",
}: {
  folders: readonly F[];
  documents: readonly D[];
  units: readonly IndexedUnit[];
  spaceId: string;
  spaceOrgId?: string | null;
  orgFilter?: string;
}) {
  const folderById = new Map(folders.filter(folder => folder.spaceId === spaceId).map(folder => [folder.id, folder]));
  const foldersByParent = new Map<string, F[]>();
  const documentsByFolder = new Map<string, D[]>();
  const relevantDocuments = documents.filter(document => document.spaceId === spaceId);
  const effectiveOrganizations = new Map<string, string | undefined>();

  const organizationForFolder = (id?: string | null): string | undefined => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let organization = spaceOrgId || undefined;
    while (id && !seen.has(id)) {
      if (effectiveOrganizations.has(id)) { organization = effectiveOrganizations.get(id); break; }
      const folder = folderById.get(id);
      if (!folder) break;
      seen.add(id);
      chain.push(id);
      if (folder.orgUnitId) { organization = folder.orgUnitId; break; }
      id = folder.parentId;
    }
    for (const folderId of chain) effectiveOrganizations.set(folderId, organization);
    return organization;
  };

  const allowedOrganizations = new Set<string>();
  if (orgFilter) {
    const children = new Map<string, string[]>();
    for (const unit of units) if (unit.parentId) append(children, unit.parentId, unit.id);
    const pending = [orgFilter];
    while (pending.length) {
      const id = pending.pop()!;
      if (allowedOrganizations.has(id)) continue;
      allowedOrganizations.add(id);
      for (const child of children.get(id) || []) pending.push(child);
    }
  }
  const matches = (organization: string | undefined) => !orgFilter || Boolean(organization && allowedOrganizations.has(organization));
  const visibleFolders = new Set<string>();
  // Keep a navigable ancestor even when only a descendant matches the filter.
  const retainAncestors = (id?: string | null) => {
    while (id && !visibleFolders.has(id)) {
      const folder = folderById.get(id);
      if (!folder) break;
      visibleFolders.add(id);
      id = folder.parentId;
    }
  };

  for (const folder of folderById.values()) {
    if (matches(organizationForFolder(folder.id))) retainAncestors(folder.id);
  }
  for (const document of relevantDocuments) {
    if (!matches(document.orgUnitId || organizationForFolder(document.folderId))) continue;
    append(documentsByFolder, document.folderId || "", document);
    retainAncestors(document.folderId);
  }
  for (const folder of folderById.values()) {
    if (visibleFolders.has(folder.id)) append(foldersByParent, folder.parentId || "", folder);
  }
  return { folderById, foldersByParent, documentsByFolder };
}
