import assert from "node:assert/strict";
import { test } from "node:test";
import { dataJsonSchema, fieldValueLabel, resolveFieldRules, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { collectLookupQueries, lookupKey, lookupQuery, normalizeLookupValue, relationLimit, validateRelation } from "../src/lowcode/relations";
import { ruleMatches, ruleOperators, validateRule } from "../src/lowcode/rules";
import { numericField } from "../src/lowcode/calculations";
const tableId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", firstId = "11111111-2222-4333-8444-555555555555", secondId = "66666666-7777-4888-8999-000000000000";
const relation: LowcodeField = { id: "product", label: "商品", type: "relation", relationConfig: { tableId } };
const lookup: LowcodeField = { id: "price", label: "查询单价", type: "lookup", lookupConfig: { relationFieldId: "product", targetFieldId: "price", resultType: "number" } };
const formula: LowcodeField = { id: "amount", label: "金额", type: "formula", formulaConfig: { expression: { op: "MUL", left: { op: "FIELD", fieldId: "price" }, right: { op: "CONST", value: 3 } } } };
const schema = (fields: LowcodeField[]): TableSchema => ({ name: "关联验收", description: "", fields });
test("relation configs enforce canonical-compatible UUIDs, closed keys and single/multiple limits", () => {
  assert.deepEqual(validateRelation({ tableId }), []);
  assert.equal(relationLimit(relation), 1);
  assert.equal(relationLimit({ ...relation, relationConfig: { tableId, multiple: true } }), 20);
  for (const config of [{ tableId: "bad" }, { tableId, multiple: "true" }, { tableId, maxRecords: 2 }, { tableId, multiple: true, maxRecords: 51 }, { tableId, multiple: true, maxRecords: 1.5 }, { tableId, titleFieldId: "parent.child" }, { tableId, code: "unsafe" }]) assert.ok(validateRelation(config).length);
  for (const field of [{ ...relation, defaultValue: [] }, { ...relation, unique: true }, { ...relation, format: "currency" }, { ...relation, numericConfig: { unit: "元" } }] as LowcodeField[]) assert.ok(validateFieldConfigs(schema([field])).product);
});
test("relation values are bounded unique UUID arrays and list labels do not expose IDs", () => {
  assert.deepEqual(validateValues(schema([relation]), { product: [firstId] }), {});
  for (const value of [firstId, ["bad"], [firstId, secondId], [firstId, firstId.toUpperCase()]]) assert.ok(Object.keys(validateValues(schema([relation]), { product: value }, false)).length);
  assert.deepEqual(validateValues(schema([relation]), { product: [] }), {});
  assert.ok(validateValues(schema([{ ...relation, required: true }]), { product: [] }).product);
  assert.equal(fieldValueLabel(relation, [firstId], { units: [], positions: [], people: [] }), "已关联 1 条");
  assert.deepEqual(ruleOperators(relation), ["EMPTY", "NOT_EMPTY"]);
  assert.ok(validateRule({ fieldId: "product", operator: "EQ", value: firstId }, [relation]).length);
});
test("lookup metadata rejects cross-layer, multiple, incompatible and cyclic configuration", () => {
  assert.deepEqual(validateFieldConfigs(schema([relation, lookup, formula])), {});
  for (const fields of [[lookup], [{ ...relation, relationConfig: { tableId, multiple: true } }, lookup], [relation, { ...lookup, lookupConfig: { ...lookup.lookupConfig!, targetFieldId: "nested.price" } }], [relation, { ...lookup, defaultValue: 8 }], [relation, { ...lookup, lookupConfig: { ...lookup.lookupConfig!, resultType: "text" }, numericConfig: { unit: "元" } }], [{ ...relation, visibleWhen: { fieldId: "price", operator: "GT", value: 0 } }, lookup]] as LowcodeField[][]) assert.ok(Object.keys(validateFieldConfigs(schema(fields))).length);
  assert.equal(numericField(lookup), true);
  assert.equal(numericField({ ...lookup, lookupConfig: { ...lookup.lookupConfig!, resultType: "text" } }), false);
});
test("resolved lookup replaces forged values before formulas and dependent conditions", () => {
  const definition = schema([formula, { id: "reason", type: "text", label: "原因", visibleWhen: { fieldId: "amount", operator: "GT", value: 10 } }, lookup, relation]);
  const context = { lookupResolver: () => 1.005 };
  const result = resolveFieldRules(definition, { product: [firstId], price: 9000, amount: 5000 }, context);
  assert.equal(result.values.price, 1.01); assert.equal(result.values.amount, 3.03); assert.equal(result.visible.reason, false);
  assert.deepEqual(validateValues(definition, result.values, true, context), {});
  assert.equal(ruleMatches({ fieldId: "price", operator: "GT", value: 1 }, result.values, definition.fields), true);
  assert.equal((dataJsonSchema(definition).properties as Record<string, { type: string }>).price.type, "number");
});
test("a pending, cleared or mismatched relation cannot keep an old lookup or downstream formula", () => {
  const definition = schema([relation, lookup, formula]);
  const cached = new Map([[lookupKey({ tableId, recordId: firstId, fieldId: "price", resultType: "number" }), 12]]);
  const context = { lookupResolver: (field: LowcodeField, values: Record<string, unknown>, fields: LowcodeField[]) => { const query = lookupQuery(field, values, fields); return query ? cached.get(lookupKey(query)) : undefined; } };
  assert.equal(resolveFieldRules(definition, { product: [firstId.toUpperCase()] }, context).values.amount, 36);
  for (const product of [[], [secondId], undefined, ["bad"]]) {
    const values = resolveFieldRules(definition, { product, price: 12, amount: 36 }, context).values;
    assert.equal(values.price, undefined); assert.equal(values.amount, undefined);
  }
});
test("lookup validates text codepoint length, numeric precision, bounds and failure visibility", () => {
  const text: LowcodeField = { ...lookup, lookupConfig: { ...lookup.lookupConfig!, resultType: "text" } };
  assert.equal(normalizeLookupValue(text, " "), undefined);
  assert.equal(normalizeLookupValue(text, "😀".repeat(20000)), "😀".repeat(20000));
  assert.throws(() => normalizeLookupValue(text, "A".repeat(20001)));
  assert.throws(() => normalizeLookupValue(text, 5));
  assert.equal(normalizeLookupValue(lookup, -1.005), -1.01);
  assert.throws(() => normalizeLookupValue(lookup, 1e16));
  assert.throws(() => normalizeLookupValue(lookup, "1"));
  const definition = schema([relation, { ...lookup, visibility: "alwaysHidden" }]);
  assert.match(validateValues(definition, { product: [firstId] }, false, { lookupResolver: () => { throw new Error("目标记录不可用"); } })._form, /目标记录不可用/);
  assert.equal(ruleMatches({ fieldId: "price", operator: "CONTAINS", value: "终" }, { price: "A".repeat(15000) + "终" }, [text]), true);
});
test("subtable queries share target identity, remain row-local and feed numeric summaries", () => {
  const items: LowcodeField = { id: "items", label: "明细", type: "subtable", subtableConfig: { fields: [relation, lookup, formula] } };
  const total: LowcodeField = { id: "total", label: "总价", type: "summary", summaryConfig: { subtableId: "items", operation: "SUM", fieldId: "amount" } };
  const definition = schema([total, items]);
  const values = { items: [{ id: firstId, values: { product: [firstId] } }, { id: secondId, values: { product: [secondId] } }] };
  const context = { lookupResolver: (_: LowcodeField, row: Record<string, unknown>) => (row.product as string[])[0] === firstId ? 2 : 4 };
  const result = resolveFieldRules(definition, values, context);
  assert.equal(result.values.total, 18);
  assert.equal(collectLookupQueries(definition, result.values).size, 2);
  assert.deepEqual(validateValues(definition, result.values, true, context), {});
});
test("all roots and subrows contribute to the aggregate 200-relation limit", () => {
  const multiple: LowcodeField = { ...relation, relationConfig: { tableId, multiple: true, maxRecords: 50 } };
  const definition = schema([{ id: "items", label: "明细", type: "subtable", subtableConfig: { fields: [multiple] } }]);
  const values = { items: Array.from({ length: 5 }, () => ({ id: crypto.randomUUID(), values: { product: Array.from({ length: 50 }, () => crypto.randomUUID()) } })) };
  assert.match(validateValues(definition, values, false)._form, /200/);
});
