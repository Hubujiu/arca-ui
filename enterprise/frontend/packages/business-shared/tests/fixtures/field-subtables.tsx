import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { Button } from "../../src/shared/ui";
import { defaultAppearance, validateValues, type TableSchema } from "../../src/lowcode/field-model";
const firstId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", secondId = "11111111-2222-4333-8444-555555555555";
const original = { show: true, budget: 100, lines: [{ id: firstId, values: { title: "第一笔", qty: 2, price: 0.1, subtotal: 0.2 } }, { id: secondId, values: { title: "第二笔", qty: 3, price: 0.2, subtotal: 0.6 } }], total: 0.8, amount: 0.88 };
const initial: TableSchema = { name: "明细与计算验收", description: "稳定行号、隐藏恢复、公式与汇总", appearance: defaultAppearance, fields: [
  { id: "show", label: "显示明细", type: "checkbox" },
  { id: "budget", label: "预算上限", type: "number" },
  { id: "lines", label: "费用明细", type: "subtable", width: 12, visibleWhen: { fieldId: "show", operator: "EQ", value: true }, subtableConfig: { minRows: 1, maxRows: 5, fields: [
    { id: "title", label: "费用名称", type: "text", required: true, width: 12 },
    { id: "qty", label: "数量", type: "number", defaultValue: 1, required: true, width: 6 },
    { id: "price", label: "单价", type: "number", defaultValue: 0.1, required: true, width: 6, visibleWhen: { fieldId: "qty", operator: "GT", value: 0 } },
    { id: "subtotal", label: "小计", type: "formula", readOnly: true, formulaConfig: { expression: { op: "MUL", left: { op: "FIELD", fieldId: "qty" }, right: { op: "FIELD", fieldId: "price" } } }, numericConfig: { decimalPlaces: 2, unit: "元" }, width: 6 },
    { id: "receipt", label: "凭证", type: "attachment", fileConfig: { maxFiles: 3, maxSizeMb: 10 }, width: 12 },
  ], validationRules: [{ id: "positive", fieldId: "qty", condition: { fieldId: "qty", operator: "GT", value: 0 }, message: "数量应大于零" }] } },
  { id: "total", label: "明细合计", type: "summary", summaryConfig: { subtableId: "lines", operation: "SUM", fieldId: "subtotal" }, numericConfig: { decimalPlaces: 2, unit: "元" } },
  { id: "amount", label: "含服务费总额", type: "formula", formulaConfig: { expression: { op: "MUL", left: { op: "FIELD", fieldId: "total" }, right: { op: "CONST", value: 1.1 } } }, numericConfig: { decimalPlaces: 2, unit: "元", thousandsSeparator: true } },
  { id: "reason", label: "超预算原因", type: "textarea", requiredWhen: { fieldId: "amount", operator: "GT", valueFieldId: "budget" } },
] };
function Fixture() {
  const [schema, setSchema] = useState(initial), [values, setValues] = useState<Record<string, unknown>>(original), [errors, setErrors] = useState<Record<string, string>>({}), [designer, setDesigner] = useState(false), [readOnly, setReadOnly] = useState(false), [uploading, setUploading] = useState(false);
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6"><div className="flex flex-wrap gap-3"><Button onClick={() => setDesigner(!designer)}>{designer ? "返回填写" : "打开设计器"}</Button><Button variant="outline" onClick={() => setReadOnly(!readOnly)}>{readOnly ? "返回编辑" : "查看快照"}</Button></div>
    {designer ? <FieldDesigner value={schema} onChange={setSchema} directory={{ units: [], positions: [], people: [] }} /> : <FieldRenderer schema={schema} value={values} originalValue={original} onChange={setValues} directory={{ units: [], positions: [], people: [] }} errors={errors} mode="edit" readOnly={readOnly} onUploadingChange={setUploading} />}
    <div className="flex flex-wrap gap-3"><Button disabled={uploading} onClick={() => setErrors(validateValues(schema, values, true, { mode: "edit", existing: original }))}>完整提交</Button><Button variant="outline" disabled={uploading} onClick={() => setErrors(validateValues(schema, values, false, { mode: "edit", existing: original }))}>保存草稿</Button></div>
    <pre data-testid="values" className="overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(values, null, 2)}</pre><pre data-testid="errors" className="text-xs">{JSON.stringify(errors)}</pre>
  </main>;
}
const root = createRoot(document.getElementById("root")!); root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
