import assert from "node:assert/strict";
import { test } from "node:test";
import { initialValues, validateValues, validateFieldConfigs, clarifySchemaRejection, dataJsonSchema, fieldValueLabel, isFieldVisible, scopedDirectory, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { conditionOperators, defaultConditionValue } from "../src/lowcode/workflow-model";
const user = { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", displayName: "张三" };
const schema: TableSchema = { name: "信息登记", description: "", fields: [
  { id: "person", label: "发起人", type: "member", readOnly: true, defaultSource: "initiator" },
  { id: "name", label: "姓名", type: "text", hidden: true, defaultSource: "initiator" },
  { id: "day", label: "日期", type: "date", defaultSource: "currentDate" },
  { id: "year", label: "年度", type: "number", defaultSource: "currentYear" },
  { id: "zero", label: "零", type: "number", defaultValue: 0 },
  { id: "no", label: "否", type: "checkbox", defaultValue: false },
] };
test("defaults use the initiator and Beijing date, including false and zero", () => {
  assert.deepEqual(initialValues(schema, user, new Date("2026-12-31T18:00:00Z")), { person: user.id, name: "张三", day: "2027-01-01", year: 2027, zero: 0, no: false });
  assert.equal(schema.fields[0].defaultValue, undefined);
});
test("identity numbers preserve X and leading zeros; invalid checksums and types fail", () => {
  const config: TableSchema = { name: "号码", description: "", fields: [
    { id: "id", label: "身份证", type: "number", format: "idCard" },
    { id: "code", label: "编号", type: "number", format: "digits" },
    { id: "phone", label: "手机", type: "number", format: "phone" },
  ] };
  assert.deepEqual(validateValues(config, { id: "11010519491231002X", code: "00001", phone: "13800138000" }), {});
  assert.ok(validateValues(config, { id: "110105194912310021" }).id);
  assert.ok(validateValues(config, { id: "11010519490231002X" }).id);
  assert.ok(validateValues(config, { id: 110105194912310020 }).id);
  assert.ok(validateValues(config, { phone: "123", code: 1 }).phone);
  const properties = dataJsonSchema(config).properties as Record<string, { type: string }>;
  assert.equal(properties.id.type, "string");
  assert.equal(defaultConditionValue(config.fields[0]), "");
  assert.ok(!conditionOperators(config.fields[0]).some((entry) => entry === "GT"));
});
test("integer and currency formats enforce precision and display percent", () => {
  const config: TableSchema = { name: "数字", description: "", fields: [
    { id: "n", label: "整数", type: "number", format: "integer" },
    { id: "m", label: "金额", type: "number", format: "currency" },
  ] };
  assert.deepEqual(validateValues(config, { n: 0, m: 1.10 }), {});
  assert.ok(validateValues(config, { n: 1.1 }).n);
  assert.ok(validateValues(config, { m: 1.234 }).m);
  assert.ok(validateValues(config, { m: 1e-10 }).m);
  assert.equal(fieldValueLabel({ id: "p", label: "比例", type: "number", format: "percent" }, 25, { units: [], positions: [], people: [] }), "25%");
});


test("standalone identity field upgrades legacy metadata without touching IDs or values", async () => {
  const { createField, upgradeIdentityFields, inputFormats } = await import("../src/lowcode/field-model");
  assert.equal(createField("idCard").type, "idCard");
  assert.ok(!inputFormats.some((option) => option.value === "idCard"));
  const original: TableSchema = { name: "证件", description: "", fields: [{ id: "identity", label: "身份证", type: "number", format: "idCard" }] };
  const upgraded = upgradeIdentityFields(original);
  assert.equal(upgraded.fields[0].id, "identity");
  assert.equal(upgraded.fields[0].type, "idCard");
  assert.equal(upgraded.fields[0].format, undefined);
  assert.equal(original.fields[0].type, "number");
  assert.deepEqual(validateValues(upgraded, { identity: "11010519491231002x" }), {});
});
test("serial templates support literal prefixes and bounded date/time/random tokens", async () => {
  const { serialTemplateError, serialExample } = await import("../src/lowcode/serial-template");
  assert.equal(serialTemplateError("SQ-{YYYY}{MM}{DD}-{HH}{mm}{ss}-{RAND:8}"), "");
  assert.equal(serialExample("SQ-{YYYY}-{YY}-{MM}-{DD}-{HH}-{mm}-{ss}-{SSS}-{DIGITS:4}", new Date("2026-12-31T18:02:03.004Z")), "SQ-2027-27-01-01-02-02-03-004-0123");
  for (const invalid of ["", "{script()}", "{RAND:3}", "{RAND:33}", "{YYYY", "{RAND:32}".repeat(5)]) assert.ok(serialTemplateError(invalid));
  const config: TableSchema = { name: "编号", description: "", fields: [{ id: "code", label: "编号", type: "serial", required: true }] };
  assert.deepEqual(initialValues(config), {});
  assert.deepEqual(validateValues(config, {}), {}); // server generates at first save
  assert.ok(validateValues({ ...config, fields: [{ ...config.fields[0], codeTemplate: "{bad}" }] }, {})._form);
});
test("signature validation requires bounded nonblank strokes and rejects markup or unknown keys", async () => {
  const { validSignature } = await import("../src/lowcode/signature-model");
  const signature = { version: 1, strokes: [[[10, 10], [40, 25], [70, 10]]] };
  const config: TableSchema = { name: "签名", description: "", fields: [{ id: "sign", label: "签名", type: "signature", required: true }] };
  assert.ok(validSignature(signature));
  assert.deepEqual(validateValues(config, { sign: signature }), {});
  assert.ok(validateValues(config, {}).sign);
  assert.deepEqual(validateValues(config, {}, false), {});
  for (const invalid of ["<svg onload='alert(1)'/>", { version: 1, strokes: [] }, { version: 1, strokes: [[[1, 1], [1, 1]]] }, { version: 1, strokes: [[[1, 1], [1001, 1]]] }, { ...signature, script: "bad" }, { version: 1, strokes: Array(65).fill([[10, 10], [20, 20]]) }, { version: 1, strokes: [Array(501).fill([1, 1])] }]) {
    assert.ok(!validSignature(invalid));
    assert.ok(validateValues(config, { sign: invalid }).sign);
  }
  assert.deepEqual(conditionOperators(config.fields[0]), ["EMPTY", "NOT_EMPTY"]);
  assert.equal(fieldValueLabel(config.fields[0], signature, { units: [], positions: [], people: [] }), "已签名");
});

test("time precision validates strict clock values and resolves Beijing defaults", () => {
  const config: TableSchema = { name: "时间", description: "", fields: [
    { id: "minute", label: "分钟", type: "time", required: true, defaultSource: "currentTime" },
    { id: "second", label: "秒", type: "time", timePrecision: "second", defaultSource: "currentTime" },
  ] };
  assert.deepEqual(initialValues(config, user, new Date("2026-12-31T18:02:03.004Z")), { minute: "02:02", second: "02:02:03" });
  assert.deepEqual(validateValues(config, { minute: "23:59", second: "00:00:00" }), {});
  for (const invalid of ["24:00", "9:00", "09:60", "09:00:00", "09:00Z", "09:00 ", null]) assert.ok(validateValues(config, { minute: invalid }).minute);
  for (const invalid of ["09:00", "09:00:60", "24:00:00"]) assert.ok(validateValues(config, { minute: "00:00", second: invalid }).second);
});

test("rating enforces integer range and required ratings reject zero", () => {
  const config: TableSchema = { name: "评分", description: "", fields: [{ id: "score", label: "评分", type: "rating", required: true, ratingMax: 7 }] };
  assert.deepEqual(validateValues(config, { score: 7 }), {});
  for (const score of [0, -1, 7.1, 8, "5"]) assert.ok(validateValues(config, { score }).score);
  assert.deepEqual(validateValues(config, { score: 0 }, false), {});
  assert.deepEqual(validateValues({ ...config, fields: [{ ...config.fields[0], required: false }] }, { score: 0 }), {});
});

test("organization and file values remain UUID references with bounded unique lists", () => {
  const config: TableSchema = { name: "引用", description: "", fields: [
    { id: "department", label: "部门", type: "department" }, { id: "position", label: "岗位", type: "position" },
    { id: "departments", label: "部门列表", type: "departments" }, { id: "positions", label: "岗位列表", type: "positions" },
    { id: "files", label: "附件", type: "attachment", required: true, fileConfig: { maxFiles: 1 } },
  ] };
  assert.deepEqual(validateValues(config, { department: user.id, position: user.id, departments: [user.id], positions: [user.id], files: [user.id] }), {});
  assert.ok(validateValues(config, { files: [] }).files);
  assert.ok(validateValues(config, { files: [user.id, "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff"] }).files);
  for (const value of [[user.id, user.id.toUpperCase()], ["not-an-id"], [null], "not-an-array"]) {
    assert.ok(validateValues(config, { departments: value, files: [user.id] }).departments);
  }
  assert.ok(validateValues(config, { department: "研发部", files: [user.id] }).department);
  const directory = { units: [{ id: user.id, name: "研发部", kind: "DEPARTMENT" as const }], positions: [{ id: user.id, name: "工程师" }], people: [] };
  assert.equal(fieldValueLabel(config.fields[0], user.id.toUpperCase(), directory), "研发部");
  assert.equal(fieldValueLabel(config.fields[1], user.id, directory), "工程师");
});

test("new numeric precision limits retain integer and currency rules", () => {
  const field: LowcodeField = { id: "amount", label: "金额", type: "number", format: "currency", numericConfig: { decimalPlaces: 3, thousandsSeparator: true, unit: "元" } };
  const config: TableSchema = { name: "数值", description: "", fields: [field] };
  assert.deepEqual(validateValues(config, { amount: 1234.50 }), {});
  assert.ok(validateValues(config, { amount: 1.001 }).amount);
  assert.equal(fieldValueLabel(field, 1234.5, { units: [], positions: [], people: [] }), "1,234.500元");
  const precise = { ...config, fields: [{ ...field, format: "number" as const, numericConfig: { decimalPlaces: 8 } }] };
  assert.deepEqual(validateValues(precise, { amount: 1e-8 }), {});
  assert.ok(validateValues(precise, { amount: 1e-9 }).amount);
});

test("new field configuration rejects unknown nested keys, incompatible flags and invalid limits", () => {
  const check = (field: Record<string, unknown>) => validateFieldConfigs({ name: "配置", description: "", fields: [{ id: "field", label: "字段", ...field } as LowcodeField] });
  const invalid = [
    { type: "text", unique: "true" }, { type: "textarea", unique: true }, { type: "number", numericConfig: { decimalPlaces: 9 } },
    { type: "number", numericConfig: { unit: "a".repeat(25) } }, { type: "number", numericConfig: { thousandsSeparator: "yes" } },
    { type: "number", format: "digits", numericConfig: {} }, { type: "number", numericConfig: { code: "run" } },
    { type: "text", fileConfig: {} }, { type: "attachment", fileConfig: { maxFiles: 21 } }, { type: "attachment", fileConfig: { maxSizeMb: 1.5 } },
    { type: "image", fileConfig: { accept: [".svg"] } }, { type: "attachment", fileConfig: { accept: [".PDF", ".pdf"] } },
    { type: "attachment", defaultValue: [user.id] }, { type: "rating", ratingMax: 11 }, { type: "signature", signatureHeight: 119 },
    { type: "time", timePrecision: "millisecond" }, { type: "text", sequenceReset: "day" }, { type: "heading", visibility: "alwaysHidden" },
    { type: "select", options: ["A"], choiceConfig: { colors: { B: "#123456" } } }, { type: "select", options: ["A"], choiceConfig: { colors: { A: "red" } } },
    { type: "multiselect", options: ["A"], choiceConfig: { style: "stages" } }, { type: "member", selectionScope: { departmentIds: ["bad"] } },
    { type: "member", selectionScope: { positionIds: [user.id, user.id.toUpperCase()] } },     { type: "text", designNote: "a".repeat(2001) }, { type: "text", column: 0 },
  ];
  for (const field of invalid) assert.ok(check(field).field, JSON.stringify(field));
  assert.deepEqual(check({ type: "image", fileConfig: { accept: [".PNG"], maxFiles: 20, maxSizeMb: 50 } }), {});
  assert.deepEqual(check({ type: "select", options: ["A"], choiceConfig: { style: "stages", colors: { A: "#ABCDEF" } } }), {});
  assert.deepEqual(check({ type: "text", width: 6, column: 7, unique: true, helpDisplay: "tooltip", designNote: "说明", visibility: "createHidden" }), {});
  assert.equal(check({ type: "text", onChange: "payload" }).field, "字段：包含不支持的配置项：onChange");
  assert.equal(
    clarifySchemaRejection(
      { name: "日报", description: "", fields: [
        { id: "reporter", label: "报告人", type: "member", selectionScope: { departmentIds: [], positionIds: [] } },
        { id: "today", label: "今日工作", type: "textarea", width: 6, column: 7 },
      ] },
      "字段配置包含不支持的配置项",
    ),
    "字段「报告人」包含不支持的配置项：可选成员范围（selectionScope）；字段「今日工作」包含不支持的配置项：列位置（column）",
  );
});

test("visibility preserves legacy hidden behavior and defaults across create, edit and detail", () => {
  const base: LowcodeField = { id: "field", label: "字段", type: "text", defaultValue: "默认" };
  assert.equal(isFieldVisible({ ...base, hidden: true }, "edit"), false);
  assert.equal(isFieldVisible({ ...base, hidden: true }, "edit", true), true);
  assert.equal(isFieldVisible({ ...base, visibility: "createHidden" }, "create"), false);
  assert.equal(isFieldVisible({ ...base, visibility: "createHidden" }, "edit"), true);
  assert.equal(isFieldVisible({ ...base, visibility: "createHidden" }, "create", true), true);
  for (const mode of ["create", "edit"] as const) for (const readOnly of [true, false]) assert.equal(isFieldVisible({ ...base, visibility: "alwaysHidden" }, mode, readOnly), false);
  assert.equal(isFieldVisible({ ...base, visibility: "visible", hidden: true }), false);
  assert.deepEqual(initialValues({ name: "", description: "", fields: [{ ...base, visibility: "alwaysHidden" }] }), { field: "默认" });
});

test("member selection scope matches direct department and position together", () => {
  const person = { ...user, username: "zhang", enabled: true, systemRole: "USER" as const, orgUnitId: "dept-a", positionId: "position-a" };
  const directory = { units: [], positions: [], people: [person, { ...person, id: "other", positionId: "position-b" }, { ...person, id: "third", orgUnitId: "dept-b" }] };
  const field: LowcodeField = { id: "people", label: "成员", type: "members", selectionScope: { departmentIds: ["DEPT-A"], positionIds: ["position-a"] } };
  assert.deepEqual(scopedDirectory(field, directory).people.map((entry) => entry.id), [user.id]);
  assert.equal(directory.people.length, 3);
  assert.equal(scopedDirectory({ ...field, selectionScope: {} }, directory).people.length, 3);
});

test("SEQ preview is deterministic and accepts only four through twelve digits", async () => {
  const { serialTemplateError, serialExample } = await import("../src/lowcode/serial-template");
  assert.equal(serialExample("SQ-{YYYY}{MM}-{SEQ:4}", new Date("2026-12-31T18:02:03Z")), "SQ-202701-0001");
  assert.equal(serialExample("{SEQ:12}"), "000000000001");
  for (const template of ["{SEQ:3}", "{SEQ:13}", "{SEQ:04}", "{SEQ}"]) assert.ok(serialTemplateError(template));
  assert.equal(serialTemplateError("{RAND:8}-{SEQ:6}-{DIGITS:4}"), "");
});
test("placing a field beside another sits on the same row without packing later fields", async () => {
  const { fieldColumn, fieldGridStyle, fieldRows, fieldWidth, placeField, renderFieldSpan, snapFieldWidth } = await import("../src/lowcode/field-model");
  const split = placeField([
    { id: "a", label: "甲", type: "text", width: 12 },
    { id: "b", label: "乙", type: "text", width: 12 },
  ], "b", "a", "right");
  assert.deepEqual(split.map((field) => [field.id, field.width, field.column ?? 1]), [["a", 6, 1], ["b", 6, 7]]);
  const leftover = placeField([
    { id: "a", label: "甲", type: "text", width: 8 },
    { id: "b", label: "乙", type: "text", width: 12 },
  ], "b", "a", "right");
  assert.equal(leftover[0].width, 8);
  assert.equal(leftover[1].width, 4);
  assert.equal(leftover[1].column, 9);
  const before = placeField(split, "b", "a", "before");
  assert.deepEqual(before.map((field) => field.id), ["b", "a"]);
  assert.equal(before[0].column, undefined);
  assert.equal(fieldColumn({ id: "a", label: "甲", type: "text", width: 6 }), 1);
  assert.equal(fieldGridStyle(6, 1).gridColumn, "1 / span 6");
  assert.deepEqual(fieldRows([
    { id: "a", label: "甲", type: "text", width: 6 },
    { id: "b", label: "乙", type: "text", width: 6 },
    { id: "c", label: "丙", type: "text", width: 6, column: 7 },
  ]).map((row) => row.map((field) => field.id)), [["a"], ["b", "c"]]);
  assert.equal(fieldWidth({ id: "h", label: "标题", type: "heading" }), 12);
  assert.equal(renderFieldSpan({ id: "a", label: "甲", type: "text", width: 6 }, 1), 12);
  assert.equal(renderFieldSpan({ id: "a", label: "甲", type: "text", width: 6 }, 2), 6);
  assert.equal(snapFieldWidth(5.2), 6);
  assert.equal(snapFieldWidth(11), 12);
});
