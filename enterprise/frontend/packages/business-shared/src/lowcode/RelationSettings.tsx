import { RelationFilterEditor } from "./RelationFilterEditor";
import { RelationTargetSettings } from "./RelationTargetSettings";
import { FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import type { LowcodeField } from "./field-model";
import { useLoad } from "./model";
import { lookupNumberSource, lookupTextSource, relationTargets, type RelationTable } from "./relations";

export function RelationSettings({ field, fields, onChange, disabled }: { field: LowcodeField; fields: LowcodeField[]; onChange: (patch: Partial<LowcodeField>) => void; disabled: boolean }) {
  const tables = useLoad<RelationTable[]>("/api/v1/lc/relation-tables");
  const choices = tables.data ?? [];
  if(field.type==="queryTable") {
    const config=field.queryConfig??{tableId:"",columnIds:[],pageSize:10},table=choices.find(entry=>entry.id.toLowerCase()===config.tableId.toLowerCase());
    const columns=table?.fields.filter(entry=>lookupNumberSource(entry)||lookupTextSource(entry))??[];
    const range=config.backReferenceFieldId?`reverse:${config.backReferenceFieldId}`:config.relationFieldId?`selected:${config.relationFieldId}`:"";
    return <fieldset disabled={disabled} className="space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">查询表配置</h3>
      <FieldSelect label="查询数据表" value={config.tableId} options={choices.map(entry=>({value:entry.id,label:`${entry.appName} · ${entry.name}`}))} onChange={tableId=>onChange({queryConfig:{tableId,columnIds:[],pageSize:10}})}/>
      <div className="space-y-2"><p className="text-caption text-muted-foreground">显示列（最多八列）</p>{columns.map(entry=><Checkbox key={entry.id} className="w-full" label={entry.label} checked={config.columnIds.includes(entry.id)} disabled={disabled||config.columnIds.length>=8&&!config.columnIds.includes(entry.id)} onCheckedChange={checked=>onChange({queryConfig:{...config,columnIds:checked?[...config.columnIds,entry.id]:config.columnIds.filter(id=>id!==entry.id)}})}/>)}</div>
      <FieldSelect label="记录范围" value={range} options={[{value:"",label:"全部符合条件的可读记录"},...fields.filter(entry=>entry.type==="relation"&&entry.relationConfig&&relationTargets(entry.relationConfig).some(target=>target.tableId.toLowerCase()===config.tableId.toLowerCase())).map(entry=>({value:`selected:${entry.id}`,label:`已选关联 · ${entry.label}`})),...(table?.fields??[]).filter(entry=>entry.type==="relation").map(entry=>({value:`reverse:${entry.id}`,label:`反向引用当前记录 · ${entry.label}`}))]} onChange={value=>onChange({queryConfig:{...config,relationFieldId:value.startsWith("selected:")?value.slice(9):undefined,backReferenceFieldId:value.startsWith("reverse:")?value.slice(8):undefined}})}/>
      {config.backReferenceFieldId&&<p className="text-caption leading-5 text-muted-foreground">所选目标字段必须关联回当前表单，保存配置时会校验；当前记录生效后显示引用它的可读记录。</p>}
      <Checkbox label="允许编辑有权限的目标记录" checked={!!config.allowEdit} disabled={disabled} onCheckedChange={allowEdit=>onChange({queryConfig:{...config,allowEdit}})}/>
      {config.allowEdit&&<p className="text-caption leading-5 text-muted-foreground">每行按目标记录当前权限显示编辑入口。修改提交后保存到目标记录，相关审批独立运行。</p>}
      <Input label="每页行数" type="number" min={1} max={20} value={String(config.pageSize??10)} onChange={value=>onChange({queryConfig:{...config,pageSize:Number(value)}})}/><RelationFilterEditor value={config.filter} onChange={filter=>onChange({queryConfig:{...config,filter}})} targets={columns} sources={fields} disabled={disabled}/>{tables.error&&<p role="alert" className="text-caption text-destructive">{tables.error}</p>}<p className="text-caption leading-5 text-muted-foreground">实时展示目标生效记录，不复制查询内容到当前表单。</p>
    </fieldset>;
  }
  if (field.type === "relation") {
    const config = field.relationConfig ?? { tableId: "" }, table = choices.find((entry) => entry.id.toLowerCase() === config.tableId.toLowerCase());
    return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">关联来源</h3>
      <FieldSelect label="关联数据表" value={config.tableId} options={choices.map((entry) => ({ value: entry.id, label: `${entry.appName} · ${entry.name}` }))} onChange={(tableId) => onChange({ relationConfig: { ...config, tableId, titleFieldId: undefined,filter:undefined,cascade:undefined } })} />
      <FieldSelect label="记录显示标题" value={config.titleFieldId ?? ""} options={[{ value: "", label: "默认记录标题" }, ...(table?.fields ?? []).filter(entry=>lookupNumberSource(entry)||lookupTextSource(entry)).map((entry) => ({ value: entry.id, label: entry.label }))]} onChange={(titleFieldId) => onChange({ relationConfig: { ...config, titleFieldId: titleFieldId || undefined } })} />
      <Checkbox label="允许关联多条记录" checked={!!config.multiple} disabled={disabled||relationTargets(config).some(target=>!!target.cascade)} onCheckedChange={(multiple) => onChange({ relationConfig: { ...config, multiple, maxRecords: multiple ? 20 : 1 } })} />
      <Checkbox label="允许在选择关联时新建记录" checked={!!config.allowCreate} disabled={disabled} onCheckedChange={allowCreate=>onChange({relationConfig:{...config,allowCreate}})}/>
      {config.allowCreate&&<p className="text-caption leading-5 text-muted-foreground">仅目标表同时有创建和读取权限的用户看到新建入口；目标记录保存后即可按权限和筛选条件加入关联。</p>}
      {config.multiple && <Input label="最多关联记录数" type="number" step={1} min={1} max={50} value={String(config.maxRecords ?? 20)} onChange={(value) => { if (value && Number.isInteger(Number(value))) onChange({ relationConfig: { ...config, maxRecords: Math.min(50, Math.max(1, Number(value))) } }); }} />}
      <Checkbox label="按父字段逐级选择" checked={!!config.cascade} disabled={disabled} onCheckedChange={checked=>onChange({relationConfig:{...config,multiple:false,maxRecords:1,cascade:checked?{parentFieldId:"",leafOnly:true,maxDepth:10}:undefined}})}/>
      {config.cascade&&<div className="space-y-3"><FieldSelect label="目标表父记录字段" value={config.cascade.parentFieldId} options={(table?.fields??[]).filter(entry=>entry.type==="relation"&&!entry.relationConfig?.multiple&&!entry.relationConfig?.cascade&&!entry.relationConfig?.targets?.length&&entry.relationConfig?.tableId.toLowerCase()===config.tableId.toLowerCase()).map(entry=>({value:entry.id,label:entry.label}))} onChange={parentFieldId=>onChange({relationConfig:{...config,cascade:{...config.cascade!,parentFieldId}}})}/><Checkbox label="必须选择末级记录" checked={config.cascade.leafOnly!==false} onCheckedChange={leafOnly=>onChange({relationConfig:{...config,cascade:{...config.cascade!,leafOnly}}})}/><Input label="最大路径层数" type="number" min={1} max={10} value={String(config.cascade.maxDepth??10)} onChange={value=>onChange({relationConfig:{...config,cascade:{...config.cascade!,maxDepth:Number(value)}}})}/></div>}
      <RelationFilterEditor value={config.filter} onChange={filter=>onChange({relationConfig:{...config,filter}})} targets={table?.fields??[]} sources={fields} disabled={disabled}/>
      <RelationTargetSettings value={config} fields={fields} tables={choices} onChange={relationConfig=>onChange({relationConfig})} disabled={disabled}/>
      {config.tableId && tables.data && !table && <p role="alert" className="text-caption text-destructive">关联表不可用，请选择当前有权读取的已发布表。</p>}
      {config.titleFieldId && table && !table.fields.some((entry) => entry.id === config.titleFieldId) && <p role="alert" className="text-caption text-destructive">原标题字段已不可用，请重新选择。</p>}
      {tables.error && <p role="alert" className="text-caption text-destructive">{tables.error}</p>}
      <p className="text-caption leading-5 text-muted-foreground">填写时只可搜索本人有权读取的记录。关联不会授予目标记录的读取权限；失效关联需要移除或更换。</p>
    </fieldset>;
  }
  const config = field.lookupConfig ?? { relationFieldId: "", targetFieldId: "", resultType: "text" as const }, relations = fields.filter((entry) => entry.type === "relation" && (!!field.lookupConfig?.aggregate || !entry.relationConfig?.multiple)), relation = relations.find((entry) => entry.id === config.relationFieldId), table = choices.find((entry) => entry.id.toLowerCase() === relation?.relationConfig?.tableId.toLowerCase());
  const targetTables=relation?.relationConfig?relationTargets(relation.relationConfig).map(target=>choices.find(table=>table.id.toLowerCase()===target.tableId.toLowerCase())):[];
  const sources = (table?.fields.filter(config.resultType === "number" ? lookupNumberSource : lookupTextSource) ?? []).filter(field=>targetTables.every(target=>target?.fields.some(entry=>entry.id===field.id&&(config.resultType==="number"?lookupNumberSource(entry):lookupTextSource(entry)))));
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">查询内容</h3>
    <FieldSelect label="查询方式" value={config.aggregate??""} options={[{value:"",label:"单条字段快照"},{value:"SUM",label:"关联记录求和"},{value:"COUNT",label:"关联记录计数"},{value:"MIN",label:"最小值"},{value:"MAX",label:"最大值"},{value:"AVG",label:"平均值"}]} onChange={aggregate=>{const next={...config,aggregate:aggregate?(aggregate as NonNullable<LowcodeField["lookupConfig"]>["aggregate"]):undefined,resultType:aggregate?"number" as const:config.resultType};if(aggregate==="COUNT")delete next.targetFieldId;else next.targetFieldId??="";onChange({lookupConfig:next,readOnly:true});}}/>
    <FieldSelect label="关联字段" value={config.relationFieldId} options={relations.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(relationFieldId) => onChange({ lookupConfig: { ...config, relationFieldId, targetFieldId: config.aggregate==="COUNT"?undefined:"" }, readOnly: true })} />
    {!config.aggregate&&<FieldSelect label="查询结果类型" value={config.resultType} options={[{ value: "text", label: "文本" }, { value: "number", label: "数字（可参与计算）" }]} onChange={(resultType) => onChange({ lookupConfig: { ...config, resultType: resultType as "text" | "number", targetFieldId: "" }, numericConfig: undefined, minimum: undefined, maximum: undefined, readOnly: true })} />}
    {config.aggregate!=="COUNT"&&<FieldSelect label="目标字段" value={config.targetFieldId??""} options={sources.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(targetFieldId) => onChange({ lookupConfig: { ...config, targetFieldId }, readOnly: true })} />}
    {tables.error && <p role="alert" className="text-caption text-destructive">{tables.error}</p>}
    {tables.data && config.targetFieldId && !sources.some((entry) => entry.id === config.targetFieldId) && <p role="alert" className="text-caption text-destructive">目标字段不可用或类型不匹配，请重新选择。</p>}
    {!relations.length && <p className="text-caption text-muted-foreground">先添加同层关联字段；单条快照需要单选关联。</p>}
    <p className="rounded-control bg-status-warning/10 p-3 text-caption leading-5 text-status-warning dark:text-status-warning">动态关联的目标字段须在全部来源存在且类型兼容。查询值会复制到当前表，形成保存快照，并按当前表的权限向读者展示。提交者需要有权读取目标记录；历史详情不会随目标记录变化而更新。</p>
  </fieldset>;
}
