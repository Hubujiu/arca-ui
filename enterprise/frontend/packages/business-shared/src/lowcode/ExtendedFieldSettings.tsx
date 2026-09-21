import { Button, FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import { numericField } from "./calculations";
import { layoutField } from "./extended-fields";
import { RichTextField } from "./ExtendedFields";
import { FileField, type FileContext } from "./FileField";
import { controlClass, type LowcodeField } from "./field-model";
import { regions } from "./regions";

export function ExtendedFieldSettings({ field, fields, onChange, disabled, fileContext }: {
  field: LowcodeField; fields: LowcodeField[]; onChange: (patch: Partial<LowcodeField>) => void; disabled?: boolean; fileContext?: FileContext;
}) {
  if (field.type === "region") {
    const config = field.regionConfig ?? {};
    return <div className="space-y-3"><FieldSelect label="地区层级" value={String(config.depth ?? 3)} options={[{value:"1",label:"省份"},{value:"2",label:"省 / 市"},{value:"3",label:"省 / 市 / 区县"}]} onChange={(depth) => onChange({regionConfig:{...config,depth:Number(depth) as 1|2|3}})} />
      <Checkbox label="填写详细地址" checked={!!config.address} onCheckedChange={(address) => onChange({regionConfig:{...config,address:!!address,requireAddress:address ? config.requireAddress : false}})} />
      {config.address && <Checkbox label="详细地址必填" checked={!!config.requireAddress} onCheckedChange={(requireAddress) => onChange({regionConfig:{...config,requireAddress:!!requireAddress}})} />}
      <details><summary className="cursor-pointer text-body">限制省份（不选表示全部）</summary><div className="mt-3 grid max-h-56 gap-2 overflow-auto">{regions.map((node) => <Checkbox key={node.code} label={node.name} checked={config.provinceCodes?.includes(node.code) ?? false} onCheckedChange={(checked) => onChange({regionConfig:{...config,provinceCodes:checked ? [...(config.provinceCodes ?? []),node.code] : config.provinceCodes?.filter((code) => code !== node.code)}})} />)}</div></details>
      <p className="text-caption leading-5 text-muted-foreground">内置 2023 年省市区代码库，覆盖大陆 31 个省级地区；选择结果保留代码、名称和数据版本。</p></div>;
  }
  if (field.type === "remark") return <RichTextField id={`remark-${field.id}`} label="备注内容" value={field.richContent ?? ""} onChange={(richContent) => onChange({ richContent })} disabled={disabled} />;
  if (field.type === "displayImage") {
    const config = field.imageConfig ?? { fileIds: [] };
    return <div className="space-y-3"><p className="text-caption leading-5 text-muted-foreground">先保存包含此字段的表单草稿，再上传图片；上传完成后再次保存草稿。</p>
      <FileField id={`fixed-image-${field.id}`} field={field} value={config.fileIds} onChange={(fileIds) => onChange({ imageConfig: { ...config, fileIds } })} context={fileContext ? { ...fileContext, design: true } : undefined} disabled={disabled} />
      <FieldSelect label="图片布局" value={config.layout ?? "grid"} options={[{ value: "grid", label: "网格" }, { value: "row", label: "逐张展示" }]} onChange={(layout) => onChange({ imageConfig: { ...config, layout: layout as "grid" | "row" } })} />
      <Input label="宽度比例（%）" type="number" min={25} max={100} value={String(config.widthPercent ?? 100)} onChange={(next) => onChange({ imageConfig: { ...config, widthPercent: Number(next) } })} />
    </div>;
  }
  if (field.type === "chineseAmount") return <div className="space-y-3"><FieldSelect label="联动数值字段" value={field.amountConfig?.sourceFieldId ?? ""} options={fields.filter(numericField).map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(sourceFieldId) => onChange({ amountConfig: { ...field.amountConfig, sourceFieldId } })} /><FieldSelect label="金额单位" value={field.amountConfig?.unit ?? "元"} options={[{ value: "元", label: "元" }, { value: "圆", label: "圆" }]} onChange={(unit) => onChange({ amountConfig: { sourceFieldId: field.amountConfig?.sourceFieldId ?? "", unit: unit as "元" | "圆" } })} /><p className="text-caption text-muted-foreground">金额按四舍五入保留到分，由服务器重新计算；空来源保持空值。</p></div>;
  if (field.type === "location") {
    const bounds = field.locationConfig?.bounds;
    return <div className="space-y-3"><Checkbox label="限定坐标范围" checked={!!bounds} onCheckedChange={(checked) => onChange({ locationConfig: checked ? { bounds: { south: -90, north: 90, west: -180, east: 180 } } : {} })} />
      {bounds && ([['south', '最南纬度'], ['north', '最北纬度'], ['west', '最西经度'], ['east', '最东经度']] as const).map(([key, label]) => <Input key={key} label={label} type="number" step="any" value={String(bounds[key])} onChange={(next) => onChange({ locationConfig: { bounds: { ...bounds, [key]: Number(next) } } })} />)}
      <p className="text-caption leading-5 text-muted-foreground">填写人可输入坐标与位置说明，或点击获取当前位置。坐标范围由服务器校验。</p></div>;
  }
  if (layoutField(field)) {
    const config = field.layoutConfig ?? { sections: [] }, sections = config.sections;
    const update = (index: number, patch: Partial<typeof sections[number]>) => onChange({ layoutConfig: { ...config, sections: sections.map((section, i) => i === index ? { ...section, ...patch } : section) } });
    const taken = (id: string, sectionId: string) => fields.filter(layoutField).some((container) => container.layoutConfig?.sections.some((section) => !(container.id === field.id && section.id === sectionId) && section.fieldIds.includes(id)));
    return <div className="space-y-4">{field.type === "tabs" && <FieldSelect label="导航样式" value={config.style ?? "tabs"} options={[{ value: "tabs", label: "横向标签" }, { value: "navigation", label: "侧边导航" }]} onChange={(style) => onChange({ layoutConfig: { ...config, style: style as "tabs" | "navigation" } })} />}
      {sections.map((section, index) => <div key={section.id} className="space-y-3 rounded-card border border-border p-3"><Input label={`分区 ${index + 1} 名称`} maxLength={80} value={section.title} onChange={(title) => update(index, { title })} />
        {field.type === "collapse" && <Checkbox label="默认折叠" checked={!!section.collapsed} onCheckedChange={(collapsed) => update(index, { collapsed: !!collapsed })} />}
        <div className="max-h-56 space-y-2 overflow-auto"><p className="text-caption text-muted-foreground">选择此分区包含的字段</p>{fields.filter((entry) => !layoutField(entry)).map((entry) => <Checkbox key={entry.id} className="w-full" label={entry.label} disabled={disabled || taken(entry.id, section.id)} checked={section.fieldIds.includes(entry.id)} onCheckedChange={(checked) => update(index, { fieldIds: checked ? [...section.fieldIds, entry.id] : section.fieldIds.filter((id) => id !== entry.id) })} />)}</div>
        <Button variant="ghost" size="sm" disabled={disabled || sections.length <= 1} onClick={() => onChange({ layoutConfig: { ...config, sections: sections.filter((_, i) => i !== index) } })}>移除此分区</Button></div>)}
      <Button size="sm" variant="outline" disabled={disabled || sections.length >= 10} onClick={() => onChange({ layoutConfig: { ...config, sections: [...sections, { id: `s${crypto.randomUUID().replaceAll("-", "")}`, title: `分区 ${sections.length + 1}`, fieldIds: [], collapsed: false }] } })}>添加分区</Button>
      <p className={`${controlClass} !border-0 text-caption text-muted-foreground`}>字段以稳定标识归入分区，验证错误会自动展开。删除分区后字段恢复在表单中显示。</p>
    </div>;
  }
  return null;
}
