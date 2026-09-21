import {
  UNASSIGNED_UNIT_ID,
  enabledPerson,
  loginBoundPerson,
  peopleInUnit,
  unitPath,
  type Directory,
  type Person,
  type Unit,
} from "./model";

export type CheckState = "checked" | "unchecked" | "indeterminate";
export type PickerTreeNode = {
  id: string;
  name: string;
  kind: Unit["kind"] | "UNASSIGNED";
  people: Person[];
  children: PickerTreeNode[];
};

export { enabledPerson, loginBoundPerson, peopleInUnit, UNASSIGNED_UNIT_ID };

export function personMatches(
  person: Person,
  query: string,
  directory: Directory,
) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return [
    person.displayName,
    person.username,
    person.email ?? "",
    unitPath(directory.units, person.orgUnitId),
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(q);
}

export function unitCheckState(
  selected: ReadonlySet<string>,
  memberIds: string[],
): CheckState {
  if (!memberIds.length) return "unchecked";
  let count = 0;
  for (const id of memberIds) if (selected.has(id)) count += 1;
  if (count === 0) return "unchecked";
  if (count === memberIds.length) return "checked";
  return "indeterminate";
}

export function collectTreePeople(node: PickerTreeNode): Person[] {
  return [
    ...node.people,
    ...node.children.flatMap((child) => collectTreePeople(child)),
  ];
}

export function collectTreeIds(nodes: PickerTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...collectTreeIds(node.children),
  ]);
}

export function togglePeople(
  current: string[],
  ids: string[],
  nextSelected: boolean,
  options: { multiple?: boolean; limit?: number } = {},
) {
  const multiple = options.multiple ?? true;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  if (!nextSelected)
    return current.filter((id) => !ids.includes(id));
  if (!multiple) return ids.slice(0, 1);
  const have = new Set(current);
  const next = [...current];
  for (const id of ids) {
    if (have.has(id)) continue;
    if (next.length >= limit) break;
    have.add(id);
    next.push(id);
  }
  return next;
}

export function moveSelected(current: string[], id: string, delta: -1 | 1) {
  const index = current.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function isRootUnit(units: Unit[], unit: Unit) {
  return !unit.parentId || !units.some((entry) => entry.id === unit.parentId);
}

function attachPeople(
  directory: Directory,
  visible: Person[],
  parentId: string | null,
): PickerTreeNode[] {
  return directory.units
    .filter((unit) =>
      parentId
        ? unit.parentId === parentId
        : isRootUnit(directory.units, unit),
    )
    .map((unit) => ({
      id: unit.id,
      name: unit.name,
      kind: unit.kind,
      people: visible.filter((person) => person.orgUnitId === unit.id),
      children: attachPeople(directory, visible, unit.id),
    }));
}

export function buildPickerTree(
  directory: Directory,
  eligible: (person: Person) => boolean,
  extraIds: string[] = [],
): PickerTreeNode[] {
  const extra = new Set(extraIds);
  const visible = directory.people.filter(
    (person) => eligible(person) || extra.has(person.id),
  );
  const tree = attachPeople(directory, visible, null);
  const unassigned = visible.filter((person) => !person.orgUnitId);
  if (unassigned.length)
    tree.push({
      id: UNASSIGNED_UNIT_ID,
      name: "未分配组织",
      kind: "UNASSIGNED",
      people: unassigned,
      children: [],
    });
  return tree;
}

export function filterPickerTree(
  nodes: PickerTreeNode[],
  query: string,
  directory: Directory,
): PickerTreeNode[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return nodes;
  function matchNode(
    node: PickerTreeNode,
    ancestorMatched: boolean,
  ): PickerTreeNode | null {
    const self =
      ancestorMatched || node.name.toLocaleLowerCase().includes(q);
    const children = node.children
      .map((child) => matchNode(child, self))
      .filter((child): child is PickerTreeNode => !!child);
    const people = self
      ? node.people
      : node.people.filter((person) => personMatches(person, q, directory));
    if (self || people.length || children.length)
      return { ...node, people, children };
    return null;
  }
  return nodes
    .map((node) => matchNode(node, false))
    .filter((node): node is PickerTreeNode => !!node);
}

export function resolvePickerPerson(
  directory: Directory,
  id: string,
): Person {
  return (
    directory.people.find((person) => person.id === id) ?? {
      id,
      username: "",
      displayName: "未知人员",
      enabled: false,
      systemRole: "USER",
    }
  );
}
