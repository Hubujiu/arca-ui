import { SelectEntry } from "@/components/controls";
import { PlusAction, TrashAction } from "@/shared/icons/motion";
import { Button } from "@/shared/ui";
import type { Directory } from "../organization/model";
import { defaultAppearance, type TableSchema } from "./field-model";
import { FieldRenderer } from "./FieldRenderer";
import type { TreeModel } from "./workflow-model";
import { lifecycleCompatible, lifecycleMappingIssues, lifecycleOutcomes, lifecycleReadableSource, lifecycleValueField, lifecycleWritable,
  type LifecycleMapping, type LifecycleMappings, type LifecycleOutcome } from "./workflow-lifecycle";

export function WorkflowLifecycleSettings({ tree, schema, directory, disabled = false, onChange }: {
  tree: TreeModel; schema: TableSchema; directory: Directory; disabled?: boolean; onChange: (value: LifecycleMappings | undefined) => void;
}) {
  const eligible = schema.fields.filter(lifecycleWritable), issues = lifecycleMappingIssues(tree, schema);
  function update(outcome: LifecycleOutcome, mappings: LifecycleMapping[]) {
    if (disabled) return;
    const next = { ...tree.lifecycleMappings };
    if (mappings.length) next[outcome] = mappings; else delete next[outcome];
    onChange(Object.keys(next).length ? next : undefined);
  }
  return <fieldset disabled={disabled} className="space-y-5" aria-label="流程结果字段映射">
    <p className="text-caption leading-6 text-muted-foreground">流程通过、拒绝或撤回时，按固定的流程配置回填选定字段；已被他人修改的字段保留现值并提示冲突。审批人编辑的字段在整个流程通过后回填。自动回填不会再次发起审批。</p>
    {(Object.entries(lifecycleOutcomes) as [LifecycleOutcome, string][]).map(([outcome, label]) => {
      const mappings = tree.lifecycleMappings?.[outcome] ?? [], remaining = eligible.filter(field => !mappings.some(mapping => mapping.fieldId === field.id));
      return <section key={outcome} className="space-y-3 rounded-card border border-border p-4" aria-label={`${label}字段映射`}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-body font-medium">{label}时 <span className="text-caption font-normal text-muted-foreground">{mappings.length} / 20</span></h3>
          <Button variant="outline" size="sm" disabled={disabled || !remaining.length || mappings.length >= 20} onClick={() => update(outcome, [...mappings, { fieldId: remaining[0].id, source: "FIXED", value: null }])}><PlusAction size={14} />添加{label}映射</Button></div>
        {!mappings.length && <p className="text-caption text-muted-foreground">{outcome === "APPROVED" ? "无额外映射；审批人实际编辑的字段仍在通过后回填。" : "无额外字段写入。"}</p>}
        {mappings.map((mapping, index) => {
          const target = schema.fields.find(field => field.id === mapping.fieldId);
          const sources = target ? schema.fields.filter(field => lifecycleReadableSource(tree, field) && lifecycleCompatible(target, field)) : [];
          const patch = (value: LifecycleMapping) => update(outcome, mappings.map((item, at) => index === at ? value : item));
          return <div key={`${outcome}-${index}`} className="space-y-3 border-t border-border pt-3">
            <div className="flex items-end gap-2"><label className="min-w-0 flex-1 space-y-1.5 text-caption"><span>目标字段</span>
              <SelectEntry className={""} aria-label={`${label}目标字段 ${index + 1}`} value={mapping.fieldId} onChange={event => patch({ fieldId: event.target.value, source: "FIXED", value: null })}>
                {!eligible.some(field => field.id === mapping.fieldId) && <option value={mapping.fieldId}>{target?.label ?? "字段已移除"}（不可映射）</option>}
                {eligible.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}
              </SelectEntry></label><Button variant="ghost" size="icon" aria-label={`删除${label}映射 ${index + 1}`} disabled={disabled} onClick={() => update(outcome, mappings.filter((_, at) => index !== at))}><TrashAction size={16} /></Button></div>
            <label className="block space-y-1.5 text-caption"><span>写入来源</span><SelectEntry className={""} aria-label={`${label}写入来源 ${index + 1}`} value={mapping.source}
              onChange={event => patch(event.target.value === "FIELD" ? { fieldId: mapping.fieldId, source: "FIELD", sourceFieldId: sources[0]?.id ?? "" } : { fieldId: mapping.fieldId, source: "FIXED", value: null })}>
              <option value="FIXED">固定值</option><option value="FIELD" disabled={!sources.length}>来源字段</option></SelectEntry></label>
            {mapping.source === "FIELD" ? <label className="block space-y-1.5 text-caption"><span>来源字段</span><SelectEntry className={""} aria-label={`${label}来源字段 ${index + 1}`} value={mapping.sourceFieldId} onChange={event => patch({ ...mapping, sourceFieldId: event.target.value })}>
              {!sources.some(field => field.id === mapping.sourceFieldId) && <option value={mapping.sourceFieldId}>请选择可见的兼容字段</option>}{sources.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}
            </SelectEntry><span className="block text-muted-foreground">读取本次结果映射前的内容，同批映射相互独立。</span></label> : target && <>
              <FieldRenderer schema={{ name: "", description: "", fields: [lifecycleValueField(target)], appearance: { ...defaultAppearance, columns: 1, density: "compact" } }}
                value={mapping.value === null ? {} : { [target.id]: mapping.value }} onChange={data => patch({ ...mapping, value: data[target.id] ?? null })} directory={directory} disabled={disabled} mode="edit" />
              <div className="flex items-center gap-3"><Button size="sm" variant="ghost" disabled={disabled || target.required} onClick={() => patch({ ...mapping, value: null })}>设为清空</Button><span className="text-caption text-muted-foreground">{mapping.value === null ? "当前配置：清空此字段" : "固定值按字段格式校验"}</span></div>
            </>}
          </div>;
        })}
      </section>;
    })}
    {!!issues.length && <p role="alert" className="text-caption text-destructive">{issues[0]}</p>}
    <p className="text-caption leading-6 text-muted-foreground">支持根层普通文本、数值、日期时间、选项和复选字段。只读、隐藏及条件显示字段不能作为目标；隐藏来源不能复制。文件、组织、关联记录和子表不参与此映射。任何校验失败会保留原流程状态。</p>
  </fieldset>;
}
