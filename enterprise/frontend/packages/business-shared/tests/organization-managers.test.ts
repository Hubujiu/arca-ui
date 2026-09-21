import assert from "node:assert/strict";
import { test } from "node:test";
import {
  departmentLeaderCandidates,
  managerCandidates,
  relationshipName,
  type Directory,
  type Person,
} from "../src/organization/model.ts";

const person = (id: string, orgUnitId?: string, managerId?: string): Person => ({
  id, username: id, displayName: id, orgUnitId, managerId,
  enabled: true, loginBound: true, systemRole: "USER",
});
const directory: Directory = {
  units: [
    { id: "company", name: "公司", kind: "COMPANY" },
    { id: "department", name: "研发", kind: "DEPARTMENT", parentId: "company" },
    { id: "team", name: "平台", kind: "TEAM", parentId: "department" },
    { id: "other", name: "运营", kind: "DEPARTMENT", parentId: "company" },
  ],
  positions: [],
  people: [
    person("employee", "team", "manager"), person("manager", "department"),
    person("report", "team", "employee"), person("indirectReport", "team", "report"),
    person("outside", "other"), { ...person("disabled", "team"), enabled: false },
    { ...person("unbound", "team"), loginBound: false },
  ],
};

test("manager candidates exclude self and all reports, while allowing explicit cross-unit managers", () => {
  assert.deepEqual(managerCandidates(directory, "employee").map((entry) => entry.id), ["manager", "outside"]);
  assert.equal(managerCandidates(directory).some((entry) => entry.id === "employee"), true);
});

test("malformed reporting cycles terminate and are excluded from candidates", () => {
  const malformed = { ...directory, people: [...directory.people, person("a", "team", "b"), person("b", "team", "a")] };
  assert.deepEqual(managerCandidates(malformed, "employee").map((entry) => entry.id), ["manager", "outside"]);
});

test("department leaders include bound enabled direct members and descendant teams", () => {
  assert.deepEqual(departmentLeaderCandidates(directory, "department").map((entry) => entry.id), ["employee", "manager", "report", "indirectReport"]);
  assert.deepEqual(departmentLeaderCandidates(directory), []);
  assert.deepEqual(departmentLeaderCandidates(directory, "missing"), []);
});

test("inactive or missing relationships display an actionable state instead of disappearing", () => {
  assert.equal(relationshipName(directory), "未设置");
  assert.equal(relationshipName(directory, "manager"), "manager");
  assert.match(relationshipName(directory, "disabled"), /已停用/);
  assert.match(relationshipName(directory, "unbound"), /未绑定/);
  assert.match(relationshipName(directory, "deleted"), /重新设置/);
});
