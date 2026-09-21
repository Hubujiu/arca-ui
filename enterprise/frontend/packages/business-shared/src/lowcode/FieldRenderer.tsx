import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { ActionSurface, MultilineEntry, SelectEntry, TextEntry } from "@/components/controls";
import { fieldReferenceIssues, mergeReferenceFields, mergeReferenceValues, referenceLookupQuery } from "./field-reference-context";
import { useFieldEvents, FieldEventStatus } from "./useFieldEvents";
import { fieldEventField } from "./field-events";
import { changeOtherText, choiceControlValue, choiceFromControl, choiceLabel, isOtherChoice, otherChoiceToken } from "./choices";
import {dividerStyle} from "./advanced-fields";
import {applyFormLayout} from "./form-layouts";
import { initializeFieldDefaults } from "./field-defaults";
import { useLoad } from "./model";
import type { DefaultUser } from "./field-model";
import { QueryTableField } from "./QueryTableField";
import { DisplayImages, LayoutField, LocationField, RichContent, RichTextField } from "./ExtendedFields";
import { RegionField } from "./RegionField";
import { layoutField } from "./extended-fields";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@/components/overlays/popover";
import * as Progress from "@/components/overlays/progress";
import { Check, ChevronDown, HelpCircle } from "@/shared/icons/catalog";
import { CloseAction } from "@/shared/icons/motion";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { Checkbox } from "@/components/motion/checkbox";
import { Tooltip } from "@/components/motion/tooltip";
import { DatePicker } from "@/components/date-picker";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "@/components/motion/combobox";
import { cn } from "@/lib/utils";
import { type Directory } from "@/organization/model";
import { PeoplePickerField } from "@/organization/PeoplePicker";
import { appearanceStyle, coverPresets, defaultAppearance, fieldColumn, fieldGridStyle, fieldRows, fieldValueLabel, isFieldVisible, isIdentifier, renderFieldSpan, resolveFieldRules, scopedDirectory, textLimit, type LowcodeField, type TableSchema } from "./field-model";

import { SignatureField, SignatureImage } from "./SignatureField";
import { FileField, type FileContext } from "./FileField";
import { InlineChoiceField, NumericField, RatingField } from "./ValueFields";
import { SubtableField } from "./SubtableField";
import { computedField } from "./calculations";
import { ruleMatches } from "./rules";
import { RelationField } from "./RelationField";
import { LookupContext, useLookupSession } from "./LookupSession";

type Choice = { value: string; label: string; detail?: string; disabled?: boolean; color?: string };

function SinglePicker({ field, value, onChange, choices, disabled, labelId, describedBy, invalid }: {
  field: LowcodeField; value: string; onChange: (value: string) => void; choices: Choice[];
  disabled: boolean; labelId: string; describedBy?: string; invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-0 items-start gap-1">
      <Combobox value={value} onValueChange={onChange} disabled={disabled} open={open} onOpenChange={setOpen} className={cn("min-w-0 flex-1", open && "z-30")}>
        <ComboboxTrigger className="min-w-0">
          <ComboboxInput aria-labelledby={labelId} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-required={field.required} placeholder={field.placeholder || "搜索并选择"} />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxList ariaLabel={field.label}>
            {choices.map((choice) => <ComboboxItem key={choice.value} value={choice.value} textValue={choice.label} keywords={[choice.label, choice.detail ?? ""]} disabled={choice.disabled}>
              {choice.color && <span aria-hidden className="dw-data-field-renderer-1 size-2.5 shrink-0 rounded-full" style={({ "--dw-data-field-renderer-1-background-color": choice.color }) as DataStyle} />}
              <span className="min-w-0"><span className="block truncate">{choice.label}</span>{choice.detail && <small className="block truncate text-muted-foreground">{choice.detail}</small>}</span>
            </ComboboxItem>)}
            <ComboboxEmpty>没有匹配选项</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {value && <Button variant="ghost" size="icon" disabled={disabled} onClick={() => onChange("")} aria-label={`清空${field.label}`} className="mt-1 shrink-0"><CloseAction size={16} /></Button>}
    </div>
  );
}

function MultiPicker({ field, value, onChange, choices, disabled, id, describedBy, invalid }: {
  field: LowcodeField; value: string[]; onChange: (value: string[]) => void; choices: Choice[];
  disabled: boolean; id: string; describedBy?: string; invalid: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = choices.filter((choice) => `${choice.label} ${choice.detail ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  function toggle(next: string) { onChange(value.includes(next) ? value.filter((item) => item !== next) : [...value, next]); }
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <ActionSurface type="button" id={id} disabled={disabled} aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={invalid || undefined}
          className={cn("", "flex min-h-11 items-center justify-between gap-2 text-left", invalid && "")}>
          <span className={cn("flex min-w-0 flex-wrap gap-1", !value.length && "text-muted-foreground")}>
            {value.length ? value.map((selected) => <span key={selected} className="inline-flex max-w-full items-center gap-1 truncate rounded-control bg-muted px-2 py-0.5 text-caption">{choices.find((choice) => choice.value === selected)?.color && <span aria-hidden className="dw-data-field-renderer-2 size-2 shrink-0 rounded-full" style={({ "--dw-data-field-renderer-2-background-color": choices.find((choice) => choice.value === selected)?.color }) as DataStyle} />}{choices.find((choice) => choice.value === selected)?.label ?? `未知选项（${selected.slice(0, 8)}）`}</span>) : field.placeholder || "搜索并选择，可多选"}
          </span><span className="inline-flex size-4 shrink-0 text-muted-foreground"><ChevronDown  /></span>
        </ActionSurface>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content data-dw-surface="popover" align="start" sideOffset={6} collisionPadding={12} aria-label={`选择${field.label}`} className="max-w-popover-viewport p-2">
          <Input aria-label={`搜索${field.label}`} value={query} onChange={setQuery} placeholder="搜索选项或成员" classNames={{ field: "", input: "" }} />
          <div className="mt-2 max-h-60 space-y-1 overflow-y-auto overscroll-contain p-1" role="group" aria-label={field.label}>
            {filtered.map((choice) => <div key={choice.value} className="rounded-control px-2 py-2 hover:bg-muted">
              <div className="flex items-center gap-2"><Checkbox checked={value.includes(choice.value)} onCheckedChange={() => toggle(choice.value)} disabled={disabled || choice.disabled || value.length >= 100 && !value.includes(choice.value)} label={choice.label} className="w-full" />{choice.color && <span aria-hidden className="dw-data-field-renderer-3 size-2.5 shrink-0 rounded-full" style={({ "--dw-data-field-renderer-3-background-color": choice.color }) as DataStyle} />}</div>
              {choice.detail && <p className="ml-8 mt-0.5 truncate text-caption text-muted-foreground">{choice.detail}</p>}
            </div>)}
            {!filtered.length && <p className="px-2 py-5 text-center text-body text-muted-foreground">没有匹配选项</p>}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <Button variant="ghost" size="sm" disabled={disabled || !value.length} onClick={() => onChange([])}>清空</Button>
            <Popover.Close asChild><Button size="sm"><span className="inline-flex size-3.5"><Check  /></span>完成 · {value.length}</Button></Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChoicePicker({field,id,value,onChange,disabled,describedBy,invalid}:{field:LowcodeField;id:string;value:unknown;onChange:(value:unknown)=>void;disabled:boolean;describedBy?:string;invalid:boolean}) {
  const token=otherChoiceToken(field), selected=choiceControlValue(field,value), other=(Array.isArray(value)?value:[value]).find(isOtherChoice);
  const controlField:LowcodeField=field.choiceConfig?.allowOther?{...field,options:[...(field.options??[]),token],choiceConfig:{...field.choiceConfig,displayLabels:{...field.choiceConfig.displayLabels,[token]:field.choiceConfig.otherLabel??"其他"}}}:field;
  const choices=(controlField.options??[]).map(key=>({value:key,label:choiceLabel(controlField,key),color:field.choiceConfig?.colors?.[key]}));
  const change=(next:string|string[])=>onChange(choiceFromControl(field,next,value));
  return <div className="min-w-0 space-y-2">
    {field.choiceConfig?.style&&field.choiceConfig.style!=="dropdown"?<InlineChoiceField field={controlField} id={id} value={selected} onChange={change} disabled={disabled} describedBy={describedBy} invalid={invalid}/>
      :field.type==="select"?<SinglePicker field={controlField} value={typeof selected==="string"?selected:""} onChange={change} choices={choices} disabled={disabled} labelId={`${id}-label`} describedBy={describedBy} invalid={invalid}/>
      :<MultiPicker field={controlField} value={Array.isArray(selected)?selected:[]} onChange={change} choices={choices} disabled={disabled} id={id} describedBy={describedBy} invalid={invalid}/>}
    {other&&<Input id={`${id}-other`} label={`${field.label} · ${field.choiceConfig?.otherLabel??"其他"}补充文字`} value={other.other} onChange={text=>onChange(changeOtherText(value,text))} maxLength={field.choiceConfig?.otherMaxLength??500} disabled={disabled} aria-required aria-describedby={describedBy} error={invalid}/>}
  </div>;
}

export function FieldRenderer({ schema: sourceSchema, value, onChange, directory, readOnly = false, errors = {}, disabled = false, mode = "create", fileContext, onUploadingChange, originalValue, fieldPathPrefix, onResolvingChange, contextFields, contextValues }: {
  schema: TableSchema; contextFields?:LowcodeField[]; contextValues?:Record<string,unknown>; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void;
  directory: Directory; readOnly?: boolean; errors?: Record<string, string>; disabled?: boolean; mode?: "create" | "edit"; fileContext?: FileContext; onUploadingChange?: (busy: boolean) => void; originalValue?: Record<string, unknown>; fieldPathPrefix?: string; onResolvingChange?: (busy: boolean) => void;
}) {
  const [layoutChoice,setLayoutChoice]=useState<string|null>(null);
  const selectedLayout=layoutChoice!==null && (!layoutChoice || sourceSchema.layouts?.some(layout=>layout.id===layoutChoice)) ? layoutChoice : sourceSchema.defaultLayoutId??"";
  const schema=useMemo(()=>applyFormLayout(sourceSchema,selectedLayout),[sourceSchema,selectedLayout]);
  const rendererId = useId();
  const initialSnapshot = useRef(value), changeCallback = useRef(onChange); changeCallback.current = onChange;
  const initializeDefaults = mode === "create" && originalValue === undefined && !readOnly;
  const me = useLoad<DefaultUser>(initializeDefaults && schema.fields.some(field => field.defaultConfig?.source === "INITIATOR_DEPARTMENT") ? "/api/v1/me" : undefined);
  const defaultSnapshots = useRef<Record<string, unknown>>({});
  const localDefaults = initializeDefaults ? initializeFieldDefaults(schema, value, { user: me.data, directory: directory.people.length || directory.units.length ? directory : undefined }) : { values: value, errors: {} };
  const baseContext = { mode, referenceFields:contextFields, referenceValues:contextValues, existing: originalValue ?? { ...initialSnapshot.current, ...defaultSnapshots.current, ...Object.fromEntries(Object.entries(localDefaults.values).filter(([id]) => !Object.hasOwn(value, id))) } };
  const resolvingSources=useRef(new Set<string>()),resolvingCallback=useRef(onResolvingChange);resolvingCallback.current=onResolvingChange;
  const resolvingChanged=useCallback((source:string,busy:boolean)=>{const before=resolvingSources.current.size>0;if(busy)resolvingSources.current.add(source);else resolvingSources.current.delete(source);const after=resolvingSources.current.size>0;if(before!==after)resolvingCallback.current?.(after);},[]);
  const lookupResolving=useCallback((busy:boolean)=>resolvingChanged("lookup",busy),[resolvingChanged]),eventResolving=useCallback((busy:boolean)=>resolvingChanged("event",busy),[resolvingChanged]);
  useEffect(()=>()=>{resolvingSources.current.clear();resolvingCallback.current?.(false);},[]);
  const lookups = useLookupSession(schema, localDefaults.values, baseContext, !readOnly && !disabled, lookupResolving, initializeDefaults);
  const defaults = initializeDefaults ? initializeFieldDefaults(schema, localDefaults.values, { user: me.data, directory: directory.people.length || directory.units.length ? directory : undefined, lookupResolver: lookups.resolve }) : localDefaults;
  for (const field of schema.fields) if (field.defaultConfig && !Object.hasOwn(value, field.id) && Object.hasOwn(defaults.values, field.id)) defaultSnapshots.current[field.id] = defaults.values[field.id];
  baseContext.existing = originalValue ?? { ...baseContext.existing, ...defaultSnapshots.current };
  const ruleContext = { ...baseContext, lookupResolver: lookups.resolve };
  const resolved = readOnly ? {
    values: value,
    visible: Object.fromEntries(schema.fields.map((field) => [field.id, !field.visibleWhen || ruleMatches(field.visibleWhen, value, schema.fields)])),
    required: Object.fromEntries(schema.fields.map((field) => [field.id, !!field.required])),
    warnings: Object.fromEntries(schema.fields.map((field) => [field.id, (field.warningRules ?? []).filter((warning) => ruleMatches(warning.condition, value, schema.fields))])),
    errors: {},
  } : resolveFieldRules(schema, defaults.values, ruleContext);
  errors = { ...localDefaults.errors, ...defaults.errors, ...resolved.errors, ...errors };
  const referenceFields=mergeReferenceFields(schema.fields,contextFields),referenceValues=mergeReferenceValues(schema.fields,resolved.values,contextFields,contextValues);
  const visibleFields = schema.fields.filter((field) => isFieldVisible(field, mode, readOnly) && resolved.visible[field.id]).map((field) => ({ ...field, required: resolved.required[field.id] }));
  const latestValues = useRef(value); latestValues.current = value;
  const events=useFieldEvents(sourceSchema,fileContext,!readOnly&&!disabled&&!fieldPathPrefix,patch=>{
    const current=latestValues.current,visibility=resolveFieldRules(schema,current,ruleContext).visible,next={...current};
    for(const [id,entry] of Object.entries(patch)){const field=schema.fields.find(field=>field.id===id);if(field&&fieldEventField(field)&&isFieldVisible(field,mode)&&visibility[id])next[id]=entry;}
    const prepared=resolveFieldRules(schema,next,ruleContext).values;latestValues.current=prepared;changeCallback.current(prepared);
  },eventResolving);

  useEffect(() => {
    if (readOnly || disabled) return;
    const keys = new Set([...Object.keys(value), ...Object.keys(resolved.values)]);
    if ([...keys].some((key) => JSON.stringify(value[key]) !== JSON.stringify(resolved.values[key]))) { latestValues.current = resolved.values; changeCallback.current(resolved.values); }
  }, [value, schema, originalValue, mode, readOnly, disabled, lookups]);
  const uploadingFields = useRef(new Set<string>()), uploadingCallback = useRef(onUploadingChange);
  uploadingCallback.current = onUploadingChange;
  const uploadingChanged = useCallback((fieldId: string, busy: boolean) => {
    const previous = uploadingFields.current.size > 0;
    if (busy) uploadingFields.current.add(fieldId); else uploadingFields.current.delete(fieldId);
    const current = uploadingFields.current.size > 0;
    if (previous !== current) uploadingCallback.current?.(current);
  }, []);
  useEffect(() => () => { uploadingFields.current.clear(); uploadingCallback.current?.(false); }, []);
  const appearance = { ...defaultAppearance, ...schema.appearance };
  const visibleById = new Map(visibleFields.map((field) => [field.id, field]));
  const topErrors = [...new Set(Object.entries(errors).filter(([key]) => key === "_form" || !visibleById.has(key.split(".")[0])).map(([key, message]) => key === "_form" ? message : `${schema.fields.find((field) => field.id === key.split(".")[0])?.label ?? "字段"}：${message}`))];
  const assigned = new Set(schema.fields.filter(layoutField).flatMap((field) => field.layoutConfig?.sections.flatMap((section) => section.fieldIds) ?? []));
  const rootFields = schema.fields.filter((field) => !assigned.has(field.id));
  const renderedRows = (appearance.columns === 1 ? rootFields.map((field) => [field]) : fieldRows(rootFields)).map((row) => ({ id: row[0].id, fields: row.flatMap((field) => visibleById.has(field.id) ? [visibleById.get(field.id)!] : []) })).filter((row) => row.fields.length);
  const cover = coverPresets.find((entry) => entry.value === appearance.cover) ?? coverPresets[0];
  function change(field: LowcodeField, next: unknown) {
    if (disabled || readOnly || field.readOnly || computedField(field) || !isFieldVisible(field, mode) || field.type === "serial" || !resolveFieldRules(schema, latestValues.current, ruleContext).visible[field.id]) return;
    const values = { ...latestValues.current };
    if (next === undefined || next === "" || Array.isArray(next) && !next.length) { if (field.defaultConfig) values[field.id] = null; else delete values[field.id]; }
    else values[field.id] = next;
    const nextValues = resolveFieldRules(schema, values, ruleContext).values;
    const changed=JSON.stringify(latestValues.current[field.id])!==JSON.stringify(nextValues[field.id]);
    latestValues.current = nextValues; onChange(nextValues);
    if(changed)events.change(field.id,nextValues);
  }
  function choices(field: LowcodeField): Choice[] {
    if (["department", "departments"].includes(field.type)) return directory.units.filter((unit) => unit.kind === "DEPARTMENT").map((unit) => ({ value: unit.id, label: unit.name }));
    if (["position", "positions"].includes(field.type)) return directory.positions.map((position) => ({ value: position.id, label: position.name }));
    return (field.options ?? []).map((option) => ({ value: option, label: choiceLabel(field,option), color: field.choiceConfig?.colors?.[option] }));
  }
  function renderField(field: LowcodeField) {
          const id = `${rendererId}-${field.id}`, referenceIssue=fieldReferenceIssues(field,referenceFields)[0], error = errors[field.id] ?? (referenceIssue?`关联配置或依赖字段不可用：${referenceIssue}`:undefined);
          const describedBy = [field.help ? `${id}-help` : "", error ? `${id}-error` : "", ...resolved.warnings[field.id].map((warning) => `${id}-warning-${warning.id}`)].filter(Boolean).join(" ") || undefined;
          const width = renderFieldSpan(field, appearance.columns);
          const current = resolved.values[field.id];
          const combo = ["select", "department", "position"].includes(field.type);
          const locked = disabled || !!field.readOnly || field.type === "serial" || computedField(field);
          const attrs = { id, disabled: locked, "aria-required": field.required, "aria-invalid": !!error, "aria-describedby": describedBy };
          let content;
          if (field.type === "heading") content = <div><h3 className="border-l-4 border-primary bg-primary/5 px-3 py-2.5 text-body font-semibold">{field.label}</h3>{field.help && <p className="mt-1 text-body text-muted-foreground">{field.help}</p>}</div>;
          else if (field.type === "remark") content = <RichContent value={field.richContent} />;
          else if (field.type === "queryTable") content = <QueryTableField field={field} values={referenceValues} recordId={fileContext?.recordId}/>;
          else if (field.type === "displayImage") content = <DisplayImages field={field} context={fileContext} />;
          else if (layoutField(field)) content = <LayoutField field={field} errors={errors} render={(ids) => fieldRows(ids.flatMap((key) => visibleById.has(key) ? [visibleById.get(key)!] : [])).map((fields) => <div key={fields[0].id} className="grid grid-cols-12 gap-x-4 gap-y-4">{fields.map(renderField)}</div>)} />;
          else if (field.type === "divider") content = <hr className="my-2 border-border" data-field-divider style={{"--divider-style": dividerStyle(field).borderTopStyle, "--divider-color": dividerStyle(field).borderTopColor, "--divider-width": cssLength(dividerStyle(field).borderTopWidth)} as DataStyle} aria-label={field.label} />;
          else if (field.type === "subtable") content = <div><label id={`${id}-label`} className="mb-2 block text-body font-medium">{field.label}{field.required && <span className="ml-1 text-destructive">*</span>}</label>
            {field.help && (field.helpDisplay === "tooltip" ? <div className="mb-2"><Tooltip content={field.help} className="max-w-xs"><ActionSurface type="button" className="inline-flex items-center gap-1" aria-label={`${field.label}填写说明`}><span className="inline-flex size-3.5"><HelpCircle  /></span>填写说明</ActionSurface></Tooltip></div> : <p className="mb-2 whitespace-pre-wrap text-caption text-muted-foreground">{field.help}</p>)}
            <SubtableField field={field} value={current} originalValue={ruleContext.existing[field.id]} onChange={(next) => change(field, next)} directory={directory} disabled={locked} readOnly={readOnly || !!field.readOnly} mode={mode} fileContext={fileContext} errors={errors} onUploadingChange={(busy) => uploadingChanged(field.id, busy)} />{error && <p id={`${id}-error`} role="alert" className="mt-2 text-caption text-destructive">{error}</p>}</div>;
          else if (readOnly) content = <dl>
            <dt id={`${id}-label`} className="text-body text-muted-foreground">{field.label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-body leading-6">{field.type === "richtext" ? <RichContent value={current} /> : field.type === "relation" ? referenceIssue?<span role="alert" className="text-destructive">{error}</span>:<RelationField field={field} fields={referenceFields} id={id} values={referenceValues} value={current} onChange={() => {}} readOnly /> : field.type === "signature" ? <SignatureImage value={current} label={field.label} height={field.signatureHeight ?? 180} /> : ["image", "attachment"].includes(field.type) ? <FileField id={id} field={field} value={current} onChange={() => {}} context={fileContext} readOnly /> : fieldValueLabel(field, current, directory)}
              {field.type === "progress" && typeof current === "number" && <Progress.Root value={current} max={100} aria-label={field.label} className="mt-2"><Progress.Indicator className="dw-data-field-renderer-4" style={({ "--dw-data-field-renderer-4-width": cssLength(`${Math.min(100, Math.max(0, current))}%`) }) as DataStyle} /></Progress.Root>}
            </dd>
          </dl>;
          else content = <>
            {field.type !== "checkbox" && (combo ? <span id={`${id}-label`} className="mb-1.5 block text-body font-medium">{field.label}{field.required && <span className="ml-1 text-destructive" aria-label="必填">*</span>}</span>
              : <label id={`${id}-label`} htmlFor={id} className="mb-1.5 block text-body font-medium">{field.label}{field.required && <span className="ml-1 text-destructive" aria-label="必填">*</span>}</label>)}
            {field.help && field.helpDisplay === "tooltip" && <div className="mb-1.5"><Tooltip content={field.help} className="max-w-xs"><ActionSurface type="button" className="inline-flex items-center gap-1" aria-label={`${field.label}填写说明`}><span className="inline-flex size-3.5"><HelpCircle  /></span>填写说明</ActionSurface></Tooltip><span id={`${id}-help`} className="sr-only">{field.help}</span></div>}
            {field.type === "richtext" ? <RichTextField id={id} value={current} onChange={(next) => change(field, next)} disabled={locked} label={field.label} required={field.required} invalid={!!error} describedBy={describedBy} maxLength={field.maxLength} />
              : field.type === "location" ? <LocationField id={id} field={field} value={current} onChange={(next) => change(field, next)} disabled={locked} />
              : field.type === "region" ? <RegionField id={id} field={field} value={current} onChange={(next) => change(field, next)} disabled={locked} />
              : field.type === "relation" ? referenceIssue?<div className="rounded-card border border-border bg-muted/30 px-3 py-2 text-body text-muted-foreground">关联字段暂不可用</div>:<RelationField field={field} fields={referenceFields} id={id} values={referenceValues} value={current} onChange={(next) => change(field, next)} disabled={locked} readOnly={!!field.readOnly} invalid={!!error} describedBy={describedBy} />
              : field.type === "signature" ? <SignatureField id={id} label={field.label} value={current} onChange={(next) => change(field, next)} disabled={locked} invalid={!!error} describedBy={describedBy} required={field.required} height={field.signatureHeight} />
              : ["image", "attachment"].includes(field.type) ? <FileField id={id} field={fieldPathPrefix ? { ...field, id: `${fieldPathPrefix}.${field.id}` } : field} value={current} onChange={(next) => change(field, next)} context={fileContext} disabled={locked} describedBy={describedBy} invalid={!!error} onUploadingChange={(busy) => uploadingChanged(field.id, busy)} />
              : computedField(field) ? <div id={id} aria-describedby={describedBy} className="rounded-card border border-border bg-muted/30 px-3 py-2 text-body tabular-nums">{fieldValueLabel(field, current, directory)}<span className="ml-2 text-caption text-muted-foreground">{field.type === "lookup" ? (() => { const query = referenceLookupQuery(field, referenceValues, referenceFields); return query && lookups.pending(query) && !disabled ? "正在查询…" : "查询快照"; })() : "自动计算"}</span>{field.type === "lookup" && error && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => { const query = referenceLookupQuery(field, referenceValues, referenceFields); if (query) lookups.retry(query); }}>重试查询</Button>}</div>
              : field.type === "rating" ? <RatingField id={id} field={field} value={current} onChange={(next) => change(field, next)} disabled={locked} describedBy={describedBy} invalid={!!error} />
              : field.type === "time" ? <Input {...attrs} type="time" step={field.timePrecision === "second" ? 1 : 60} value={String(current ?? "")} onChange={(next) => change(field, field.timePrecision === "second" && next.length === 5 ? `${next}:00` : next)} error={!!error} />
              : field.type === "textarea" ? <MultilineEntry {...attrs} inputMode={field.advancedConfig?.inputMode} rows={field.rows ?? 4} maxLength={field.maxLength ?? 10000} placeholder={field.placeholder} className={cn("", error && "")} value={String(current ?? "")} onChange={(event) => change(field, event.target.value)} />
              : field.type === "checkbox" ? <div role="group" aria-required={field.required} aria-invalid={!!error} aria-describedby={describedBy} className="pt-1.5">
                <Checkbox id={id} checked={current === true} onCheckedChange={(next) => change(field, next)} disabled={locked} label={`${field.label}${field.required ? " *" : ""}`} aria-describedby={describedBy} />
                {current === undefined && <p className="mt-1 text-caption text-muted-foreground">尚未选择{field.required ? "，请确认是或否" : ""}</p>}
                {current === undefined && <Button size="sm" variant="ghost" disabled={locked} onClick={() => change(field, false)} className="mt-1">选择否</Button>}
              </div>
                : field.type === "member" ? <PeoplePickerField id={id} directory={scopedDirectory(field, directory)} value={typeof current === "string" && current ? [current] : []} onChange={(ids) => change(field, ids[0] ?? "")} multiple={false} disabled={locked} placeholder={field.placeholder || "选择人员"} label={field.label} describedBy={describedBy} invalid={!!error} required={field.required} />
                  : field.type === "members" ? <PeoplePickerField id={id} directory={scopedDirectory(field, directory)} value={Array.isArray(current) ? current as string[] : []} onChange={(ids) => change(field, ids)} multiple limit={100} disabled={locked} placeholder={field.placeholder || "选择人员"} label={field.label} describedBy={describedBy} invalid={!!error} required={field.required} />
                  : ["select", "multiselect"].includes(field.type) ? <ChoicePicker field={field} id={id} value={current} onChange={(next) => change(field, next)} disabled={locked} describedBy={describedBy} invalid={!!error} />
                  : combo ? <SinglePicker field={field} value={typeof current === "string" ? current : ""} onChange={(next) => change(field, next)} choices={choices(field)} disabled={locked} labelId={`${id}-label`} describedBy={describedBy} invalid={!!error} />
                  : ["multiselect", "departments", "positions"].includes(field.type) ? <MultiPicker field={field} value={Array.isArray(current) ? current as string[] : []} onChange={(next) => change(field, next)} choices={choices(field)} disabled={locked} id={id} describedBy={describedBy} invalid={!!error} />
                    : field.type === "progress" ? <div className="space-y-2">
                      <div className="flex items-center gap-3"><TextEntry {...attrs} type="range" className="min-w-0 flex-1" min={Number(field.minimum ?? 0)} max={Number(field.maximum ?? 100)} step={1} value={typeof current === "number" ? current : Number(field.minimum ?? 0)} onChange={(event) => change(field, Number(event.target.value))} />
                        <div className="w-32 shrink-0"><NumericField field={{ ...field, numericConfig: { unit: "%", ...field.numericConfig } }} id={`${id}-number`} value={current} disabled={locked} describedBy={describedBy} invalid={!!error} onChange={(next) => change(field, next)} /></div>
                      </div>
                      <Progress.Root value={typeof current === "number" ? current : 0} max={100} aria-label={`${field.label}显示`} ><Progress.Indicator className="dw-data-field-renderer-5" style={({ "--dw-data-field-renderer-5-width": cssLength(`${Math.min(100, Math.max(0, Number(current ?? 0)))}%`) }) as DataStyle} /></Progress.Root>
                    </div>
                      : field.type === "date" || field.type === "datetime" ? <DatePicker
                          id={id}
                          value={typeof current === "string" ? current : ""}
                          withTime={field.type === "datetime"}
                          placeholder={field.placeholder || (field.type === "datetime" ? "选择日期和时间" : "选择日期")}
                          disabled={locked}
                          error={!!error}
                          min={field.minimum}
                          max={field.maximum}
                          onChange={(next) => change(field, next)}
                          aria-labelledby={`${id}-label`}
                          aria-required={field.required}
                          aria-invalid={!!error}
                          aria-describedby={describedBy}
                        />
                      : field.type === "number" && !isIdentifier(field) ? <NumericField id={id} field={field} value={current} onChange={(next) => change(field, next)} disabled={locked} describedBy={describedBy} invalid={!!error} />
                      : <Input {...attrs} type={field.type === "phone" ? "tel" : ["number", "email", "url"].includes(field.type) && !isIdentifier(field) ? field.type : "text"}
                        step={field.type === "number" ? field.format === "integer" ? "1" : field.format === "currency" ? "0.01" : "any" : undefined}
                        inputMode={field.advancedConfig?.inputMode ?? (isIdentifier(field) && field.format !== "idCard" && field.type !== "idCard" ? "numeric" : undefined)}
                        rightIcon={field.format === "percent" ? <span className="pr-3 text-body">%</span> : undefined}
                        min={field.minimum} max={field.maximum}
                        maxLength={isIdentifier(field) ? field.format === "idCard" || field.type === "idCard" ? 18 : field.format === "phone" ? 11 : 128 : field.maxLength ?? textLimit(field.type)} placeholder={field.type === "serial" ? "首次保存时自动生成" : field.placeholder} error={!!error}
                        value={String(current ?? "")}
                        onChange={(next) => change(field, next === "" ? undefined : field.type === "number" && !isIdentifier(field) ? Number(next) : next)} />}
            {field.type === "serial" && !current && <p className="mt-1 text-caption text-muted-foreground">首次保存后生成编号，后续修改保持不变。</p>}
            {field.readOnly && field.type !== "serial" && <p className="mt-1 text-caption text-muted-foreground">只读</p>}
            {field.help && field.helpDisplay !== "tooltip" && <p id={`${id}-help`} className="mt-1.5 whitespace-pre-wrap text-caption leading-5 text-muted-foreground">{field.help}</p>}
            {error && <p id={`${id}-error`} role="alert" className="mt-1 text-caption text-destructive">{error}</p>}
          </>;
          return <div key={field.id} className="min-w-0 @max-[559px]:!col-start-1 @max-[559px]:!col-span-12" data-field-grid style={{"--field-grid": fieldGridStyle(width, appearance.columns === 1 ? 1 : fieldColumn(field)).gridColumn} as DataStyle}>{content}
            {resolved.warnings[field.id].map((warning) => <p key={warning.id} id={`${id}-warning-${warning.id}`} role="status" className={cn("mt-2 rounded-control border px-3 py-2 text-caption leading-5", warning.color === "red" ? "border-destructive/50 bg-destructive/5 text-destructive dark:text-destructive" : warning.color === "blue" ? "border-status-info/50 bg-status-info/5 text-status-info dark:text-status-info" : "border-status-warning/50 bg-status-warning/5 text-status-warning dark:text-status-warning")}>{warning.message}</p>)}
          </div>;
  }
  return (
    <LookupContext.Provider value={lookups}>
    <section style={{"--primary": appearanceStyle(appearance)["--primary"], "--primary-foreground": appearanceStyle(appearance)["--primary-foreground"], "--ring": appearanceStyle(appearance)["--ring"], "--lc-accent": appearanceStyle(appearance)["--lc-accent"]} as DataStyle} className={cn("@container min-w-0", appearance.density === "compact" ? "space-y-4" : "space-y-6")} aria-label={schema.name || "表单字段"}>
      {cover.value !== "none" && <div aria-hidden="true" className={cn("h-24 rounded-card border border-border/50 sm:h-32", cover.className)} />}
      {(schema.name || schema.description) && <header className="border-l-3 border-primary pl-4">
        {schema.name && <h2 className="break-words text-title font-semibold tracking-tight">{schema.name}</h2>}
        {schema.description && <p className="mt-2 whitespace-pre-wrap break-words text-body leading-6 text-muted-foreground">{schema.description}</p>}
      </header>}
      {!!sourceSchema.layouts?.length && <label className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">表单布局<SelectEntry aria-label="表单布局" className="max-w-full" value={selectedLayout} onChange={event=>setLayoutChoice(event.target.value)}><option value="">原始布局</option>{sourceSchema.layouts.map(layout=><option key={layout.id} value={layout.id}>{layout.name}</option>)}</SelectEntry></label>}
      <FieldEventStatus states={events.states} retry={events.retry} disabled={disabled}/>
      {topErrors.map((error, index) => <p key={index} role="alert" className="text-body text-destructive">{error}</p>)}
      <div className={cn(appearance.density === "compact" ? "space-y-3" : "space-y-6")}>
        {renderedRows.map(({ id: rowId, fields: row }) => (
        <div key={rowId} className={cn("grid grid-cols-12", appearance.density === "compact" ? "gap-x-4" : "gap-x-6")}>
        {row.map(renderField)}
        </div>
        ))}
      </div>
    </section>
    </LookupContext.Provider>
  );
}
