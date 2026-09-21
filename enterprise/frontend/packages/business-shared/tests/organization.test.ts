import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collapsePeopleToRecipients,
  contains,
  expandRecipientsToPeople,
  mergeRecipients,
  peopleInUnit,
  type Directory,
  type Recipient,
} from "../src/organization/model.ts";
import {
  buildPickerTree,
  enabledPerson,
  filterPickerTree,
  togglePeople,
  unitCheckState,
} from "../src/organization/people-picker.ts";
const directory: Directory = {
  units: [
    { id: "c", name: "公司", kind: "COMPANY" },
    { id: "d", parentId: "c", name: "部门", kind: "DEPARTMENT" },
    { id: "t", parentId: "d", name: "小组", kind: "TEAM" },
    { id: "other", name: "另一公司", kind: "COMPANY" },
  ],
  positions: [],
  people: [
    {
      id: "u",
      displayName: "张三",
      username: "zhang",
      enabled: true,
      systemRole: "USER",
      orgUnitId: "t",
    },
  ],
};
const person: Recipient = {
  subjectType: "user",
  subjectId: "u",
  permission: "READER",
};
const team: Recipient = {
  subjectType: "org",
  subjectId: "t",
  permission: "READER",
};
const department: Recipient = {
  subjectType: "org",
  subjectId: "d",
  permission: "READER",
};
test("individual → team → department collapses in any invitation order", () => {
  assert.deepEqual(mergeRecipients(directory, [person, team, department]), [
    department,
  ]);
  assert.deepEqual(mergeRecipients(directory, [department, team, person]), [
    department,
  ]);
});
test("broader reader does not discard individual editor", () => {
  const editor: Recipient = { ...person, permission: "EDITOR" };
  assert.deepEqual(mergeRecipients(directory, [editor, department]), [
    editor,
    department,
  ]);
  assert.deepEqual(mergeRecipients(directory, [person, editor]), [editor]);
  assert.deepEqual(
    mergeRecipients(directory, [
      editor,
      { ...department, permission: "EDITOR" },
    ]),
    [{ ...department, permission: "EDITOR" }],
  );
});
test("separate companies, unassigned users and duplicate invitations remain correct", () => {
  assert.equal(contains(directory.units, "other", "t"), false);
  assert.deepEqual(mergeRecipients(directory, [person, person]), [person]);
  assert.equal(contains(directory.units, "c", undefined), false);
  assert.equal(
    contains(
      [
        { id: "a", parentId: "b", name: "", kind: "TEAM" },
        { id: "b", parentId: "a", name: "", kind: "TEAM" },
      ],
      "c",
      "a",
    ),
    false,
  );
});

function makePerson(
  id: string,
  name: string,
  orgUnitId?: string | null,
): Directory["people"][number] {
  return {
    id,
    displayName: name,
    username: id,
    enabled: true,
    systemRole: "USER",
    orgUnitId,
  };
}

const pickerDirectory: Directory = {
  units: directory.units,
  positions: [],
  people: [
    makePerson("u", "张三", "t"),
    makePerson("v", "李四", "d"),
    makePerson("x", "赵六", "c"),
    makePerson("w", "王五", "other"),
  ],
};

test("department checkbox selects descendant people and still previews individuals", () => {
  const ids = peopleInUnit(pickerDirectory, "d").map((entry) => entry.id);
  assert.deepEqual([...ids].sort(), ["u", "v"]);
  const selected = togglePeople([], ids, true);
  assert.deepEqual(selected, ["u", "v"]);
  assert.equal(unitCheckState(new Set(selected), ids), "checked");
  assert.equal(unitCheckState(new Set(["u"]), ids), "indeterminate");
  const remaining = togglePeople(selected, ["u"], false);
  assert.deepEqual(remaining, ["v"]);
  const tree = filterPickerTree(
    buildPickerTree(pickerDirectory, enabledPerson),
    "张三",
    pickerDirectory,
  );
  assert.equal(JSON.stringify(tree).includes("张三"), true);
});

test("fully selected department collapses to an org grant; excluding a person keeps individuals", () => {
  const collapsed = collapsePeopleToRecipients(
    pickerDirectory,
    ["u", "v"],
    [],
    "READER",
  );
  assert.deepEqual(collapsed, [
    { subjectType: "org", subjectId: "d", permission: "READER" },
  ]);
  assert.deepEqual(
    expandRecipientsToPeople(pickerDirectory, collapsed).sort(),
    ["u", "v"],
  );
  const afterExclude = collapsePeopleToRecipients(
    pickerDirectory,
    ["v"],
    collapsed,
    "READER",
  );
  assert.deepEqual(afterExclude, [
    { subjectType: "user", subjectId: "v", permission: "READER" },
  ]);
});
