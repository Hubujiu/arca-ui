import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { AppModal, Button } from "../../src/shared/ui";
import { initialValues, defaultAppearance, validateValues, type TableSchema } from "../../src/lowcode/field-model";
const user = { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", displayName: "测试发起人" };
const directory = { units: [], positions: [], people: [{ ...user, username: "fixture", enabled: true, systemRole: "USER" as const }] };
const initial: TableSchema = { name: "新增目标", description: "填写年度目标与关键结果", appearance: { ...defaultAppearance, columns: 4 }, fields: [
  { id: "base", label: "基本信息", type: "heading" },
  { id: "year", label: "年度", type: "number", width: 3, defaultSource: "currentYear", required: true },
  { id: "period", label: "周期", type: "text", width: 3, defaultValue: "第三季度" },
  { id: "owner", label: "负责人", type: "member", width: 3, readOnly: true, defaultSource: "initiator" },
  { id: "hidden", label: "内部来源", type: "text", width: 3, hidden: true, defaultValue: "表单" },
  { id: "date", label: "发起日期", type: "date", width: 3, readOnly: true, defaultSource: "currentDate" },
  { id: "section", label: "目标设置", type: "heading" },
  { id: "goal", label: "目标", type: "text", width: 9, required: true },
  { id: "score", label: "得分", type: "number", width: 3, format: "integer" },
  { id: "verify", label: "登记信息", type: "heading" },
  { id: "idCard", label: "身份证", type: "idCard", width: 6 },
  { id: "code", label: "数字编号", type: "number", width: 3, format: "digits" },
  { id: "money", label: "预算", type: "number", width: 3, format: "currency" },
  { id: "serial", label: "申请编号", type: "serial", width: 6, required: true, codeTemplate: "SQ-{YYYY}{MM}{DD}-{HH}{mm}{ss}-{RAND:8}" },
  { id: "sign", label: "申请人签名", type: "signature", width: 12, required: true },
] };
function Fixture() {
  const [schema, setSchema] = useState(initial), [values, setValues] = useState(initialValues(initial, user));
  const [open, setOpen] = useState(true), [readOnly, setReadOnly] = useState(false), [designer, setDesigner] = useState(false), [errors, setErrors] = useState<Record<string, string>>({});
  return <main className="p-5"><Button onClick={() => setOpen(true)}>打开填写窗口</Button><Button onClick={() => setDesigner(!designer)}>设计器</Button>
    {designer && <FieldDesigner value={schema} onChange={setSchema} directory={directory} />}
    <AppModal open={open} onOpenChange={setOpen} title="新增目标" className="max-w-7xl" bodyClassName="max-h-[70dvh]" footer={<><Button onClick={() => setReadOnly(!readOnly)}>切换详情</Button><Button onClick={() => setErrors(validateValues(schema, values))}>提交</Button></>}>
      <FieldRenderer schema={schema} value={values} onChange={setValues} directory={directory} readOnly={readOnly} errors={errors} />
    </AppModal><pre className="max-w-full whitespace-pre-wrap break-all" data-testid="values">{JSON.stringify(values)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
