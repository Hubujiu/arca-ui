import { MultilineEntry } from "@/components/controls";
import {AdvancedFieldSettings} from "./AdvancedFieldSettings";
import { DefaultFieldSettings } from "./DefaultFieldSettings";
import { FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import type { Directory } from "@/organization/model";
import { isDecoration, isIdentifier, safeImageExtensions, type LowcodeField } from "./field-model";
import { FieldRuleSettings } from "./RuleSettings";
import { CalculationEditor } from "./CalculationEditor";
import { SubtableEditor } from "./SubtableEditor";
import { computedField, numericField } from "./calculations";
import { RelationSettings } from "./RelationSettings";

export function FieldExtras({ field, fields, onChange, directory, disabled, nested = false }: { field: LowcodeField; fields: LowcodeField[]; onChange: (patch: Partial<LowcodeField>) => void; directory: Directory; disabled: boolean; nested?: boolean }) {
  return <>
    <AdvancedFieldSettings field={field} onChange={onChange} disabled={disabled} />
    <DefaultFieldSettings field={field} fields={fields} onChange={onChange} directory={directory} disabled={disabled} />
    {field.type === "subtable" && <SubtableEditor field={field} onChange={onChange} directory={directory} disabled={disabled} />}
    {["formula", "summary"].includes(field.type) && <CalculationEditor field={field} fields={fields} onChange={onChange} disabled={disabled} />}
    {["relation", "lookup", "queryTable"].includes(field.type) && <RelationSettings field={field} fields={fields} onChange={onChange} disabled={disabled} />}
    {!isDecoration(field) && <FieldRuleSettings field={field} fields={fields} onChange={onChange} directory={directory} disabled={disabled} />}
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-caption font-semibold text-muted-foreground">说明与显示</h3>
      <FieldSelect label="说明显示方式" value={field.helpDisplay ?? "inline"} options={[{ value: "inline", label: "直接显示" }, { value: "tooltip", label: "提示图标" }]} onChange={(helpDisplay) => onChange({ helpDisplay: helpDisplay as LowcodeField["helpDisplay"] })} />
      {!isDecoration(field) && <FieldSelect label="字段可见性" value={field.visibility ?? "visible"} options={[{ value: "visible", label: "正常显示" }, { value: "createHidden", label: "新建时隐藏，修改时显示" }, { value: "alwaysHidden", label: "填写与详情均隐藏" }]} onChange={(visibility) => onChange({ visibility: visibility as LowcodeField["visibility"] })} />}
      <label className="block space-y-1.5 text-body font-medium">设计备注<MultilineEntry rows={3} maxLength={2000} className={`${""} `} value={field.designNote ?? ""} onChange={(event) => onChange({ designNote: event.target.value })} /></label>
      <p className="text-caption leading-5 text-muted-foreground">设计备注仅供维护表单时查看。显示规则不会限制数据读取权限。</p>
      {!nested && ["text", "email", "phone", "idCard", "number"].includes(field.type) && <><Checkbox checked={!!field.unique} onCheckedChange={(unique) => onChange({ unique })} label="值不可重复" disabled={disabled} /><p className="text-caption leading-5 text-muted-foreground">保存时检查同一张表的其他记录；空值不参与检查。</p></>}
    </section>
    {numericField(field) && !isIdentifier(field) && <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-caption font-semibold text-muted-foreground">数字显示</h3>
      <FieldSelect label="小数位数" value={field.numericConfig?.decimalPlaces === undefined ? "auto" : String(field.numericConfig.decimalPlaces)} options={[{ value: "auto", label: computedField(field) ? "默认 2 位" : "沿用输入格式" }, ...Array.from({ length: 9 }, (_, index) => ({ value: String(index), label: `${index} 位` }))]} onChange={(next) => {
        const config = { ...field.numericConfig };
        if (next === "auto") delete config.decimalPlaces; else config.decimalPlaces = Number(next);
        onChange({ numericConfig: config });
      }} />
      <Input label="单位" value={field.numericConfig?.unit ?? ""} maxLength={24} placeholder={field.type === "progress" || field.format === "percent" ? "%" : "例如：元、小时、件"} onChange={(unit) => onChange({ numericConfig: { ...field.numericConfig, unit } })} />
      <Checkbox checked={!!field.numericConfig?.thousandsSeparator} onCheckedChange={(thousandsSeparator) => onChange({ numericConfig: { ...field.numericConfig, thousandsSeparator } })} label="使用千分位分隔" disabled={disabled} />
      <p className="text-caption leading-5 text-muted-foreground">{computedField(field) ? "计算结果按指定小数位四舍五入，默认保留 2 位。" : "限制可保存的小数位数；整数、金额和评分仍遵守各自的精度限制。"}</p>
    </section>}
    {field.type === "time" && <section className="space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">时间精度</h3><FieldSelect label="精度" value={field.timePrecision ?? "minute"} options={[{ value: "minute", label: "时、分" }, { value: "second", label: "时、分、秒" }]} onChange={(timePrecision) => onChange({ timePrecision: timePrecision as LowcodeField["timePrecision"], defaultValue: undefined })} /></section>}
    {field.type === "rating" && <Input label="评分上限" type="number" min={1} max={10} step={1} value={String(field.ratingMax ?? 5)} onChange={(value) => { if (value && Number.isInteger(Number(value))) onChange({ ratingMax: Math.min(10, Math.max(1, Number(value))) }); }} />}
    {field.type === "signature" && <Input label="手写区域高度（像素）" type="number" min={120} max={600} step={10} value={String(field.signatureHeight ?? 180)} onChange={(value) => { if (value && Number.isInteger(Number(value))) onChange({ signatureHeight: Math.min(600, Math.max(120, Number(value))) }); }} />}
    {["select", "multiselect"].includes(field.type) && <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-caption font-semibold text-muted-foreground">选项外观</h3>
      <FieldSelect label="显示方式" value={field.choiceConfig?.style ?? "dropdown"} options={[{ value: "dropdown", label: "下拉选择" }, { value: "horizontal", label: "横向排列" }, { value: "vertical", label: "纵向排列" }, ...(field.type === "select" ? [{ value: "stages", label: "阶段样式" }] : [])]} onChange={(style) => onChange({ choiceConfig: { ...field.choiceConfig, style: style as NonNullable<LowcodeField["choiceConfig"]>["style"] } })} />
    </section>}
    {field.type === "serial" && <FieldSelect label="流水号重置周期" value={field.sequenceReset ?? "never"} options={[{ value: "never", label: "不重置" }, { value: "year", label: "每年重置" }, { value: "month", label: "每月重置" }, { value: "day", label: "每天重置" }]} onChange={(sequenceReset) => onChange({ sequenceReset: sequenceReset as LowcodeField["sequenceReset"] })} />}
    {["image", "attachment"].includes(field.type) && <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-caption font-semibold text-muted-foreground">文件限制</h3>
      <Input label="最多文件数" type="number" min={1} max={20} step={1} value={String(field.fileConfig?.maxFiles ?? 10)} onChange={(next) => { if (next && Number.isInteger(Number(next))) onChange({ fileConfig: { ...field.fileConfig, maxFiles: Math.min(20, Math.max(1, Number(next))) } }); }} />
      <Input label="单个文件大小（MB）" type="number" min={1} max={50} step={1} value={String(field.fileConfig?.maxSizeMb ?? 10)} onChange={(next) => { if (next && Number.isInteger(Number(next))) onChange({ fileConfig: { ...field.fileConfig, maxSizeMb: Math.min(50, Math.max(1, Number(next))) } }); }} />
      <Input label="允许扩展名（逗号分隔）" value={(field.fileConfig?.accept ?? []).join(",")} placeholder={field.type === "image" ? safeImageExtensions.join(",") : "例如 .pdf,.docx；留空不限制扩展名"} onChange={(next) => onChange({ fileConfig: { ...field.fileConfig, accept: next ? next.split(/[,，]/).map((part) => part.trim().toLowerCase()) : [] } })} />
      {field.type === "image" && <p className="text-caption leading-5 text-muted-foreground">图片支持 PNG、JPG、JPEG、WebP 和 GIF。</p>}
    </section>}
    {["member", "members"].includes(field.type) && <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-caption font-semibold text-muted-foreground">可选成员范围</h3>
      <p className="text-caption leading-5 text-muted-foreground">不勾选表示不限制；同时配置部门和岗位时，成员必须满足两项条件。部门按成员直属部门匹配。</p>
      {(["departmentIds", "positionIds"] as const).map((key) => <fieldset key={key} className="space-y-2"><legend className="mb-2 text-caption font-medium">{key === "departmentIds" ? "部门" : "岗位"}</legend>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-control border border-border p-2">
          {(key === "departmentIds" ? directory.units.filter((unit) => unit.kind === "DEPARTMENT") : directory.positions).map((entry) => <Checkbox key={entry.id} checked={field.selectionScope?.[key]?.includes(entry.id) ?? false} disabled={disabled} label={entry.name} onCheckedChange={(checked) => onChange({ selectionScope: { ...field.selectionScope, [key]: checked ? [...field.selectionScope?.[key] ?? [], entry.id] : field.selectionScope?.[key]?.filter((id) => id !== entry.id) ?? [] } })} />)}
        </div>
      </fieldset>)}
    </section>}
  </>;
}
