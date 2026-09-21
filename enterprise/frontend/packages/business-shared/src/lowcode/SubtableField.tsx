import {Checkbox} from "@/components/motion/checkbox";
import {copySubtableRows,subtablePolicy} from "./advanced-fields";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "@/shared/icons/catalog";
import { CopyAction, PlusAction, TrashAction } from "@/shared/icons/motion";
import { Button } from "@/shared/ui";
import type { Directory } from "@/organization/model";
import { FieldRenderer } from "./FieldRenderer";
import { defaultAppearance, initialValues, subtableSchema, type DefaultUser, type LowcodeField, type SubtableRow } from "./field-model";
import type { FileContext } from "./FileField";
import { useLoad } from "./model";

export function SubtableField({ field, value, originalValue, onChange, directory, disabled, readOnly = false, mode, fileContext, errors = {}, onUploadingChange }: {
  field: LowcodeField; value: unknown; originalValue?: unknown; onChange: (value: SubtableRow[]) => void; directory: Directory; disabled: boolean; readOnly?: boolean; mode: "create" | "edit"; fileContext?: FileContext; errors?: Record<string, string>; onUploadingChange?: (busy: boolean) => void;
}) {
  const policy=subtablePolicy(field),schema = subtableSchema(field), needsUser = !readOnly && schema.fields.some((child) => child.defaultSource === "initiator");
  const me = useLoad<DefaultUser>(needsUser ? "/api/v1/me" : undefined);
  const rows = Array.isArray(value) ? value.filter((row): row is SubtableRow => row && typeof row.id === "string" && row.values && typeof row.values === "object") : [];
  const originals = Array.isArray(originalValue) ? originalValue as SubtableRow[] : [];
  const newSnapshots = useRef(new Map<string, Record<string, unknown>>()), latest = useRef(rows); latest.current = rows;
  const uploads = useRef(new Set<string>()), callback = useRef(onUploadingChange); callback.current = onUploadingChange;
  const [uploading, setUploading] = useState(false), [expanded, setExpanded] = useState(new Set<string>()),[selected,setSelected]=useState(new Set<string>());
  useEffect(() => () => { uploads.current.clear(); callback.current?.(false); }, []);
  function uploadChanged(id: string, busy: boolean) {
    const wasBusy = uploads.current.size > 0;
    if (busy) uploads.current.add(id); else uploads.current.delete(id);
    const isBusy = uploads.current.size > 0;
    if (wasBusy !== isBusy) { setUploading(isBusy); callback.current?.(isBusy); }
  }
  function publish(next: SubtableRow[]) { latest.current = next; onChange(next); }
  function addRow() {
    if (!policy.allowAdd || disabled || readOnly || uploading || rows.length >= (field.subtableConfig?.maxRows ?? 50) || needsUser && !me.data) return;
    const id = crypto.randomUUID(), values = initialValues(schema, me.data, undefined, mode !== "edit");
    newSnapshots.current.set(id, values); setExpanded((existing) => new Set([...existing, id])); publish([...latest.current, { id, values }]);
  }
  function copy(ids:string[]){if(disabled||readOnly||uploading)return;const next=copySubtableRows(field,latest.current,ids);if(next===latest.current)return;const addedIds=next.slice(latest.current.length).map(row=>row.id);setExpanded(current=>new Set([...current,...addedIds]));setSelected(new Set());publish(next);}
  function move(id: string, direction: -1 | 1) {
    if (disabled || readOnly || uploading) return;
    const next = [...latest.current], index = next.findIndex((row) => row.id === id), target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; publish(next);
  }
  return <div className="min-w-0 space-y-3" role="group" aria-label={field.label}>
    {!readOnly&&policy.allowAdd&&policy.allowCopy&&rows.length>0&&<div className="flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" disabled={disabled||uploading||!selected.size||rows.length+selected.size>(field.subtableConfig?.maxRows??50)} onClick={()=>copy([...selected])}><CopyAction size={14}/>复制所选行（{selected.size}）</Button><span className="text-caption text-muted-foreground">展开行后选择需要复制的明细。</span></div>}
    {!rows.length && <p className="rounded-card border border-dashed border-border p-4 text-center text-body text-muted-foreground">暂无明细</p>}
    {rows.map((row, index) => {
      const original = originals.find((entry) => entry.id?.toLowerCase() === row.id.toLowerCase());
      if (!original && !newSnapshots.current.has(row.id)) newSnapshots.current.set(row.id, { ...initialValues(schema, me.data, undefined, mode !== "edit"), ...row.values });
      const prefix = `${field.id}.${row.id}.`, childErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith(prefix)).map(([key, message]) => [key.slice(prefix.length), message]));
      const hasErrors = Object.keys(childErrors).length > 0;
      return <details key={row.id} open={readOnly || hasErrors || expanded.has(row.id)} onToggle={(event) => { const open = event.currentTarget.open; setExpanded((current) => { const next = new Set(current); if (open) next.add(row.id); else next.delete(row.id); return next; }); }} className={`min-w-0 rounded-card border border-border bg-background ${policy.density==="compact"?"p-2":"p-3 sm:p-4"}`} data-row-density={policy.density}>
        <summary className="cursor-pointer text-body font-medium">第 {index + 1} 行{hasErrors && <span className="ml-2 text-caption text-destructive">请检查此行</span>}</summary>
        <div className={policy.density==="compact"?"mt-2 space-y-2":"mt-4 space-y-3"}>{!readOnly&&policy.allowAdd&&policy.allowCopy&&<Checkbox label={`选择第 ${index+1} 行`} disabled={disabled||uploading} checked={selected.has(row.id)} onCheckedChange={checked=>setSelected(current=>{const next=new Set(current);if(checked)next.add(row.id);else next.delete(row.id);return next;})}/>}<FieldRenderer schema={{ ...schema, appearance: { ...defaultAppearance, columns: 2, density: policy.density } }} value={row.values} originalValue={original?.values ?? (mode === "edit" ? newSnapshots.current.get(row.id) : undefined)} mode={mode} directory={directory} disabled={disabled} readOnly={readOnly} fileContext={fileContext} fieldPathPrefix={field.id} errors={childErrors} onUploadingChange={(busy) => uploadChanged(row.id, busy)} onChange={(values) => { if (!disabled && !readOnly) publish(latest.current.map((entry) => entry.id === row.id ? { ...entry, values } : entry)); }} />
          {!readOnly && <div className="flex flex-wrap justify-end gap-1 border-t border-border pt-2"><Button variant="ghost" size="sm" disabled={disabled || uploading || index === 0} aria-label={`上移第 ${index + 1} 行`} onClick={() => move(row.id, -1)}><span className="inline-flex size-3.5"><ArrowUp  /></span>上移</Button><Button variant="ghost" size="sm" disabled={disabled || uploading || index === rows.length - 1} aria-label={`下移第 ${index + 1} 行`} onClick={() => move(row.id, 1)}><span className="inline-flex size-3.5"><ArrowDown  /></span>下移</Button>{policy.allowAdd&&policy.allowCopy&&<Button variant="ghost" size="sm" disabled={disabled||uploading||rows.length>=(field.subtableConfig?.maxRows??50)} aria-label={`复制第 ${index+1} 行`} onClick={()=>copy([row.id])}><CopyAction size={14}/>复制此行</Button>}{policy.allowDelete&&<Button variant="ghost" size="sm" disabled={disabled || uploading} aria-label={`删除第 ${index + 1} 行`} onClick={() => { if(!policy.allowDelete)return;newSnapshots.current.delete(row.id);setSelected(current=>{const next=new Set(current);next.delete(row.id);return next;}); publish(latest.current.filter((entry) => entry.id !== row.id)); }}><TrashAction size={14} />删除此行</Button>}</div>}
        </div>
      </details>;
    })}
    {!readOnly && <div className="flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" disabled={!policy.allowAdd || disabled || uploading || rows.length >= (field.subtableConfig?.maxRows ?? 50) || needsUser && !me.data} onClick={addRow}><PlusAction size={14} />添加一行</Button><span className="text-caption text-muted-foreground">{rows.length} / {field.subtableConfig?.maxRows ?? 50} 行{!policy.allowAdd&&"，已禁止新增"}{(field.subtableConfig?.minRows ?? 0) > 0 && `，提交时至少 ${field.subtableConfig!.minRows} 行`}</span>{needsUser && me.error && <p role="alert" className="text-caption text-destructive">无法获取默认发起人：{me.error}</p>}</div>}
  </div>;
}
