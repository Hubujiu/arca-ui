import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizedEntries, availableModules, matchEntries, permits, type SearchContext, type SearchEntry, type SearchModule } from "../src/search/registry.ts";

const context: SearchContext = {
  user: { subjectId: "reader", username: "reader" },
  applications: [{ moduleCode: "knowledge", displayName: "知识库", entryUrl: "/knowledge" }],
  capabilities: { root: false, effectivePermissionKeys: ["knowledge.access"], directDenyKeys: [] },
};
const module: SearchModule = { id: "knowledge", label: "知识库", application: "knowledge", permissions: ["knowledge.access"], entries: () => [] };
const field: SearchEntry = { id: "storage", title: "对象存储", description: "知识库 设置", kind: "字段", keywords: ["objectStorageConfigured", "MinIO"] };

test("explicit deny wins over root and effective grants", () => {
  assert.equal(permits({ ...context, capabilities: { ...context.capabilities, root: true, directDenyKeys: ["knowledge.access"] } }, ["knowledge.access"]), false);
  assert.equal(permits(context, ["knowledge.document.read"]), false);
  assert.equal(permits(context, ["knowledge.access"]), true);
});
test("modules require both application access and their declared capabilities", () => {
  assert.equal(availableModules([module], context).length, 1);
  assert.deepEqual(availableModules([module], { ...context, applications: [] }), []);
  assert.deepEqual(availableModules([module], { ...context, capabilities: { ...context.capabilities, effectivePermissionKeys: [] } }), []);
});
test("entries require every permission and IDs are namespaced", () => {
  assert.deepEqual(authorizedEntries(module, [{ ...field, permissions: ["knowledge.access", "knowledge.workspace.manage"] }], context), []);
  assert.equal(authorizedEntries(module, [field], context)[0].id, "knowledge:storage");
});
test("Chinese multi-token queries and English field identifiers match", () => {
  assert.deepEqual(matchEntries([field], "设置 存储"), [field]);
  assert.deepEqual(matchEntries([field], "OBJECTSTORAGE"), [field]);
  assert.deepEqual(matchEntries([field], "ｍｉｎｉｏ"), [field]);
  assert.deepEqual(matchEntries([field], "设置 不存在"), []);
});
test("title matches rank ahead of aliases, ties remain stable", () => {
  const title: SearchEntry = { ...field, id: "title", title: "MinIO" };
  assert.deepEqual(matchEntries([field, title], "minio").map((entry) => entry.id), ["title", "storage"]);
  assert.deepEqual(matchEntries([field, title], "  "), [field, title]);
});
