import type { DataStyle } from "@/lib/data-style";
import { ColorSwatch, ActionSurface, MultilineEntry } from "@/components/controls";
import {numericField,formulaResultType} from "./calculations";
import { ChoiceOptionsSettings } from "./ChoiceOptionsSettings";
import { prunePrintPresentation } from "./record-presentation";
import { ExtendedFieldSettings } from "./ExtendedFieldSettings";
import type { FileContext } from "./FileField";
import { layoutField } from "./extended-fields";
import { useId, useState, type DragEvent, type PointerEvent, type ReactNode } from "react";
import { AlignLeft, ArrowDown, ArrowUp, CalendarDays, CheckSquare, Clock, FileText, GripVertical, Hash, Heading, Image, ListChecks, Mail, Minus, Palette, PanelLeft, Percent, Phone, SlidersHorizontal, Star, TextCursorInput, Users, Link, Building2, Briefcase, Table2, Calculator, Sigma, Link2, Search, FilePenLine, Eye } from "@/shared/icons/catalog";
import { CopyAction, PlusAction, StatefulMorph, TrashAction } from "@/shared/icons/motion";
import { Button, FieldSelect, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";
import type { Directory } from "@/organization/model";
import { useLoad } from "./model";
import type { DefaultUser, FieldDropEdge } from "./field-model";
import { defaultSerialTemplate, serialTokens, serialTemplateError, serialExample } from "./serial-template";
import { FieldRenderer } from "./FieldRenderer";
import { FieldExtras } from "./FieldExtras";
import { numericLookup } from "./relations";
import { FormRuleSettings } from "./RuleSettings";
import { accentPresets, appearanceStyle, coverPresets, createField, defaultAppearance, fieldColumn, fieldGridStyle, fieldRows, fieldTypes, fieldWidth, initialValues, isDecoration, isIdentifier, inputFormats, placeField, placeFieldAt, snapFieldWidth, textLimit, validateFieldConfigs, validateValues, type Appearance, type FieldType, type LowcodeField, type TableSchema } from "./field-model";

const FIELD_TYPE_MIME = "application/docweave-field";
const FIELD_ID_MIME = "application/docweave-field-id";
const dropEdgeClass: Record<FieldDropEdge, string> = {
  left: "absolute inset-y-2 left-0 z-10 w-1 rounded-full bg-primary",
  right: "absolute inset-y-2 right-0 z-10 w-1 rounded-full bg-primary",
  before: "absolute inset-x-2 top-0 z-10 h-1 rounded-full bg-primary",
  after: "absolute inset-x-2 bottom-0 z-10 h-1 rounded-full bg-primary",
};
function isCanvasDrag(event: DragEvent) {
  const types = [...event.dataTransfer.types];
  return types.includes(FIELD_TYPE_MIME) || types.includes(FIELD_ID_MIME) || types.includes("text/plain");
}
function dropEdgeOf(event: DragEvent<HTMLElement>, field: LowcodeField): FieldDropEdge {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  if (!isDecoration(field) && x < 0.28) return "left";
  if (!isDecoration(field) && x > 0.72) return "right";
  return y < 0.5 ? "before" : "after";
}

const fieldIcons: Record<FieldType, typeof AlignLeft> = {
  queryTable: Table2, richtext: AlignLeft, remark: FileText, displayImage: Image, tabs: PanelLeft, collapse: ListChecks, chineseAmount: Calculator, location: Link,
  relation: Link2, lookup: Search, subtable: Table2, formula: Calculator, summary: Sigma, region: Building2,
  idCard: TextCursorInput, signature: AlignLeft, serial: Hash,
  text: TextCursorInput, textarea: AlignLeft, number: Hash, date: CalendarDays, datetime: CalendarDays,
  select: ListChecks, multiselect: ListChecks, checkbox: CheckSquare, member: Users, members: Users,
  email: Mail, phone: Phone, url: Link, progress: Percent, heading: Heading, divider: Minus,
  time: Clock, rating: Star, image: Image, attachment: FileText, department: Building2, departments: Building2, position: Briefcase, positions: Briefcase,
};

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"><h3 className="text-caption font-semibold text-muted-foreground">{title}</h3>{children}</section>;
}

function FieldCard({ field, fields, contextValues, selected, disabled, first, last, directory, dropEdge, onSelect, onMove, onDuplicate, onDelete, onDragOverCard, onDropCard, onDragEndCard, onResize }: {
  field: LowcodeField; fields:LowcodeField[]; contextValues:Record<string,unknown>; selected: boolean; disabled: boolean; first: boolean; last: boolean; directory: Directory;
  dropEdge: FieldDropEdge | null; onSelect: () => void; onMove: (direction: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void;
  onDragOverCard: (event: DragEvent<HTMLElement>) => void; onDropCard: (event: DragEvent<HTMLElement>) => void; onDragEndCard: () => void; onResize: (width: number) => void;
}) {
  const span = fieldWidth(field);
  const Icon = fieldIcons[field.type];
  function resize(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || isDecoration(field)) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const grid = handle.closest("[data-canvas-grid]");
    const card = handle.closest("[data-field-card]");
    if (!(grid instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
    const startLeft = card.getBoundingClientRect().left;
    handle.setPointerCapture(event.pointerId);
    const move = (next: globalThis.PointerEvent) => {
      const unit = grid.getBoundingClientRect().width / 12;
      onResize(snapFieldWidth((next.clientX - startLeft) / unit));
    };
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }
  return <article data-field-card className={cn("group relative min-w-0 rounded-card border bg-background p-3", selected ? "border-primary ring-1 ring-primary/20" : "border-border")}
    data-field-grid style={{"--field-grid": fieldGridStyle(span, fieldColumn(field)).gridColumn} as DataStyle} onDragOver={onDragOverCard} onDrop={onDropCard}>
    {dropEdge && <span aria-hidden className={dropEdgeClass[dropEdge]} />}
    <div className="mb-2 flex flex-wrap items-center gap-0.5">
      <span draggable={!disabled} onDragStart={(event) => { event.dataTransfer.setData(FIELD_ID_MIME, field.id); event.dataTransfer.setData("text/plain", `id:${field.id}`); event.dataTransfer.effectAllowed = "move"; }}
        className="inline-flex cursor-grab p-1.5 text-muted-foreground active:cursor-grabbing" title={`拖动${field.label}，放到其他字段左侧或右侧可并排`} aria-label={`拖动${field.label}，放到其他字段左侧或右侧可并排`} onDragEnd={onDragEndCard}>
        <GripVertical className="size-4" />
      </span>
      <ActionSurface type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Icon className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-body font-medium">{field.label || "未命名字段"}</span>
        <span className="ml-auto whitespace-nowrap text-caption text-muted-foreground">{span}/12</span>
      </ActionSurface>
      <Button variant="ghost" size="icon" disabled={disabled || first} aria-label={`上移${field.label}`} onClick={() => onMove(-1)}><span className="inline-flex size-3.5"><ArrowUp  /></span></Button>
      <Button variant="ghost" size="icon" disabled={disabled || last} aria-label={`下移${field.label}`} onClick={() => onMove(1)}><span className="inline-flex size-3.5"><ArrowDown  /></span></Button>
      <Button variant="ghost" size="icon" disabled={disabled} aria-label={`复制${field.label}`} onClick={onDuplicate}><CopyAction size={14} /></Button>
      <Button variant="ghost" size="icon" disabled={disabled} aria-label={`删除${field.label}`} onClick={onDelete}><TrashAction size={14} /></Button>
    </div>
    <div className="rounded-control bg-muted/25 p-3" onClick={onSelect}>
      <div className="pointer-events-none" inert>
        <FieldRenderer contextFields={fields} contextValues={contextValues} schema={{ name: "", description: "", fields: [{ ...field, hidden: false, visibility: "visible", visibleWhen: undefined, requiredWhen: undefined, warningRules: undefined, defaultConfig: undefined }], appearance: { ...defaultAppearance, columns: 1, density: "compact" } }} value={["formula", "summary", "lookup"].includes(field.type) ? { [field.id]: field.type==="formula"&&formulaResultType(field)!=="number" ? formulaResultType(field)==="date"?"2026-01-01":"文本计算结果" : field.type === "lookup" && !numericLookup(field) ? "查询结果" : 0 } : initialValues({ name: "", description: "", fields: [field] })} onChange={() => {}} directory={directory} readOnly={["formula", "summary", "lookup"].includes(field.type)} disabled />
      </div>
    </div>
    {!isDecoration(field) && <ActionSurface type="button" disabled={disabled} aria-label={`拖动调整${field.label}宽度，当前 ${span}/12`} onPointerDown={resize}
      className="absolute inset-y-4 z-10 w-3 cursor-col-resize">
      <span aria-hidden className={cn("absolute inset-y-5 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary/70 opacity-0 group-hover:opacity-100", selected && "opacity-100")} />
    </ActionSurface>}
  </article>;
}

export function FieldDesigner({ value, onChange, directory, disabled = false, nested = false, fileContext }: {
  value: TableSchema; onChange: (value: TableSchema) => void; directory: Directory; disabled?: boolean; nested?: boolean; fileContext?: FileContext;
}) {
  const id = useId();
  const me = useLoad<DefaultUser>("/api/v1/me");
  const [selectedId, setSelectedId] = useState<string | null>(value.fields[0]?.id ?? null);
  const [panel, setPanel] = useState<"fields" | "appearance" | "rules">("fields");
  const [preview, setPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewComplete, setPreviewComplete] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [dropHint, setDropHint] = useState<{ id: string; edge: FieldDropEdge } | "end" | null>(null);
  const selected = value.fields.find((field) => field.id === selectedId) ?? value.fields[0];
  const appearance = { ...defaultAppearance, ...value.appearance };
  const limit = nested ? 20 : 100;
  const availableTypes = fieldTypes.filter((field) => !nested || !["subtable", "summary", "serial", "tabs", "collapse"].includes(field.type));
  const full = value.fields.length >= limit;
  const cardContextValues=initialValues(value);
  const configErrors = validateFieldConfigs(value, nested);
  function commit(next: TableSchema) {
    if(disabled)return;
    const ids=new Set(next.fields.map(field=>field.id));
    const layouts=next.layouts?.map(layout=>({...layout,fieldOrder:layout.fieldOrder.filter(id=>ids.has(id)),widths:Object.fromEntries(Object.entries(layout.widths??{}).filter(([id])=>ids.has(id)))}));
    onChange(prunePrintPresentation({ ...next, ...(layouts?{layouts}:{}), schemaVersion: 2 }));
  }
  function updateField(patch: Partial<LowcodeField>) {
    if (!selected) return;
    const next = { ...selected, ...patch };
    if (patch.options && next.choiceConfig?.colors) next.choiceConfig = { ...next.choiceConfig, colors: Object.fromEntries(Object.entries(next.choiceConfig.colors).filter(([option]) => patch.options!.includes(option))) };
    for (const key of Object.keys(next) as (keyof LowcodeField)[]) if (next[key] === undefined) delete next[key];
    commit({ ...value, fields: value.fields.map((field) => field.id === selected.id ? next : field) });
  }
  function updateAppearance(patch: Partial<Appearance>) { commit({ ...value, appearance: { ...appearance, ...patch } }); }
  function add(type: FieldType) {
    if (disabled || full || !availableTypes.some((field) => field.type === type)) return;
    const field = createField(type);
    if (!isDecoration(field) && type !== "textarea" && type !== "richtext" && type !== "signature" && type !== "subtable") field.width = 12 / appearance.columns;
    commit({ ...value, fields: [...value.fields, field] }); setSelectedId(field.id); setPanel("fields");
  }
  function move(field: LowcodeField, direction: -1 | 1) {
    const fields = [...value.fields], from = fields.findIndex((entry) => entry.id === field.id), to = from + direction;
    if (to < 0 || to >= fields.length) return;
    [fields[from], fields[to]] = [fields[to], fields[from]]; commit({ ...value, fields });
  }
  function duplicate(field: LowcodeField) {
    if (full) return;
    const clone = { ...field, id: createField(field.type).id, label: `${field.label.slice(0, 124)} 副本`, options: field.options ? [...field.options] : undefined };
    delete clone.column;
    if (layoutField(clone)) clone.layoutConfig = { ...clone.layoutConfig, sections: (clone.layoutConfig?.sections ?? []).map((section) => ({ ...section, fieldIds: [] })) };
    const fields = [...value.fields]; fields.splice(fields.findIndex((entry) => entry.id === field.id) + 1, 0, clone);
    commit({ ...value, fields }); setSelectedId(clone.id);
  }
  function showPreview() {
    setPreviewValues(initialValues(value, me.data)); setPreviewErrors({}); setPreviewComplete(false); setPreview(true);
  }
  function updateBound(key: "minimum" | "maximum", next: string) {
    if (!selected) return;
    if (!next) { updateField({ [key]: undefined }); return; }
    if (selected.type === "date") updateField({ [key]: next });
    else if (selected.type === "datetime") { const date = new Date(next); if (!Number.isNaN(date.getTime())) updateField({ [key]: date.toISOString() }); }
    else updateField({ [key]: Number(next) });
  }
  function commitFields(fields: LowcodeField[]) {
    const multi = fields.some((field) => !isDecoration(field) && fieldWidth(field) < 12);
    commit({ ...value, fields, appearance: { ...appearance, columns: multi && appearance.columns === 1 ? 2 : appearance.columns } });
  }
  function readDrag(event: DragEvent) {
    const plain = event.dataTransfer.getData("text/plain");
    const id = event.dataTransfer.getData(FIELD_ID_MIME) || (plain.startsWith("id:") ? plain.slice(3) : "");
    const type = event.dataTransfer.getData(FIELD_TYPE_MIME) || (plain.startsWith("type:") ? plain.slice(5) : "");
    return { id, type: availableTypes.some((field) => field.type === type) ? type as FieldType : undefined };
  }
  function acceptCanvasDrag(event: DragEvent) {
    if (disabled || !isCanvasDrag(event)) return false;
    const moving = [...event.dataTransfer.types].includes(FIELD_ID_MIME);
    if (full && !moving) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = moving ? "move" : "copy";
    return true;
  }
  function dropOnField(event: DragEvent<HTMLElement>, target: LowcodeField) {
    event.preventDefault();
    event.stopPropagation();
    setDropHint(null);
    setDropActive(false);
    if (disabled) return;
    const edge = dropEdgeOf(event, target);
    const dragged = readDrag(event);
    if (dragged.id) {
      commitFields(placeField(value.fields, dragged.id, target.id, edge));
      setSelectedId(dragged.id);
      setPanel("fields");
      return;
    }
    if (!dragged.type || full) return;
    const field = createField(dragged.type);
    if (!isDecoration(field) && dragged.type !== "textarea" && dragged.type !== "signature" && dragged.type !== "subtable") field.width = 12 / appearance.columns;
    commitFields(placeField([...value.fields, field], field.id, target.id, edge));
    setSelectedId(field.id);
    setPanel("fields");
  }
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-center gap-1 rounded-full bg-muted p-1" role="group" aria-label="设计面板">
        <Button size="sm" variant={panel === "fields" && !preview ? "secondary" : "ghost"} onClick={() => { setPanel("fields"); setPreview(false); }}><span className="inline-flex size-3.5"><PanelLeft  /></span>字段</Button>
        {!nested && <Button size="sm" variant={panel === "appearance" && !preview ? "secondary" : "ghost"} onClick={() => { setPanel("appearance"); setPreview(false); }}><span className="inline-flex size-3.5"><Palette  /></span>外观</Button>}
        <Button size="sm" variant={panel === "rules" && !preview ? "secondary" : "ghost"} onClick={() => { setPanel("rules"); setPreview(false); }}><span className="inline-flex size-3.5"><ListChecks  /></span>提交校验</Button>
      </div>
      <div className="flex items-center gap-3"><span className="text-caption text-muted-foreground">{value.fields.length} / {limit} 个字段</span><Button size="sm" variant={preview ? "primary" : "outline"} onClick={preview ? () => setPreview(false) : showPreview}><StatefulMorph active={preview} off={<span className="inline-flex size-3.5"><Eye  /></span>} on={<span className="inline-flex size-3.5"><FilePenLine  /></span>} />{preview ? "返回设计" : "试填预览"}</Button></div>
    </div>
    {!!Object.keys(configErrors).length && <p role="alert" className="text-caption text-destructive">{Object.values(configErrors)[0]}</p>}
    {preview ? <div className="mx-auto max-w-7xl rounded-control border border-border bg-background p-5 sm:p-8" style={{"--primary": appearanceStyle(appearance)["--primary"], "--primary-foreground": appearanceStyle(appearance)["--primary-foreground"], "--ring": appearanceStyle(appearance)["--ring"], "--lc-accent": appearanceStyle(appearance)["--lc-accent"]} as DataStyle}>
      <p className="mb-5 rounded-control bg-muted px-3 py-2 text-caption text-muted-foreground">预览模式，试填内容不会保存为记录。</p>
      <FieldRenderer schema={value} value={previewValues} onChange={(next) => { setPreviewValues(next); setPreviewComplete(false); setPreviewErrors({}); }} directory={directory} errors={previewErrors} fileContext={fileContext} />
      <div className="mt-6 flex items-center gap-3"><Button onClick={() => { const errors = validateValues(value, previewValues); setPreviewErrors(errors); setPreviewComplete(Object.keys(errors).length === 0); }}>{appearance.submitLabel}</Button>{previewComplete && <p role="status" className="text-body text-primary">校验通过，填写内容符合当前表单规则。</p>}</div>
    </div> : <div className="grid min-w-0 gap-4 lg:grid-cols-record-settings xl:grid-cols-record-settings-detail">
      <aside className="min-w-0 rounded-card border border-border bg-background p-3" aria-label="字段组件库">
        <h2 className="mb-1 text-body font-semibold">添加字段</h2><p className="mb-4 text-caption leading-5 text-muted-foreground">点击添加，或拖到画布。拖到字段左右两侧才会并排，空位不会自动填上。</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 lg:grid-cols-1">{["基础", "选择", "联系", "展示", "布局"].map((group) => <section key={group}>
          <h3 className="mb-1.5 px-2 text-caption text-muted-foreground">{group}</h3><div className="space-y-1">{availableTypes.filter((field) => field.group === group).map((field) => {
            const Icon = fieldIcons[field.type];
            return <div key={field.type} draggable={!disabled && !full} onDragStart={(event) => { event.dataTransfer.setData(FIELD_TYPE_MIME, field.type); event.dataTransfer.setData("text/plain", `type:${field.type}`); event.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { setDropHint(null); setDropActive(false); }}>
              <Button variant="ghost" disabled={disabled || full} size="sm" className="w-full" onClick={() => add(field.type)}><Icon className="size-4" />{field.label}<span className="inline-flex ml-auto text-muted-foreground"><PlusAction size={12}  /></span></Button>
            </div>;
          })}</div>
        </section>)}</div>
      </aside>
      <main className={cn("min-w-0 rounded-card border border-border bg-muted/25 p-3 sm:p-5", dropActive && "ring-2 ring-primary")}
        onDragOver={(event) => { if (acceptCanvasDrag(event)) { setDropActive(true); setDropHint("end"); } }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setDropActive(false); setDropHint(null); } }}
        onDrop={(event) => { event.preventDefault(); setDropActive(false); setDropHint(null); const dragged = readDrag(event); if (dragged.id) { const fields = [...value.fields]; const from = fields.findIndex((field) => field.id === dragged.id); if (from < 0) return; const [field] = fields.splice(from, 1); fields.push(placeFieldAt(field, 1, fieldWidth(field))); commitFields(fields); setSelectedId(dragged.id); return; } if (dragged.type && fieldTypes.some((field) => field.type === dragged.type)) add(dragged.type); }} aria-label="表单画布">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-body font-semibold">表单画布</h2><span className="text-caption text-muted-foreground">拖到左右并排，右侧边缘拉宽度</span></div>
        {!value.fields.length ? <div className="flex min-h-72 flex-col items-center justify-center rounded-card border border-dashed border-border px-5 text-center"><span className="inline-flex mb-3 size-7 text-muted-foreground"><TextCursorInput  /></span><h3 className="text-body font-medium">从一个字段开始</h3><p className="mt-1 text-caption leading-5 text-muted-foreground">在组件库选择需要采集的信息，再设置右侧属性。</p><Button size="sm" variant="outline" className="mt-4" disabled={disabled} onClick={() => add("text")}><PlusAction size={14} />添加文本字段</Button></div>
          : <div className="space-y-3">
            {fieldRows(value.fields).map((row) => <div key={row.map((field) => field.id).join("-")} data-canvas-grid className="grid grid-cols-12 gap-3">
            {row.map((field) => { const index = value.fields.findIndex((entry) => entry.id === field.id); return <FieldCard key={field.id} field={field} fields={value.fields} contextValues={cardContextValues} selected={panel === "fields" && selected?.id === field.id} disabled={disabled} first={index === 0} last={index === value.fields.length - 1} directory={directory}
              dropEdge={dropHint && dropHint !== "end" && dropHint.id === field.id ? dropHint.edge : null}
              onSelect={() => { setSelectedId(field.id); setPanel("fields"); }} onMove={(direction) => move(field, direction)} onDuplicate={() => duplicate(field)} onDelete={() => commit({ ...value, fields: value.fields.filter((entry) => entry.id !== field.id).map((entry) => layoutField(entry) ? { ...entry, layoutConfig: { ...entry.layoutConfig, sections: (entry.layoutConfig?.sections ?? []).map((section) => ({ ...section, fieldIds: section.fieldIds.filter((id) => id !== field.id) })) } } : entry) })}
              onDragOverCard={(event) => { if (!acceptCanvasDrag(event)) return; event.stopPropagation(); const edge = dropEdgeOf(event, field); setDropHint((current) => current !== "end" && current?.id === field.id && current.edge === edge ? current : { id: field.id, edge }); }}
              onDropCard={(event) => dropOnField(event, field)}
              onDragEndCard={() => { setDropHint(null); setDropActive(false); }}
              onResize={(width) => commitFields(value.fields.map((entry) => entry.id === field.id ? placeFieldAt(entry, width === 12 ? 1 : fieldColumn(entry), width) : entry))} />; })}
            </div>)}
            {dropHint === "end" && <div className="h-1 rounded-full bg-primary" aria-hidden />}
          </div>}
      </main>
      <aside className="min-w-0 rounded-card border border-border bg-background p-4 lg:col-span-2 xl:col-span-1" aria-label={panel === "appearance" ? "表单外观设置" : panel === "rules" ? "表单提交校验" : "字段属性"}>
        <h2 className="mb-4 flex items-center gap-2 text-body font-semibold">{panel === "appearance" ? <Palette className="size-4" /> : <SlidersHorizontal className="size-4" />}{panel === "appearance" ? "表单外观" : panel === "rules" ? "提交校验" : "字段属性"}</h2>
        <fieldset disabled={disabled} className="min-w-0 space-y-5">
          {panel === "rules" ? <FormRuleSettings value={value.validationRules ?? []} onChange={(validationRules) => commit({ ...value, validationRules })} fields={value.fields} directory={directory} disabled={disabled} /> : panel === "appearance" ? <>
            <EditorSection title="表单信息"><Input label="表单名称" value={value.name} maxLength={128} onChange={(name) => commit({ ...value, name })} /><label htmlFor={`${id}-description`} className="block text-body font-medium">表单说明</label><MultilineEntry id={`${id}-description`} rows={3} maxLength={2000} value={value.description} onChange={(event) => commit({ ...value, description: event.target.value })} className={""} /></EditorSection>
            <EditorSection title="布局"><FieldSelect label="默认列数" value={String(appearance.columns)} options={[{ value: "1", label: "单列，适合长内容" }, { value: "2", label: "双列" }, { value: "3", label: "三列" }, { value: "4", label: "四列" }]} onChange={(columns) => { const count = Number(columns) as Appearance["columns"]; commit({ ...value, appearance: { ...appearance, columns: count }, fields: value.fields.map((field) => isDecoration(field) || field.width === 12 ? field : { ...field, width: 12 / count }) }); }} /><FieldSelect label="字段间距" value={appearance.density} options={[{ value: "comfortable", label: "舒适" }, { value: "compact", label: "紧凑" }]} onChange={(density) => updateAppearance({ density: density as Appearance["density"] })} /><p className="text-caption leading-5 text-muted-foreground">手机上自动变为单列，字段顺序保持一致。</p></EditorSection>
            <EditorSection title="主题色"><div className="flex flex-wrap gap-2" role="group" aria-label="主题色">{accentPresets.map((preset) => <ColorSwatch key={preset.value} type="button" title={preset.label} aria-label={preset.label} aria-pressed={appearance.accent === preset.value} onClick={() => updateAppearance({ accent: preset.value })}  color={preset.color} />)}</div></EditorSection>
            <EditorSection title="封面"><div className="grid grid-cols-2 gap-2">{coverPresets.map((preset) => <ActionSurface active={appearance.cover === preset.value} key={preset.value} type="button" aria-pressed={appearance.cover === preset.value} onClick={() => updateAppearance({ cover: preset.value })} className={"overflow-hidden text-left"}><span className={cn("block h-10", preset.className)} /><span className="block bg-background px-2 py-1.5 text-caption">{preset.label}</span></ActionSurface>)}</div></EditorSection>
            <EditorSection title="提交按钮"><Input label="按钮文字" value={appearance.submitLabel} maxLength={24} onChange={(submitLabel) => updateAppearance({ submitLabel })} /><div style={{"--primary": appearanceStyle(appearance)["--primary"], "--primary-foreground": appearanceStyle(appearance)["--primary-foreground"], "--ring": appearanceStyle(appearance)["--ring"], "--lc-accent": appearanceStyle(appearance)["--lc-accent"]} as DataStyle}><Button disabled className="mt-1">{appearance.submitLabel || "提交"}</Button></div></EditorSection>
          </> : selected ? <>
            <EditorSection title={fieldTypes.find((field) => field.type === selected.type)?.label ?? "字段"}>
              <Input label="字段名称" value={selected.label} maxLength={128} onChange={(label) => updateField({ label })} />
              {!isDecoration(selected) && selected.type !== "serial" && <Checkbox checked={!!selected.required} onCheckedChange={(required) => updateField({ required })} label="必填字段" disabled={disabled} />}
              {!isDecoration(selected) && <>{!["serial", "formula", "summary", "lookup"].includes(selected.type) && <Checkbox checked={!!selected.readOnly} onCheckedChange={(readOnly) => updateField({ readOnly })} label="只读（填写时不可修改）" disabled={disabled} />}{selected.hidden && <Checkbox checked={!!selected.hidden} onCheckedChange={(hidden) => updateField({ hidden })} label="沿用旧版：填写时隐藏" disabled={disabled} />}<p className="text-caption leading-5 text-muted-foreground">只读或隐藏的必填字段需要默认值（自动编号除外）。新版隐藏方式在下方可见性中设置。</p></>}
              {!isDecoration(selected) && !["checkbox", "signature", "serial", "subtable", "formula", "summary", "lookup", "chineseAmount", "location"].includes(selected.type) && <Input label="输入提示" value={selected.placeholder ?? ""} maxLength={200} onChange={(placeholder) => updateField({ placeholder })} />}
              <Input label="字段说明" value={selected.help ?? ""} maxLength={2000} onChange={(help) => updateField({ help })} />
            </EditorSection>
            {!isDecoration(selected) && <EditorSection title="布局"><FieldSelect label="字段占宽" value={String(selected.width ?? 6)} options={[{ value: "12", label: "整行" }, { value: "9", label: "3/4 行（9/12）" }, { value: "8", label: "2/3 行（8/12）" }, { value: "6", label: "1/2 行（每行两个）" }, { value: "4", label: "1/3 行（每行三个）" }, { value: "3", label: "1/4 行（每行四个）" }, ...(![12, 9, 8, 6, 4, 3].includes(selected.width ?? 6) ? [{ value: String(selected.width), label: `自定义 ${selected.width}/12` }] : [])]} onChange={(width) => { const span = Number(width); commit({ ...value, appearance: { ...appearance, columns: appearance.columns === 1 && span !== 12 ? 2 : appearance.columns }, fields: value.fields.map((field) => field.id === selected.id ? placeFieldAt(field, span === 12 ? 1 : fieldColumn(field), span) : field) }); }} /><p className="text-caption leading-5 text-muted-foreground">变窄后右侧空位会留空。拖到另一字段左侧或右侧才会并排。</p>
              {selected.type === "textarea" && <Input label="文本行数" type="number" min={1} max={20} step={1} value={String(selected.rows ?? 4)} onChange={(rows) => { if (rows && Number.isInteger(Number(rows))) updateField({ rows: Math.max(1, Math.min(20, Number(rows))) }); }} />}
            </EditorSection>}
            {["text", "textarea", "richtext", "email", "phone", "url"].includes(selected.type) && <EditorSection title="校验"><Input label="最多字符数" type="number" min={1} max={textLimit(selected.type)} step={1} value={String(selected.maxLength ?? textLimit(selected.type))} onChange={(maxLength) => { if (maxLength && Number.isInteger(Number(maxLength))) updateField({ maxLength: Math.max(1, Math.min(textLimit(selected.type), Number(maxLength))) }); }} /></EditorSection>}
            {selected.type === "idCard" && <p className="text-caption leading-5 text-muted-foreground">按文本保存 18 位身份证号码，支持末尾 X/x，校验出生日期和校验位。</p>}
            {selected.type === "signature" && <p className="text-caption leading-5 text-muted-foreground">填写人使用鼠标或触屏手写签名，可撤销、清空。签名随表单保存，不预填默认签名。</p>}
            {selected.type === "serial" && <EditorSection title="编号规则">
              <label className="block space-y-1.5 text-body font-medium">编号模板<MultilineEntry rows={3} maxLength={128} className={`${""}  `} value={selected.codeTemplate ?? defaultSerialTemplate} onChange={(event) => updateField({ codeTemplate: event.target.value })} /></label>
              <div className="flex flex-wrap gap-1" aria-label="插入编号占位符">{serialTokens.map((token) => <Button key={token} size="sm" variant="outline" onClick={() => updateField({ codeTemplate: (selected.codeTemplate ?? defaultSerialTemplate) + token })}>{token}</Button>)}</div>
              <p className="text-caption leading-5 text-muted-foreground">YYYY / YY 年，MM 月，DD 日，HH 时，mm 分，ss 秒，SSS 毫秒。RAND 为大写字母与数字，DIGITS 为随机数字，长度 4 至 32 位。SEQ 为递增流水号，长度 4 至 12 位，同一字段按下方周期重置。可添加固定前缀和分隔符。</p>
              {serialTemplateError(selected.codeTemplate ?? defaultSerialTemplate) ? <p role="alert" className="text-caption text-destructive">{serialTemplateError(selected.codeTemplate ?? defaultSerialTemplate)}</p> : <div className="rounded-control bg-muted p-3"><span className="text-caption text-muted-foreground">格式示例</span><p className="mt-1 break-all font-mono text-body">{serialExample(selected.codeTemplate ?? defaultSerialTemplate)}</p></div>}
              <p className="text-caption leading-5 text-muted-foreground">使用北京时间。首次保存时由服务端生成，后续修改、退回重填保持原编号。</p>
            </EditorSection>}
            {selected.type === "number" && <EditorSection title="输入格式"><FieldSelect label="格式" value={selected.format ?? "number"} options={inputFormats} onChange={(format) => updateField({ format: format as LowcodeField["format"], defaultValue: undefined, defaultSource: undefined, minimum: undefined, maximum: undefined, ...(["phone", "digits", "idCard"].includes(format) ? { numericConfig: undefined } : {}) })} />{isIdentifier(selected) && <p className="text-caption leading-5 text-muted-foreground">按文本保存，保留前导零和身份证末尾的 X，不参与数值计算。</p>}</EditorSection>}
            {(numericField(selected) && selected.type!=="rating" || ["date","datetime"].includes(selected.type)) && !isIdentifier(selected) && <EditorSection title="允许范围">{(["minimum", "maximum"] as const).map((key) => selected.type === "date" || selected.type === "datetime" ? <DatePicker key={key} label={key === "minimum" ? "最小值" : "最大值"} withTime={selected.type === "datetime"} value={String(selected[key] ?? "")} onChange={(next) => updateBound(key, next ?? "")} /> : <Input key={key} label={key === "minimum" ? "最小值" : "最大值"} type="number" step="any" min={selected.type === "progress" ? 0 : undefined} max={selected.type === "progress" ? 100 : undefined} value={String(selected[key] ?? "")} onChange={(next) => updateBound(key, next)} />)}
              {selected.minimum !== undefined && selected.maximum !== undefined && (numericField(selected) ? Number(selected.minimum) > Number(selected.maximum) : Date.parse(String(selected.minimum)) > Date.parse(String(selected.maximum))) && <p role="alert" className="text-caption text-destructive">最小值不能大于最大值。</p>}
            </EditorSection>}
            {(selected.type === "select" || selected.type === "multiselect") && <EditorSection title="选项"><ChoiceOptionsSettings field={selected} onChange={updateField} disabled={disabled}/></EditorSection>}
            <ExtendedFieldSettings field={selected} fields={value.fields} onChange={updateField} disabled={disabled} fileContext={fileContext} />
            <FieldExtras nested={nested} field={selected} fields={value.fields} onChange={updateField} directory={directory} disabled={disabled} />
            {!selected.defaultConfig && !isDecoration(selected) && !["signature", "serial", "image", "attachment", "subtable", "formula", "summary", "relation", "lookup", "chineseAmount", "location", "region"].includes(selected.type) && <EditorSection title="默认内容">
              <FieldSelect label="默认值来源" value={selected.defaultSource ?? "custom"} options={[{ value: "custom", label: "自定义" }, ...(["text", "textarea", "member", "members"].includes(selected.type) ? [{ value: "initiator", label: "表单发起人" }] : []), ...(["text", "date"].includes(selected.type) ? [{ value: "currentDate", label: "当前日期" }] : []), ...(["datetime", "time"].includes(selected.type) ? [{ value: "currentTime", label: "当前时间" }] : []), ...((selected.type === "text" || selected.type === "number" && !isIdentifier(selected)) ? [{ value: "currentYear", label: "当前年份" }] : [])]} onChange={(defaultSource) => updateField({ defaultSource: defaultSource as LowcodeField["defaultSource"], defaultValue: undefined })} />
              {(!selected.defaultSource || selected.defaultSource === "custom") && <>
              <FieldRenderer schema={{ name: "", description: "", fields: [{ ...selected, label: "默认值", required: false, readOnly: false, hidden: false, visibility: "visible", help: "", defaultValue: undefined, visibleWhen: undefined, requiredWhen: undefined, warningRules: undefined }], appearance: { ...defaultAppearance, columns: 1, density: "compact" } }} value={selected.defaultValue === undefined ? {} : { [selected.id]: selected.defaultValue }} onChange={(next) => updateField({ defaultValue: next[selected.id] as LowcodeField["defaultValue"] })} directory={directory} disabled={disabled} />
              {selected.defaultValue !== undefined && <Button variant="ghost" size="sm" onClick={() => updateField({ defaultValue: undefined })}>移除默认值</Button>}
              </>}
              <p className="text-caption leading-5 text-muted-foreground">默认值在新建时填入；日期和年份使用北京时间。保存草稿后保留，不随再次打开而变化。</p>
            </EditorSection>}
          </> : <p className="py-6 text-center text-body text-muted-foreground">添加或选择一个字段后编辑属性。</p>}
        </fieldset>
      </aside>
    </div>}
  </div>;
}
