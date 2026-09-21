import { FieldSelect } from "@/shared/ui";
import type { Directory } from "@/organization/model";
import type { LowcodeField } from "./field-model";
import { numericField } from "./calculations";
import { CalculationEditor, initialExpression } from "./CalculationEditor";
import { RelationSettings } from "./RelationSettings";
import { compatibleDefault, defaultConfigIssues, supportsFieldDefault, type DefaultConfig } from "./field-defaults";

export function DefaultFieldSettings({ field, fields, disabled, onChange }: { field: LowcodeField; fields: LowcodeField[]; directory: Directory; disabled: boolean; onChange: (patch: Partial<LowcodeField>) => void }) {
  if (!supportsFieldDefault(field)) return null;
  const formulaType=numericField(field)?"number":["text","textarea"].includes(field.type)?"text":field.type==="date"?"date":undefined;
  const config = field.defaultConfig, copies = fields.filter(source => source.id !== field.id && compatibleDefault(field, source));
  const departments = fields.filter(source => ["department", "departments"].includes(source.type));
  const positions = fields.filter(source => ["position", "positions"].includes(source.type));
  const update = (defaultConfig?: DefaultConfig) => onChange({ defaultConfig, defaultValue: undefined, defaultSource: undefined });
  const issue = defaultConfigIssues(field, fields)[0];
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-border pt-4">
    <h3 className="text-caption font-semibold text-muted-foreground">默认值联动</h3>
    <FieldSelect label="初始化方式" value={config?.source ?? ""} options={[
      { value: "", label: "使用下方默认内容" }, { value: "FIELD", label: "引用同层字段" },
      ...(formulaType ? [{ value: "FORMULA", label: "计算公式" }] : []),
      ...(numericField(field) || ["text", "textarea"].includes(field.type) ? [{ value: "LOOKUP", label: "查询已选关联记录" }] : []),
      ...(["member", "members"].includes(field.type) ? [{ value: "DEPARTMENT_MEMBERS", label: "部门成员" }, { value: "DEPARTMENT_LEADER", label: "部门负责人" }, { value: "POSITION_MEMBERS", label: "岗位成员" }] : []),
      ...(["department", "departments"].includes(field.type) ? [{ value: "INITIATOR_DEPARTMENT", label: "发起人所属部门" }] : []),
    ]} onChange={source => {
      if (!source) update();
      else if (source === "FIELD") update({ source, fieldId: copies[0]?.id ?? "" });
      else if (source === "FORMULA") update({ source, formulaConfig: { resultType:formulaType??"number",expression:initialExpression(formulaType??"number") } });
      else if (source === "LOOKUP") update({ source, lookupConfig: { relationFieldId: fields.find(source => source.type === "relation" && !source.relationConfig?.multiple)?.id ?? "", targetFieldId: "", resultType: numericField(field) ? "number" : "text" } });
      else if (source === "INITIATOR_DEPARTMENT") update({ source });
      else if (source === "POSITION_MEMBERS") update({ source, positionFieldId: positions[0]?.id ?? "" });
      else update({ source: source as "DEPARTMENT_MEMBERS" | "DEPARTMENT_LEADER", departmentFieldId: departments[0]?.id ?? "" });
    }} />
    {config?.source === "FIELD" && <FieldSelect label="默认值来源字段" value={config.fieldId} options={copies.map(source => ({ value: source.id, label: source.label }))} onChange={fieldId => update({ source: "FIELD", fieldId })} />}
    {config?.source === "FORMULA" && <CalculationEditor allowedResultTypes={[formulaType??"number"]} field={{ ...field, type: "formula", formulaConfig: config.formulaConfig }} fields={fields} disabled={disabled} onChange={patch => { if (patch.formulaConfig) update({ source: "FORMULA", formulaConfig: patch.formulaConfig }); }} />}
    {config?.source === "LOOKUP" && <RelationSettings field={{ ...field, type: "lookup", lookupConfig: config.lookupConfig }} fields={fields} disabled={disabled} onChange={patch => { if (patch.lookupConfig) update({ source: "LOOKUP", lookupConfig: { ...patch.lookupConfig, resultType: numericField(field) ? "number" : "text" } }); }} />}
    {(config?.source === "DEPARTMENT_MEMBERS" || config?.source === "DEPARTMENT_LEADER") && <><FieldSelect label="部门来源字段" value={config.departmentFieldId} options={departments.map(source => ({ value: source.id, label: source.label }))} onChange={departmentFieldId => update({ ...config, departmentFieldId })} /><p className="text-caption leading-5 text-muted-foreground">包含下级小组中已启用且可登录的成员，最多二十人。单成员字段仅在结果恰好一人时填入；负责人使用组织中明确设置的负责人。</p></>}
    {issue && <p role="alert" className="text-caption text-destructive">{issue}</p>}
    {config?.source === "POSITION_MEMBERS" && <><FieldSelect label="岗位来源字段" value={config.positionFieldId} options={positions.map(source=>({value:source.id,label:source.label}))} onChange={positionFieldId=>update({...config,positionFieldId})}/><p className="text-caption leading-5 text-muted-foreground">从组织通讯录读取所选岗位中已启用且可登录的成员，合并去重，最多二十人。单成员字段找到多位成员时会报错；没有成员时保留为空。</p></>}
    <p className="text-caption leading-5 text-muted-foreground">仅新建时初始化空白字段一次；已填写或主动清空的内容保留。保存草稿后和修改已有记录时不再计算。关联查询需要本人有权读取目标记录。</p>
  </fieldset>;
}
