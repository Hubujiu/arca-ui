export { ApiError, api, restoreSession } from "../shared/api/client";
import { api } from "../shared/api/client";

export type Row = Record<string, any>;
export type State = {
  groups: Row[];
  templates: Row[];
  identities: Row[];
  members: Row[];
  bindings: Row[] | Record<string, Row[]>;
  subjects: Row[];
  [key: string]: any;
};

function camel(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      value,
    ]),
  );
}
export function normalizeState(raw: State, permissions: Row[] = []): State {
  const result: any = {};
  for (const [key, rows] of Object.entries(raw))
    result[key] = Array.isArray(rows) ? rows.map(camel) : rows;
  for (const group of result.groups || []) group.id = group.groupId;
  const orderedGroups: Row[] = [];
  const visit = (parentId: number | null) => {
    for (const group of result.groups || []) {
      if (group.parentGroupId === parentId) {
        orderedGroups.push(group);
        visit(group.groupId);
      }
    }
  };
  visit(null);
  result.groups = orderedGroups;
  for (const subject of result.subjects || []) subject.id = subject.subjectId;
  for (const template of result.templates || []) {
    template.id = template.permissionTemplateId;
    template.permissionKeys = (result.templateItems || [])
      .filter((i: Row) => i.permissionTemplateId === template.id)
      .map(
        (i: Row) =>
          permissions.find((p) => p.permissionId === i.permissionId)
            ?.permissionKey,
      )
      .filter(Boolean);
  }
  for (const identity of result.identities || [])
    identity.id = identity.identityTemplateId;
  for (const override of result.overrides || [])
    override.permissionKey =
      permissions.find((p) => p.permissionId === override.permissionId)
        ?.permissionKey || `权限 #${override.permissionId}`;
  return result;
}
export function normalizeCatalog(raw: { modules: Row[]; permissions: Row[] }) {
  const modules = raw.modules.map(camel);
  return {
    modules,
    permissions: raw.permissions.map(camel).map((p) => ({
      ...p,
      moduleCode: modules.find((m) => m.moduleId === p.moduleId)?.moduleCode,
    })),
  };
}
export function normalizeRows(rows: Row[]) {
  return rows.map(camel);
}

