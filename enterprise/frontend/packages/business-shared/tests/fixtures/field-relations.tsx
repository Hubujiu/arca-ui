import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { Button } from "../../src/shared/ui";
import { defaultAppearance, validateValues, type LowcodeField, type TableSchema } from "../../src/lowcode/field-model";
const tableId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const records = Array.from({ length: 55 }, (_, index) => ({ id: `11111111-2222-4333-8444-${String(index + 1).padStart(12, "0")}`, label: `商品 ${String(index + 1).padStart(2, "0")}`, price: index + 1.005 }));
let unavailable = false;
const realFetch = window.fetch;
window.fetch = async (input, init) => {
  const path = String(input), body = typeof init?.body === "string" ? JSON.parse(init.body) : {}, json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
  if (path === "/api/v1/me") return json({ id: records[0].id, displayName: "预览用户" });
  if (path === "/api/v1/lc/relation-tables") return json([{ id: tableId, appId: tableId, appName: "预览应用", name: "商品目录", fields: [{ id: "name", label: "名称", type: "text" }, { id: "price", label: "单价", type: "number" }] }]);
  if (path === "/api/v1/lc/relation-records/search") {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const found = records.filter((record) => !(unavailable && record.id === records[0].id) && (body.ids ? body.ids.includes(record.id) : record.label.includes(body.q ?? ""))), offset = body.offset ?? 0;
    return json({ items: (body.ids ? found : found.slice(offset, offset + 20)).map(({ id, label }) => ({ id, label })), offset, hasMore: !body.ids && found.length > offset + 20 });
  }
  if (path === "/api/v1/lc/relation-records/lookup") {
    await new Promise((resolve) => setTimeout(resolve, body.recordId === records[0].id ? 900 : 120)); // deliberately resolves even after abort to exercise stale-response guards
    const record = records.find((record) => record.id === body.recordId);
    if (!record || unavailable && record.id === records[0].id) return json({ message: "目标记录不可用" }, 403);
    return json({ value: body.resultType === "number" ? record.price : record.label });
  }
  return realFetch(input, init);
};
const relation: LowcodeField = { id: "product", label: "商品", type: "relation", relationConfig: { tableId, titleFieldId: "name" }, width: 12 };
const lookup: LowcodeField = { id: "price", label: "查询单价", type: "lookup", lookupConfig: { relationFieldId: "product", targetFieldId: "price", resultType: "number" }, numericConfig: { decimalPlaces: 2, unit: "元" } };
const formula: LowcodeField = { id: "amount", label: "三件金额", type: "formula", formulaConfig: { expression: { op: "MUL", left: { op: "FIELD", fieldId: "price" }, right: { op: "CONST", value: 3 } } } };
const initial: TableSchema = { name: "关联与查询验收", description: "此页面使用内存模拟授权记录，只用于接口与竞态验收。", appearance: defaultAppearance, fields: [relation, lookup, formula, { id: "large", label: "金额超过 20 时填写", type: "text", visibleWhen: { fieldId: "amount", operator: "GT", value: 20 } }, { ...relation, id: "related", label: "多条关联", relationConfig: { tableId, multiple: true, maxRecords: 50 } }, { id: "items", label: "明细商品", type: "subtable", width: 12, subtableConfig: { fields: [relation, lookup, formula] } }] };
function Fixture() {
  const [schema, setSchema] = useState(initial), [values, setValues] = useState<Record<string, unknown>>({}), [errors, setErrors] = useState<Record<string, string>>({}), [designer, setDesigner] = useState(false), [readOnly, setReadOnly] = useState(false), [resolving, setResolving] = useState(false);
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6"><div className="flex flex-wrap gap-3"><Button onClick={() => setDesigner(!designer)}>{designer ? "返回填写" : "打开设计器"}</Button><Button variant="outline" onClick={() => setReadOnly(!readOnly)}>{readOnly ? "返回编辑" : "查看快照"}</Button><Button variant="outline" onClick={() => { unavailable = !unavailable; window.dispatchEvent(new Event("focus")); }}>切换首条记录权限</Button><Button variant="outline" onClick={() => setValues({ product: [records[0].id], price: 999, amount: 2997 })}>快速选首条</Button><Button variant="outline" onClick={() => setValues({ product: [records[1].id], price: 999, amount: 2997 })}>快速选第二条</Button><Button variant="outline" onClick={() => setValues({ related: records.slice(0, 50).map((record) => record.id) })}>回显 50 条</Button></div>
    {designer ? <FieldDesigner value={schema} onChange={setSchema} directory={{ units: [], positions: [], people: [] }} /> : <FieldRenderer schema={schema} value={values} onChange={setValues} directory={{ units: [], positions: [], people: [] }} errors={errors} mode="edit" readOnly={readOnly} onResolvingChange={setResolving} />}
    <Button disabled={resolving} onClick={() => setErrors(validateValues(schema, values))}>{resolving ? "正在查询" : "校验填写"}</Button><pre data-testid="values" className="overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(values, null, 2)}</pre><pre data-testid="errors" className="text-xs">{JSON.stringify(errors)}</pre>
  </main>;
}
const root = createRoot(document.getElementById("root")!); root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => { root.unmount(); window.fetch = realFetch; });
