import assert from "node:assert/strict";
import { test } from "node:test";
import { dataJsonSchema, resolveFieldRules, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { compatibleRuleFields, ruleDependencies, ruleEmpty, ruleMatches, ruleOperators, validateRule, type Rule } from "../src/lowcode/rules";
const personId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const fields: LowcodeField[] = [
  { id: "amount", type: "number", label: "金额", minimum: 1, format: "currency" }, { id: "limit", type: "number", label: "限额" },
  { id: "name", type: "text", label: "名称" }, { id: "enabled", type: "checkbox", label: "启用" },
  { id: "date", type: "date", label: "日期" }, { id: "instant", type: "datetime", label: "时刻" },
  { id: "minute", type: "time", label: "分钟" }, { id: "second", type: "time", label: "秒", timePrecision: "second" },
  { id: "person", type: "member", label: "人员" }, { id: "department", type: "department", label: "部门" },
  { id: "people", type: "members", label: "多位人员" }, { id: "tags", type: "multiselect", label: "标签", options: ["A", "B"] },
  { id: "choice", type: "select", label: "单选", options: ["A", "B"] }, { id: "files", type: "attachment", label: "附件" },
  { id: "heading", type: "heading", label: "标题" }, { id: "rating", type: "rating", label: "评分", ratingMax: 5 },
];
test("compound rules share strict domains, field comparisons and normalized UUID membership", () => {
  const rule: Rule = { operator: "AND", conditions: [
    { fieldId: "amount", operator: "GTE", valueFieldId: "limit" },
    { operator: "OR", conditions: [{ fieldId: "enabled", operator: "EQ", value: false }, { fieldId: "person", operator: "EQ", value: personId.toUpperCase() }] },
    { fieldId: "tags", operator: "CONTAINS", value: "A" },
  ] };
  assert.deepEqual(validateRule(rule, fields), []);
  assert.equal(ruleMatches(rule, { amount: 4.501, limit: 4.5, enabled: false, tags: ["A"] }, fields), true);
  assert.equal(ruleMatches(rule, { amount: "4.5", limit: 4, enabled: false, tags: ["A"] }, fields), false);
  assert.equal(ruleMatches({ fieldId: "people", operator: "CONTAINS", value: personId }, { people: [personId.toUpperCase()] }, fields), true);
  assert.equal(ruleMatches({ fieldId: "people", operator: "CONTAINS", value: personId }, { people: [personId, "invalid"] }, fields), false);
  assert.deepEqual([...ruleDependencies(rule)].sort(), ["amount", "enabled", "limit", "person", "tags"]);
});
test("missing values and wrong types never satisfy NE; zero and false are nonempty", () => {
  for (const value of [undefined, null, "", "  ", []]) assert.equal(ruleEmpty(value), true);
  for (const value of [0, false]) assert.equal(ruleEmpty(value), false);
  for (const amount of [undefined, null, "bad", [], false]) assert.equal(ruleMatches({ fieldId: "amount", operator: "NE", value: 1 }, { amount }, fields), false);
  assert.equal(ruleMatches({ fieldId: "amount", operator: "NE", value: 1 }, { amount: 0 }, fields), true);
  assert.equal(ruleMatches({ fieldId: "amount", operator: "NOT_EMPTY" }, { amount: "bad" }, fields), true);
  assert.equal(ruleMatches({ fieldId: "enabled", operator: "EQ", value: false }, { enabled: false }, fields), true);
});
test("date, nanosecond instant and mixed-precision clock comparisons are typed", () => {
  assert.equal(ruleMatches({ fieldId: "instant", operator: "EQ", value: "2026-09-10T08:00:00.123456789+08:00" }, { instant: "2026-09-10T00:00:00.123456789Z" }, fields), true);
  assert.equal(ruleMatches({ fieldId: "instant", operator: "GT", value: "2026-09-10T00:00:00.123456788Z" }, { instant: "2026-09-10T00:00:00.123456789Z" }, fields), true);
  assert.equal(ruleMatches({ fieldId: "minute", operator: "EQ", valueFieldId: "second" }, { minute: "12:34", second: "12:34:00" }, fields), true);
  for (const value of ["2026-02-30", "2026-9-10"]) assert.ok(validateRule({ fieldId: "date", operator: "EQ", value }, fields).length);
  for (const value of ["2026-09-10T24:00:00Z", "2026-02-30T00:00:00Z", "2026-09-10T00:00:00+18:01"]) assert.ok(validateRule({ fieldId: "instant", operator: "EQ", value }, fields).length);
  assert.ok(validateRule({ fieldId: "second", operator: "EQ", value: "12:34" }, fields).length);
});
test("rule configuration rejects mixed nodes, extra keys, invalid literals and incompatible operands", () => {
  for (const rule of [
    { operator: "DEFAULT" }, { operator: "AND", conditions: [] }, { operator: "OR", conditions: Array(9).fill({ fieldId: "name", operator: "EMPTY" }) },
    { operator: "AND", fieldId: "name", conditions: [{ fieldId: "name", operator: "EMPTY" }] },
    { fieldId: "name", operator: "EMPTY", value: "" }, { fieldId: "name", operator: "EQ", value: "A", valueFieldId: "name" },
    { fieldId: "name", operator: "EQ", value: "A", code: "x" }, { fieldId: "heading", operator: "EMPTY" },
    { fieldId: "amount", operator: "GT", valueFieldId: "name" }, { fieldId: "person", operator: "EQ", valueFieldId: "department" },
    { fieldId: "choice", operator: "EQ", value: "C" }, { fieldId: "rating", operator: "EQ", value: 6 },
    { fieldId: "files", operator: "CONTAINS", value: personId }, { fieldId: "name", operator: "CONTAINS", valueFieldId: "name" },
  ]) assert.ok(validateRule(rule, fields).length, JSON.stringify(rule));
  const leaf: Rule = { fieldId: "name", operator: "EMPTY" };
  const deep: Rule = { operator: "AND", conditions: [{ operator: "OR", conditions: [{ operator: "AND", conditions: [{ operator: "OR", conditions: [leaf] }] }] }] };
  assert.ok(validateRule(deep, fields).length);
  assert.ok(validateRule({ operator: "AND", conditions: Array.from({ length: 4 }, () => ({ operator: "OR", conditions: Array(8).fill(leaf) })) }, fields).length);
  assert.deepEqual(ruleOperators(fields.find((field) => field.type === "attachment")), ["EMPTY", "NOT_EMPTY"]);
  assert.equal(compatibleRuleFields(fields[0], fields[1], "GT"), true);
});
test("conditional visibility restores original values before evaluating downstream fields", () => {
  const schema: TableSchema = { name: "联动", description: "", fields: [
    { id: "downstream", label: "下游", type: "text", visibleWhen: { fieldId: "dependent", operator: "EQ", value: "saved" }, required: true },
    { id: "dependent", label: "中间值", type: "text", defaultValue: "default", visibleWhen: { fieldId: "toggle", operator: "EQ", value: true } },
    { id: "toggle", label: "开关", type: "checkbox" },
  ] };
  const existing = { toggle: true, dependent: "saved", downstream: "old" }, incoming = { toggle: false, dependent: "forged", downstream: "edited" };
  const resolved = resolveFieldRules(schema, incoming, { mode: "edit", existing });
  assert.deepEqual(resolved.values, { toggle: false, dependent: "saved", downstream: "edited" });
  assert.equal(resolved.visible.dependent, false); assert.equal(resolved.visible.downstream, true);
  assert.deepEqual(existing, { toggle: true, dependent: "saved", downstream: "old" });
  assert.equal(incoming.dependent, "forged");
  assert.deepEqual(validateValues(schema, incoming, true, { mode: "edit", existing }), {});
  assert.equal(resolveFieldRules(schema, { toggle: false, dependent: "forged" }).values.dependent, "default");
});
test("dynamic required, warnings and conditional cross-field validation have separate behavior", () => {
  const schema: TableSchema = { name: "提交规则", description: "", fields: [
    { id: "enabled", type: "checkbox", label: "启用" },
    { id: "amount", type: "number", label: "金额", requiredWhen: { fieldId: "enabled", operator: "EQ", value: true }, warningRules: [{ id: "warn", condition: { fieldId: "amount", operator: "GT", value: 100 }, message: "请确认大额支出", color: "amber" }] },
    { id: "limit", type: "number", label: "限额" },
  ], validationRules: [{ id: "cap", when: { fieldId: "enabled", operator: "EQ", value: true }, condition: { fieldId: "amount", operator: "LTE", valueFieldId: "limit" }, fieldId: "amount", message: "金额不可超过限额" }] };
  assert.deepEqual(validateFieldConfigs(schema), {});
  assert.deepEqual(validateValues(schema, { enabled: false }), {});
  assert.ok(validateValues(schema, { enabled: true }).amount);
  assert.equal(validateValues(schema, { enabled: true, amount: 200, limit: 150 }).amount, "金额不可超过限额");
  assert.deepEqual(validateValues(schema, { enabled: true, amount: 200, limit: 150 }, false), {});
  assert.equal(resolveFieldRules(schema, { amount: 200 }).warnings.amount[0].message, "请确认大额支出");
  assert.deepEqual(validateValues(schema, { enabled: false, amount: 200 }), {});
  const properties = dataJsonSchema(schema).properties as Record<string, { minimum?: number }>;
  assert.equal(properties.amount.minimum, undefined);
});
test("hidden required fields are exempt; cycles and invalid messages remain configuration errors", () => {
  const hidden: TableSchema = { name: "隐藏", description: "", fields: [{ id: "toggle", type: "checkbox", label: "开关" }, { id: "child", type: "rating", label: "评分", required: true, visibleWhen: { fieldId: "toggle", operator: "EQ", value: true } }] };
  assert.deepEqual(dataJsonSchema(hidden).required, []);
  assert.deepEqual(validateValues(hidden, { toggle: false, child: 99 }), {});
  assert.ok(validateValues(hidden, { toggle: true, child: 0 }).child);
  const cycle: TableSchema = { ...hidden, fields: [{ id: "first", type: "text", label: "甲", visibleWhen: { fieldId: "second", operator: "EQ", valueFieldId: "first" } }, { id: "second", type: "text", label: "乙", visibleWhen: { fieldId: "first", operator: "NOT_EMPTY" } }] };
  assert.ok(validateFieldConfigs(cycle).first); assert.ok(validateFieldConfigs(cycle).second);
  assert.ok(validateFieldConfigs({ ...hidden, validationRules: [{ id: "cap", condition: { fieldId: "toggle", operator: "EMPTY" }, message: "" }] })._form);
});
