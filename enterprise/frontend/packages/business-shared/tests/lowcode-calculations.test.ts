import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCalculation, type Expression } from "../src/lowcode/calculations";
import { resolveFieldRules, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema, type SubtableRow } from "../src/lowcode/field-model";
const firstId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", secondId = "11111111-2222-4333-8444-555555555555";
const constant = (value: number): Expression => ({ op: "CONST", value });
const reference = (fieldId: string): Expression => ({ op: "FIELD", fieldId });
const formula = (id: string, expression: Expression, decimalPlaces = 2): LowcodeField => ({ id, label: id, type: "formula", formulaConfig: { expression }, readOnly: true, numericConfig: { decimalPlaces } });
const qty: LowcodeField = { id: "qty", label: "数量", type: "number", required: true };
const price: LowcodeField = { id: "price", label: "单价", type: "number", defaultValue: 0.1 };
const subtotal = formula("subtotal", { op: "MUL", left: reference("qty"), right: reference("price") });
const lines: LowcodeField = { id: "lines", label: "明细", type: "subtable", subtableConfig: { fields: [qty, price, subtotal], maxRows: 100 } };
const total: LowcodeField = { id: "total", label: "总计", type: "summary", summaryConfig: { subtableId: "lines", operation: "SUM", fieldId: "subtotal" } };
const schema = (fields: LowcodeField[]): TableSchema => ({ name: "计算验收", description: "", fields });
test("decimal calculations round HALF_UP including negative ties and division before final precision", () => {
  assert.equal(evaluateCalculation(formula("x", { op: "ADD", left: constant(0.1), right: constant(0.2) }), {}), 0.3);
  assert.equal(evaluateCalculation(formula("x", constant(1.005)), {}), 1.01);
  assert.equal(evaluateCalculation(formula("x", constant(-1.005)), {}), -1.01);
  assert.equal(evaluateCalculation(formula("x", { op: "DIV", left: constant(2), right: constant(3) }, 8), {}), 0.66666667);
  assert.equal(evaluateCalculation(formula("x", { op: "DIV", left: constant(-1), right: constant(200) }), {}), -0.01);
  assert.equal(evaluateCalculation(formula("x", reference("missing")), {}), undefined);
  assert.throws(() => evaluateCalculation(formula("x", { op: "DIV", left: constant(1), right: constant(0) }), {}), /零/);
  assert.throws(() => evaluateCalculation(formula("x", { op: "SUB", left: { op: "MUL", left: constant(1e15), right: constant(2) }, right: constant(1e15) }), {}), /1e15/);
});
test("child preparation precedes summaries and root formulas regardless of schema order", () => {
  const amount = formula("amount", { op: "ADD", left: reference("total"), right: constant(0.1) });
  const definition = schema([amount, total, lines]);
  const data = { lines: [{ id: firstId, values: { qty: 3, subtotal: 9999 } }, { id: secondId, values: { qty: 2, price: 0.2 } }], amount: -50, total: 800 };
  assert.deepEqual(validateFieldConfigs(definition), {});
  const result = resolveFieldRules(definition, data);
  assert.equal(result.values.total, 0.7); assert.equal(result.values.amount, 0.8);
  assert.equal((result.values.lines as SubtableRow[])[0].values.subtotal, 0.3);
  assert.deepEqual(validateValues(definition, data), {});
  assert.equal(data.lines[0].values.subtotal, 9999, "input is never mutated");
});
test("summary empty and missing semantics, averages and extrema", () => {
  const data = { lines: [{ id: firstId, values: { subtotal: 0.1 } }, { id: secondId, values: { subtotal: 0.2 } }, { id: crypto.randomUUID(), values: {} }] };
  for (const [operation, expected, empty] of [["SUM", 0.3, 0], ["AVG", 0.15, undefined], ["MIN", 0.1, undefined], ["MAX", 0.2, undefined], ["COUNT", 3, 0]] as const) {
    const field: LowcodeField = { ...total, summaryConfig: { subtableId: "lines", operation, ...(operation === "COUNT" ? {} : { fieldId: "subtotal" }) } };
    assert.equal(evaluateCalculation(field, data), expected);
    assert.equal(evaluateCalculation(field, {}), empty);
  }
});
test("reordered child hidden values restore by stable case-insensitive row identity", () => {
  const child: LowcodeField = { id: "price", label: "单价", type: "number", defaultValue: 0.1, visibleWhen: { fieldId: "qty", operator: "GT", value: 0 } };
  const definition = schema([total, { ...lines, subtableConfig: { fields: [qty, child, subtotal] } }]);
  const existing = { lines: [{ id: firstId, values: { qty: 1, price: 7 } }, { id: secondId, values: { qty: 1, price: 11 } }] };
  const result = resolveFieldRules(definition, { lines: [{ id: secondId, values: { qty: -2, price: 999 } }, { id: firstId.toUpperCase(), values: { qty: -3, price: 999 } }] }, { mode: "edit", existing });
  assert.deepEqual((result.values.lines as SubtableRow[]).map((row) => row.values.price), [11, 7]);
  assert.equal(result.values.total, -43);
});
test("restored parent subtables project obsolete child keys and recompute hidden formulas", () => {
  const definition = schema([{ id: "show", label: "显示", type: "checkbox" }, { ...lines, visibleWhen: { fieldId: "show", operator: "EQ", value: true } }, total]);
  const existing = { lines: [{ id: firstId, values: { qty: 3, price: 0.1, subtotal: 999, removedField: "old" } }] };
  const result = resolveFieldRules(definition, { show: false, lines: [] }, { mode: "edit", existing });
  assert.deepEqual((result.values.lines as SubtableRow[])[0].values, { qty: 3, price: 0.1, subtotal: 0.3 });
  assert.equal(result.values.total, 0.3);
  assert.deepEqual(validateValues(definition, { show: false, lines: [] }, true, { mode: "edit", existing }), {});
  assert.ok(Object.keys(validateValues(definition, { show: true, ...existing }, false, { mode: "edit", existing })).length, "editable unknown keys remain invalid");
});
test("child row requirements and validation apply only for complete visible parents; structure applies to drafts", () => {
  const visible: LowcodeField = { ...lines, visibleWhen: { fieldId: "show", operator: "EQ", value: true }, subtableConfig: { ...lines.subtableConfig!, minRows: 1, validationRules: [{ id: "positive", condition: { fieldId: "qty", operator: "GT", value: 0 }, message: "数量须为正数", fieldId: "qty" }] } };
  const definition = schema([{ id: "show", label: "显示", type: "checkbox" }, visible]);
  const data = { show: true, lines: [{ id: firstId, values: {} }] };
  assert.deepEqual(validateValues(definition, data, false), {});
  const errors = validateValues(definition, data, true);
  assert.ok(errors.lines); assert.ok(errors[`lines.${firstId}.qty`]);
  assert.deepEqual(validateValues(definition, { show: false, lines: [] }, true), {});
  assert.ok(validateValues(definition, { show: true }, true).lines);
  assert.ok(Object.keys(validateValues(definition, { show: true, lines: [{ id: "bad", values: {} }] }, false)).length);
  assert.ok(validateValues(definition, { show: true, lines: [{ id: firstId, values: {} }, { id: firstId.toUpperCase(), values: {} }] }, false).lines);
});
test("hidden calculation and hidden validation anchors surface form errors; division blocks drafts", () => {
  const calc = { ...formula("calc", { op: "DIV", left: constant(1), right: constant(0) }), visibility: "alwaysHidden" as const };
  assert.match(validateValues(schema([calc]), {}, false)._form, /零/);
  const definition = { ...schema([{ id: "secret", label: "隐藏字段", type: "text", visibility: "alwaysHidden", defaultValue: "A" }]), validationRules: [{ id: "check", fieldId: "secret", message: "此项需要 B", condition: { fieldId: "secret", operator: "EQ" as const, value: "B" } }] };
  assert.match(validateValues(definition, {})._form, /隐藏字段.*此项需要 B/);
});
test("configuration rejects deep calculations, cross-layer references, mixed cycles, child restrictions and bounds", () => {
  const invalid: LowcodeField[] = [
    { ...lines, defaultValue: [] }, { ...lines, required: true, readOnly: true },
    { ...lines, subtableConfig: { fields: [] } }, { ...lines, subtableConfig: { fields: [qty], minRows: 5, maxRows: 4 } },
    { ...lines, subtableConfig: { fields: [{ ...qty, unique: false }] } },
    { ...lines, subtableConfig: { fields: [{ id: "serial", type: "serial", label: "编号" }] } },
    { ...lines, subtableConfig: { fields: [total] } },
    formula("x", reference("qty")), formula("x", constant(1e16)),
    { ...formula("x", constant(1)), format: "currency" },
    { ...total, summaryConfig: { subtableId: "lines", operation: "COUNT", fieldId: "qty" } },
  ];
  for (const field of invalid) assert.ok(Object.keys(validateFieldConfigs(schema([...(field.type === "summary" ? [lines] : []), field]))).length, JSON.stringify(field));
  assert.ok(Object.keys(validateFieldConfigs(schema([formula("a", reference("b")), { ...formula("b", constant(1)), visibleWhen: { fieldId: "a", operator: "GT", value: 0 } }]))).length);
  const deep: Expression = { op: "ADD", left: constant(1), right: { op: "ADD", left: constant(1), right: { op: "ADD", left: constant(1), right: { op: "ADD", left: constant(1), right: constant(1) } } } };
  assert.ok(validateFieldConfigs(schema([formula("x", deep)])).x);
});
test("all root subtables enforce the combined row cap and new dynamic defaults retain their first value", () => {
  const tables = [0, 1, 2].map((index) => ({ ...lines, id: `lines${index}` }));
  const data = Object.fromEntries(tables.map((table) => [table.id, Array.from({ length: 70 }, () => ({ id: crypto.randomUUID(), values: { qty: 1 } }))]));
  assert.match(validateValues(schema(tables), data, false)._form, /200/);
  const field: LowcodeField = { id: "clock", label: "时间", type: "datetime", readOnly: true, defaultSource: "currentTime" };
  const time = "2026-09-10T00:00:00.000Z";
  assert.equal(resolveFieldRules(schema([field]), { clock: time }).values.clock, time);
});
