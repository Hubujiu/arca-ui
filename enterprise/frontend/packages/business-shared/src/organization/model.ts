export type Unit = {
  id: string;
  parentId?: string | null;
  name: string;
  kind: "COMPANY" | "DEPARTMENT" | "TEAM";
  leaderId?: string | null;
};
export type Position = { id: string; name: string };
export type Person = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  orgUnitId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  enabled: boolean;
  systemRole: "ADMIN" | "USER";
  isDemo?: boolean;
  loginBound?: boolean;
  subjectId?: string;
  portalRoot?: boolean;
  knowledgeAccess?: boolean;
};
export type Directory = {
  units: Unit[];
  positions: Position[];
  people: Person[];
};
export type Recipient = {
  subjectType: "user" | "org";
  subjectId: string;
  permission: "READER" | "EDITOR";
};
export const unitKinds = { COMPANY: "公司", DEPARTMENT: "部门", TEAM: "小组" };
export function contains(
  units: Unit[],
  ancestor: string,
  child?: string | null,
): boolean {
  const seen = new Set<string>();
  while (child && !seen.has(child)) {
    if (child === ancestor) return true;
    seen.add(child);
    child = units.find((u) => u.id === child)?.parentId;
  }
  return false;
}
export function unitPath(units: Unit[], id?: string | null): string {
  const names: string[] = [],
    seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const unit = units.find((u) => u.id === id);
    if (!unit) break;
    names.unshift(unit.name);
    id = unit.parentId;
  }
  return names.join(" / ") || "未分配组织";
}
export function recipientName(
  directory: Directory,
  r: Pick<Recipient, "subjectType" | "subjectId">,
) {
  return r.subjectType === "user"
    ? directory.people.find((p) => p.id === r.subjectId)?.displayName ||
        "未知人员"
    : directory.units.find((u) => u.id === r.subjectId)?.name || "未知组织";
}
export function covers(
  directory: Directory,
  broad: Recipient,
  narrow: Recipient,
) {
  if (broad.permission === "READER" && narrow.permission === "EDITOR")
    return false;
  if (
    broad.subjectType === narrow.subjectType &&
    broad.subjectId === narrow.subjectId
  )
    return true;
  return (
    broad.subjectType === "org" &&
    contains(
      directory.units,
      broad.subjectId,
      narrow.subjectType === "org"
        ? narrow.subjectId
        : directory.people.find((p) => p.id === narrow.subjectId)?.orgUnitId,
    )
  );
}
export function mergeRecipients(
  directory: Directory,
  recipients: Recipient[],
): Recipient[] {
  return recipients.reduce<Recipient[]>(
    (result, next) =>
      result.some((r) => covers(directory, r, next))
        ? result
        : [...result.filter((r) => !covers(directory, next, r)), next],
    [],
  );
}
export const UNASSIGNED_UNIT_ID = "__unassigned__";
export function enabledPerson(person: Person) {
  return person.enabled;
}
export function loginBoundPerson(person: Person) {
  return person.enabled && !!person.loginBound;
}
export function managerCandidates(directory: Directory, personId?: string) {
  return directory.people.filter((candidate) => {
    if (!loginBoundPerson(candidate)) return false;
    const seen = new Set<string>();
    let current: Person | undefined = candidate;
    while (current) {
      if (current.id === personId || seen.has(current.id)) return false;
      seen.add(current.id);
      current = directory.people.find((person) => person.id === current?.managerId);
    }
    return true;
  });
}
export function departmentLeaderCandidates(directory: Directory, unitId?: string) {
  if (!unitId) return [];
  return directory.people.filter((person) =>
    loginBoundPerson(person) && contains(directory.units, unitId, person.orgUnitId),
  );
}
export function relationshipName(directory: Directory, id?: string | null) {
  if (!id) return "未设置";
  const person = directory.people.find((entry) => entry.id === id);
  if (!person) return "人员不可用，请重新设置";
  return `${person.displayName}${loginBoundPerson(person) ? "" : "（已停用或未绑定账号）"}`;
}
export function peopleInUnit(
  directory: Directory,
  unitId: string,
  eligible: (person: Person) => boolean = enabledPerson,
) {
  return directory.people.filter((person) => {
    if (!eligible(person)) return false;
    if (unitId === UNASSIGNED_UNIT_ID) return !person.orgUnitId;
    return contains(directory.units, unitId, person.orgUnitId);
  });
}
export function expandRecipientsToPeople(
  directory: Directory,
  recipients: Recipient[],
  eligible: (person: Person) => boolean = enabledPerson,
) {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const recipient of recipients) {
    if (recipient.subjectType === "user") add(recipient.subjectId);
    else
      for (const person of peopleInUnit(directory, recipient.subjectId, eligible))
        add(person.id);
  }
  return ids;
}
function unitDepth(units: Unit[], id: string) {
  let depth = 0,
    current: string | null | undefined = id;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const parent = units.find((unit) => unit.id === current)?.parentId;
    if (!parent) break;
    current = parent;
    depth += 1;
  }
  return depth;
}
function permissionForPerson(
  directory: Directory,
  grants: Recipient[],
  personId: string,
  fallback: Recipient["permission"],
): Recipient["permission"] {
  const person = directory.people.find((entry) => entry.id === personId);
  let reader: Recipient["permission"] | undefined;
  for (const grant of grants) {
    if (grant.subjectType === "user" && grant.subjectId === personId) {
      if (grant.permission === "EDITOR") return "EDITOR";
      reader = grant.permission;
    } else if (
      grant.subjectType === "org" &&
      person &&
      contains(directory.units, grant.subjectId, person.orgUnitId)
    ) {
      if (grant.permission === "EDITOR") return "EDITOR";
      reader ??= grant.permission;
    }
  }
  return reader ?? fallback;
}
/** Collapse a people selection back to org grants when a unit is fully selected with one permission. */
export function collapsePeopleToRecipients(
  directory: Directory,
  peopleIds: string[],
  previous: Recipient[],
  fallback: Recipient["permission"],
  eligible: (person: Person) => boolean = enabledPerson,
): Recipient[] {
  const selected = new Set(peopleIds);
  const covered = new Set<string>();
  const result: Recipient[] = [];
  const units = [...directory.units].sort(
    (a, b) => unitDepth(directory.units, a.id) - unitDepth(directory.units, b.id),
  );
  for (const unit of units) {
    const members = peopleInUnit(directory, unit.id, eligible);
    if (!members.length || members.every((member) => covered.has(member.id)))
      continue;
    if (!members.every((member) => selected.has(member.id))) continue;
    const permissions = new Set(
      members.map((member) =>
        permissionForPerson(directory, previous, member.id, fallback),
      ),
    );
    if (permissions.size !== 1) continue;
    result.push({
      subjectType: "org",
      subjectId: unit.id,
      permission: [...permissions][0],
    });
    for (const member of members) covered.add(member.id);
  }
  for (const id of peopleIds) {
    if (covered.has(id)) continue;
    result.push({
      subjectType: "user",
      subjectId: id,
      permission: permissionForPerson(directory, previous, id, fallback),
    });
  }
  return result;
}
