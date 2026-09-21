import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalogIndex, type IndexedFolder, type IndexedDocument, type IndexedUnit } from "../../../modules/knowledge/src/features/knowledge/catalog-index";
import { resourceTime } from "../src/shared/design-system/workspace/resource-time";

type Document = IndexedDocument & { id: string };
const folder = (id: string, parentId?: string, orgUnitId?: string): IndexedFolder => ({ id, parentId, orgUnitId, spaceId: "s" });
const document = (id: string, folderId?: string, orgUnitId?: string): Document => ({ id, folderId, orgUnitId, spaceId: "s" });
const ids = (items: readonly { id: string }[] = []) => items.map(item => item.id).sort();

test("organization inheritance retains the path to matching descendants and documents", () => {
  const index = buildCatalogIndex({ spaceId: "s", spaceOrgId: "other", orgFilter: "company",
    units: [{ id: "team", parentId: "company" }],
    folders: [folder("root"), folder("team", "root", "team"), folder("child", "team"), folder("other")],
    documents: [document("inherited", "child"), document("override", "other", "team"), document("excluded", "team", "other")],
  });
  assert.deepEqual(ids(index.foldersByParent.get("")), ["other", "root"]);
  assert.deepEqual(ids(index.foldersByParent.get("team")), ["child"]);
  assert.deepEqual(ids(index.documentsByFolder.get("child")), ["inherited"]);
  assert.deepEqual(ids(index.documentsByFolder.get("other")), ["override"]);
  assert.deepEqual(ids(index.documentsByFolder.get("team")), []);
});

test("unfiltered queries preserve direct directories and never mix spaces", () => {
  const index = buildCatalogIndex({ spaceId: "s", units: [], folders: [folder("root"), folder("child", "root"), { ...folder("foreign"), spaceId: "other" }],
    documents: [document("root"), document("nested", "root"), { ...document("foreign", "root"), spaceId: "other" }],
  });
  assert.deepEqual(ids(index.foldersByParent.get("")), ["root"]);
  assert.deepEqual(ids(index.documentsByFolder.get("")), ["root"]);
  assert.deepEqual(ids(index.documentsByFolder.get("root")), ["nested"]);
  assert.equal(index.folderById.has("foreign"), false);
});

test("missing selection does not accidentally show every loaded space", () => {
  const index = buildCatalogIndex({ spaceId: "", units: [], folders: [folder("f")], documents: [document("d")] });
  assert.equal(index.folderById.size, 0);
  assert.equal(index.documentsByFolder.size, 0);
});

test("cycles and missing parents terminate and use the space fallback", () => {
  const index = buildCatalogIndex({ spaceId: "s", spaceOrgId: "team", orgFilter: "company",
    units: [{ id: "team", parentId: "company" }, { id: "company", parentId: "team" }],
    folders: [folder("a", "b"), folder("b", "a"), folder("orphan", "missing")],
    documents: [document("cycle", "a"), document("missing", "unknown")],
  });
  assert.deepEqual(ids(index.documentsByFolder.get("a")), ["cycle"]);
  assert.deepEqual(ids(index.documentsByFolder.get("unknown")), ["missing"]);
});

test("deep reverse-ordered trees are iterative with bounded parent traversals", () => {
  const count = 20_000;
  let parentReads = 0;
  const folders = Array.from({ length: count }, (_, i) => ({ id: String(i), spaceId: "s",
    get parentId() { parentReads++; return i ? String(i - 1) : undefined; },
  })).reverse();
  const index = buildCatalogIndex({ spaceId: "s", spaceOrgId: "team", orgFilter: "team", units: [], folders, documents: [document("deep", String(count - 1))] });
  assert.equal(index.folderById.size, count);
  assert.deepEqual(ids(index.documentsByFolder.get(String(count - 1))), ["deep"]);
  assert.ok(parentReads <= count * 4, `expected linear traversal, saw ${parentReads} parent reads`);
});

test("input objects and collections remain immutable", () => {
  const folders = Object.freeze([Object.freeze(folder("root", undefined, "team"))]);
  const documents = Object.freeze([Object.freeze(document("d", "root"))]);
  const units = Object.freeze([Object.freeze({ id: "team" })]);
  const snapshot = JSON.stringify({ folders, documents, units });
  buildCatalogIndex({ spaceId: "s", orgFilter: "team", folders, documents, units });
  assert.equal(JSON.stringify({ folders, documents, units }), snapshot);
});

// Deliberately simple legacy reference, independent of the optimized implementation.
function reference(folders: IndexedFolder[], documents: Document[], units: IndexedUnit[], orgFilter: string) {
  const organization = (own?: string | null, parentId?: string | null) => {
    if (own) return own;
    const seen = new Set<string>();
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = folders.find(item => item.id === parentId);
      if (parent?.orgUnitId) return parent.orgUnitId;
      parentId = parent?.parentId;
    }
    return "company";
  };
  const matches = (own?: string | null, parentId?: string | null) => {
    if (!orgFilter) return true;
    let id: string | null | undefined = organization(own, parentId);
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      if (id === orgFilter) return true;
      seen.add(id); id = units.find(unit => unit.id === id)?.parentId;
    }
    return false;
  };
  const visible = folders.filter(folder => {
    if (!orgFilter) return true;
    const descendants = new Set([folder.id]);
    let before = -1;
    while (before !== descendants.size) {
      before = descendants.size;
      for (const child of folders) if (child.parentId && descendants.has(child.parentId)) descendants.add(child.id);
    }
    return folders.some(child => descendants.has(child.id) && matches(child.orgUnitId, child.parentId)) ||
      documents.some(doc => doc.folderId && descendants.has(doc.folderId) && matches(doc.orgUnitId, doc.folderId));
  });
  return { folders: visible, documents: documents.filter(doc => matches(doc.orgUnitId, doc.folderId)) };
}

test("indexed results match the reference over 80 reproducible randomized catalogues", () => {
  let seed = 0x5eed;
  const next = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const units = [{ id: "company" }, { id: "team", parentId: "company" }, { id: "other" }];
  for (let round = 0; round < 80; round++) {
    const own = () => [undefined, "team", "company", "other"][next(4)];
    const folders = Array.from({ length: 24 }, (_, i) => folder(`f${i}`, i && next(3) ? `f${next(i)}` : undefined, own()));
    const documents = Array.from({ length: 48 }, (_, i) => document(`d${i}`, next(3) ? `f${next(24)}` : undefined, own()));
    for (const orgFilter of ["", "company", "team", "other", "missing"]) {
      const index = buildCatalogIndex({ spaceId: "s", spaceOrgId: "company", folders, documents, units, orgFilter });
      const expected = reference(folders, documents, units, orgFilter);
      for (const parent of ["", ...folders.map(item => item.id)]) {
        assert.deepEqual(ids(index.foldersByParent.get(parent)), ids(expected.folders.filter(item => (item.parentId || "") === parent)));
        assert.deepEqual(ids(index.documentsByFolder.get(parent)), ids(expected.documents.filter(item => (item.folderId || "") === parent)));
      }
    }
  }
});

test("update ordering uses full instants including year and timezone, with missing dates first", () => {
  const values = ["2027-01-01T00:00:00Z", "2026-12-31T23:00:00Z", "invalid", undefined];
  const sorted = values.map(value => ({ value })).sort((a, b) => resourceTime(a.value) - resourceTime(b.value)).map(item => item.value);
  assert.deepEqual(sorted, ["invalid", undefined, "2026-12-31T23:00:00Z", "2027-01-01T00:00:00Z"]);
  assert.equal(resourceTime("2027-01-01T08:00:00+08:00"), resourceTime("2027-01-01T00:00:00Z"));
});
