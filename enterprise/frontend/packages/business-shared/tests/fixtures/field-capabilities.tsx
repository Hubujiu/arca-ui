import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { Button } from "../../src/shared/ui";
import { defaultAppearance, initialValues, validateValues, type TableSchema } from "../../src/lowcode/field-model";
import type { Directory } from "../../src/organization/model";

const departmentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", positionId = "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const directory: Directory = { units: [{ id: departmentId, name: "研发部", kind: "DEPARTMENT" }, { id: "eeeeeeee-bbbb-4ccc-8ddd-eeeeeeeeeeee", name: "测试公司", kind: "COMPANY" }], positions: [{ id: positionId, name: "工程师" }], people: [{ id: "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee", displayName: "张三", username: "zhang", enabled: true, systemRole: "USER", orgUnitId: departmentId, positionId }] };
const initial: TableSchema = { name: "字段能力验收", description: "新建、修改、详情与文件上下文检查", schemaVersion: 2, appearance: { ...defaultAppearance, columns: 2 }, fields: [
  { id: "time", type: "time", label: "预约时间", timePrecision: "second", required: true, defaultSource: "currentTime" },
  { id: "rating", type: "rating", label: "服务评分", required: true, ratingMax: 7 },
  { id: "cost", type: "number", label: "费用", numericConfig: { decimalPlaces: 2, thousandsSeparator: true, unit: "元" }, defaultValue: 1234.5 },
  { id: "progress", type: "progress", label: "完成进度", numericConfig: { decimalPlaces: 1, unit: "%" } },
  { id: "department", type: "department", label: "所属部门" }, { id: "departments", type: "departments", label: "协作部门" },
  { id: "position", type: "position", label: "岗位" }, { id: "positions", type: "positions", label: "协作岗位" },
  { id: "member", type: "member", label: "处理人员", selectionScope: { departmentIds: [departmentId], positionIds: [positionId] } },
  { id: "stage", type: "select", label: "阶段", options: ["待开始", "进行中", "已完成"], width: 9, choiceConfig: { style: "stages", colors: { "待开始": "#64748b", "进行中": "#2563eb", "已完成": "#059669" } } },
  { id: "tags", type: "multiselect", label: "标签", options: ["重要", "紧急"], width: 8, choiceConfig: { style: "vertical", colors: { "重要": "#d97706", "紧急": "#dc2626" } } },
  { id: "tip", type: "text", label: "附加说明", help: "只填写与本次申请相关的信息", helpDisplay: "tooltip", designNote: "维护人员专用备注" },
  { id: "editOnly", type: "text", label: "修改专用字段", visibility: "createHidden", defaultValue: "原始值" },
  { id: "always", type: "text", label: "始终隐藏字段", visibility: "alwaysHidden", defaultValue: "内部值" },
  { id: "legacy", type: "text", label: "旧隐藏字段", hidden: true, defaultValue: "旧值" },
  { id: "image", type: "image", label: "现场图片", fileConfig: { maxFiles: 2, maxSizeMb: 1 }, width: 6 },
  { id: "attachment", type: "attachment", label: "申请附件", fileConfig: { maxFiles: 2, maxSizeMb: 1, accept: [".pdf", ".txt"] }, width: 6 },
  { id: "serial", type: "serial", label: "流水编号", codeTemplate: "SQ-{YYYY}{MM}-{SEQ:6}", sequenceReset: "month" },
  { id: "signature", type: "signature", label: "签字", signatureHeight: 240, width: 12 },
] };
function Fixture() {
  const [schema, setSchema] = useState(initial), [value, setValue] = useState(initialValues(initial));
  const [mode, setMode] = useState<"create" | "edit">("create"), [readOnly, setReadOnly] = useState(false), [designer, setDesigner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const context = new URLSearchParams(window.location.search).has("fileContext") ? { tableId: "dddddddd-bbbb-4ccc-8ddd-eeeeeeeeeeee" } : undefined;
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <nav className="flex flex-wrap gap-2"><Button onClick={() => setMode(mode === "create" ? "edit" : "create")}>当前：{mode === "create" ? "新建" : "修改"}</Button><Button onClick={() => setReadOnly(!readOnly)}>{readOnly ? "返回填写" : "查看详情"}</Button><Button onClick={() => setDesigner(!designer)}>{designer ? "返回表单" : "打开设计器"}</Button></nav>
    {designer ? <FieldDesigner value={schema} onChange={setSchema} directory={directory} /> : <FieldRenderer schema={schema} value={value} onChange={setValue} directory={directory} mode={mode} readOnly={readOnly} errors={errors} fileContext={context} />}
    <Button onClick={() => setErrors(validateValues(schema, value))}>校验填写</Button>
    <pre data-testid="values" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    <pre data-testid="errors" className="text-xs">{JSON.stringify(errors)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
