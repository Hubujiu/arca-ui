import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { Button } from "../../src/shared/ui";
import { defaultAppearance, validateValues, type TableSchema } from "../../src/lowcode/field-model";
const original = { enabled: true, note: "已保存说明", amount: 100, limit: 200, start: "2026-09-10", end: "2026-09-11" };
const initial: TableSchema = { name: "条件规则验收", description: "隐藏恢复快照、条件必填、警告与跨字段提交检查", appearance: defaultAppearance, fields: [
  { id: "enabled", label: "启用补充说明", type: "checkbox" },
  { id: "note", label: "补充说明", type: "text", visibleWhen: { fieldId: "enabled", operator: "EQ", value: true }, required: true },
  { id: "downstream", label: "原始说明触发的下游", type: "text", visibleWhen: { fieldId: "note", operator: "EQ", value: "已保存说明" } },
  { id: "amount", label: "申请金额", type: "number", warningRules: [{ id: "large", condition: { fieldId: "amount", operator: "GT", value: 1000 }, message: "金额较大，请核对预算", color: "amber" }] },
  { id: "limit", label: "预算上限", type: "number" },
  { id: "reason", label: "超预算原因", type: "text", requiredWhen: { operator: "AND", conditions: [{ fieldId: "enabled", operator: "EQ", value: true }, { fieldId: "amount", operator: "GT", valueFieldId: "limit" }] } },
  { id: "start", label: "开始日期", type: "date" }, { id: "end", label: "结束日期", type: "date" },
], validationRules: [{ id: "dateOrder", condition: { fieldId: "end", operator: "GTE", valueFieldId: "start" }, fieldId: "end", message: "结束日期不能早于开始日期" }, { id: "budget", when: { fieldId: "enabled", operator: "EQ", value: false }, condition: { fieldId: "amount", operator: "LTE", valueFieldId: "limit" }, fieldId: "amount", message: "未启用说明时不能超过预算" }] };
function Fixture() {
  const [schema, setSchema] = useState(initial), [values, setValues] = useState<Record<string, unknown>>({ ...original }), [errors, setErrors] = useState<Record<string, string>>({}), [designer, setDesigner] = useState(false);
  return <main className="mx-auto max-w-6xl space-y-5 p-6"><Button onClick={() => setDesigner(!designer)}>{designer ? "返回填写" : "打开设计器"}</Button>
    {designer ? <FieldDesigner value={schema} onChange={setSchema} directory={{ units: [], positions: [], people: [] }} /> : <FieldRenderer schema={schema} value={values} originalValue={original} onChange={setValues} directory={{ units: [], positions: [], people: [] }} errors={errors} mode="edit" />}
    <div className="flex gap-3"><Button onClick={() => setErrors(validateValues(schema, values, true, { mode: "edit", existing: original }))}>完整提交</Button><Button variant="outline" onClick={() => setErrors(validateValues(schema, values, false, { mode: "edit", existing: original }))}>保存草稿</Button></div>
    <pre data-testid="values" className="overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(values, null, 2)}</pre><pre data-testid="errors" className="text-xs">{JSON.stringify(errors)}</pre>
  </main>;
}
const root = createRoot(document.getElementById("root")!); root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
