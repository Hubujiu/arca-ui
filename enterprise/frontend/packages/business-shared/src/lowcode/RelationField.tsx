import { OptionList } from "@/components/controls";
import { ActionSurface } from "@/components/controls";
import { CascadeRelationField } from "./CascadeRelationField";
import { RelationCreateAction } from "./RelationCreateAction";
import { appendCreatedRelation } from "./relation-create";
import { filterSourceValues } from "./relation-filters";
import { useEffect, useRef, useState } from "react";
import * as Popover from "@/components/overlays/popover";
import { Check, ChevronDown } from "@/shared/icons/catalog";
import { CloseAction, RefreshAction, RunningIcon } from "@/shared/icons/motion";
import { Button, Input } from "@/shared/ui";
import { api } from "@/shared/api/client";
import { cn } from "@/lib/utils";
import { type LowcodeField } from "./field-model";
import { relationLimit, resolveRelation, validateRelation, type RelationItem, type RelationPage } from "./relations";

type RelationFieldProps = { field: LowcodeField; value: unknown; onChange: (value: string[]) => void; id: string; disabled?: boolean; readOnly?: boolean; invalid?: boolean; describedBy?: string; values?:Record<string,unknown>;fields?:LowcodeField[] };
export function RelationField(props:RelationFieldProps) {
  const config=props.field.relationConfig,dependencyError=!!config?.targets?.length&&validateRelation(config,props.fields??[]).length>0,target=config&&!dependencyError?resolveRelation(config,props.values??{},props.fields??[]):undefined;
  const key=JSON.stringify([target?.tableId,target?.cascade]),previous=useRef(key);
  useEffect(()=>{if(previous.current!==key&&target&&!props.readOnly&&!props.disabled&&Array.isArray(props.value)&&props.value.length)props.onChange([]);previous.current=key;},[key]);
  const resolved={...props,field:{...props.field,relationConfig:target}};
  return <>{target?.cascade?<CascadeRelationField key={key} {...resolved}/>:<PlainRelationField key={key} {...resolved}/>} {dependencyError&&<p role="alert" className="text-caption text-muted-foreground">条件来源依赖字段当前不可见或配置无效，暂时无法选择关联记录。</p>}</>;
}
function PlainRelationField({ field, value, onChange, id, disabled = false, readOnly = false, invalid, describedBy,values={} }:RelationFieldProps) {
  const config = field.relationConfig, ids = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [], limit = relationLimit(field);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [term, setTerm] = useState(""), [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [labels, setLabels] = useState<{ key: string; items: RelationItem[]; error?: string }>(), [results, setResults] = useState<{ key: string; items: RelationItem[]; hasMore: boolean; nextOffset?:number; page: number; error?: string }>();
  const canRead = !!config && validateRelation(config).length === 0;
  const filterRequest=config?.filter?{filter:config.filter,sourceValues:filterSourceValues(config.filter,values)}:{};
  const base = JSON.stringify([config?.tableId, config?.titleFieldId,filterRequest]), selectedKey = JSON.stringify([base, ids, refresh]), searchKey = JSON.stringify([base, term, refresh]);
  const searchGeneration = useRef(0);
  useEffect(()=>setPage(0),[base]);
  useEffect(() => { const timer = setTimeout(() => { setTerm(query.trim()); setPage(0); }, 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const refreshLabels = () => { setLabels(undefined); setResults(undefined); setRefresh((current) => current + 1); setPage(0); };
    window.addEventListener("focus", refreshLabels);
    const onVisible = () => { if (document.visibilityState === "visible") refreshLabels(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.removeEventListener("focus", refreshLabels); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  useEffect(() => {
    if (!canRead || !ids.length) return;
    const abort = new AbortController();
    api<RelationPage>("/api/v1/lc/relation-records/search", "POST", { tableId: config!.tableId, titleFieldId: config!.titleFieldId,...filterRequest, ids: ids.slice(0, 50) }, abort.signal).then((page) => {
      if (!abort.signal.aborted) setLabels({ key: selectedKey, items: page.items });
    }).catch((error) => { if (!abort.signal.aborted) setLabels({ key: selectedKey, items: [], error: error instanceof Error ? error.message : "记录读取失败" }); });
    return () => abort.abort();
  }, [selectedKey, canRead]);
  useEffect(() => {
    if (!open || !canRead) return;
    const abort = new AbortController(), generation = ++searchGeneration.current;
    api<RelationPage>("/api/v1/lc/relation-records/search", "POST", { tableId: config!.tableId, titleFieldId: config!.titleFieldId,...filterRequest, q: term, offset: page }, abort.signal).then((next) => {
      if (abort.signal.aborted || generation !== searchGeneration.current) return;
      setResults((old) => ({ key: searchKey, page, items: page > 0 && old?.key === searchKey ? [...old.items, ...next.items.filter((item) => !old.items.some((entry) => entry.id === item.id))] : next.items, hasMore: next.hasMore,nextOffset:next.nextOffset }));
    }).catch((error) => { if (!abort.signal.aborted && generation === searchGeneration.current) setResults({ key: searchKey, items: [], hasMore: false, page, error: error instanceof Error ? error.message : "搜索失败" }); });
    return () => abort.abort();
  }, [open, canRead, searchKey, page]);
  const currentLabels = labels?.key === selectedKey ? labels : undefined, currentResults = results?.key === searchKey ? results : undefined, loading = open && (!currentResults || currentResults.page !== page);
  function select(recordId: string) {
    if (disabled || readOnly) return;
    if (ids.some((id) => id.toLowerCase() === recordId.toLowerCase())) onChange(ids.filter((id) => id.toLowerCase() !== recordId.toLowerCase()));
    else if (!config?.multiple) { onChange([recordId]); setOpen(false); }
    else if (ids.length < limit) onChange([...ids, recordId]);
  }
  const selected = ids.map((recordId) => <span key={recordId} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-control border border-border bg-muted/40 px-2.5 py-1.5 text-caption"><span className="break-words">{currentLabels?.items.find((entry) => entry.id.toLowerCase() === recordId.toLowerCase())?.label ?? (canRead && !currentLabels ? "正在读取…" : "记录不可用")}</span>{!readOnly && <ActionSurface type="button" disabled={disabled} aria-label="移除此关联记录" onClick={() => onChange(ids.filter((entry) => entry !== recordId))} className="shrink-0 disabled:opacity-50"><CloseAction size={14} /></ActionSurface>}</span>);
  if (readOnly) return <div className="flex min-w-0 flex-wrap gap-2">{selected.length ? selected : <span className="text-muted-foreground">未关联</span>}</div>;
  return <div className="min-w-0 space-y-2"><div className="flex flex-wrap gap-2">{selected}</div>
    <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) { setResults(undefined); setLabels(undefined); setRefresh((value) => value + 1); setPage(0); } }}>
      <Popover.Trigger asChild><ActionSurface type="button" id={id} disabled={disabled || !canRead} aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-required={field.required} aria-invalid={invalid || undefined} className={cn("", "flex items-center justify-between gap-2 text-left", invalid && "")}><span>{config?.multiple ? `选择关联记录 · ${ids.length}/${limit}` : ids.length ? "更换关联记录" : field.placeholder || "选择关联记录"}</span><ChevronDown className="size-4 shrink-0" /></ActionSurface></Popover.Trigger>
      <Popover.Portal><Popover.Content data-dw-surface="popover" align="start" sideOffset={6} collisionPadding={12} onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); }} className="max-w-popover-viewport p-3">
        <Input label="搜索记录标题" value={query} maxLength={200} placeholder="按标题搜索" onChange={setQuery} />
        <OptionList className="mt-3 max-h-64 space-y-1 overflow-y-auto" aria-label={field.label} aria-multiselectable={!!config?.multiple}>
          {currentResults?.items.map((item) => { const selected = ids.some((id) => id.toLowerCase() === item.id.toLowerCase()); return <ActionSurface key={item.id} type="button" role="option" aria-selected={selected} disabled={disabled || !!config?.multiple && !selected && ids.length >= limit} onClick={() => select(item.id)} className="flex w-full items-start gap-2 text-left disabled:opacity-50"><span className={["inline-flex", cn("mt-0.5 size-4 shrink-0", !selected && "invisible")].filter(Boolean).join(" ")}><Check  /></span><span className="min-w-0 break-words">{item.label}</span></ActionSurface>; })}
          {loading && <p role="status" className="flex items-center gap-2 p-3 text-caption text-muted-foreground"><RunningIcon running size={14} label="正在搜索" />正在搜索…</p>}
          {!loading && !currentResults?.items.length && !currentResults?.error && <p className="p-3 text-caption text-muted-foreground">没有匹配且可读取的记录</p>}
          {currentResults?.error && <p role="alert" className="p-3 text-caption text-destructive">{currentResults.error}</p>}
        </OptionList>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"><Button size="sm" variant="ghost" onClick={() => { setResults(undefined); setRefresh((value) => value + 1); setPage(0); }}><RefreshAction running={loading} size={14} />刷新</Button>{currentResults?.hasMore && <Button size="sm" variant="outline" disabled={loading || page >= 10000} onClick={() => setPage((offset) => Math.min(10000, currentResults?.nextOffset ?? offset + 20))}>加载更多</Button>}<Popover.Close asChild><Button size="sm">完成</Button></Popover.Close></div>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
    {config?.allowCreate&&<RelationCreateAction field={field} values={values} disabled={disabled||!!config.multiple&&ids.length>=limit} onBeforeOpen={()=>setOpen(false)} onCreated={recordId=>{onChange(appendCreatedRelation(config,ids,recordId));setLabels(undefined);setResults(undefined);setRefresh(value=>value+1);setPage(0);}}/>}
    {!canRead && <p className="text-caption text-muted-foreground">请先配置关联数据表。</p>}{currentLabels?.error && <p role="alert" className="text-caption text-destructive">{currentLabels.error}</p>}
  </div>;
}
