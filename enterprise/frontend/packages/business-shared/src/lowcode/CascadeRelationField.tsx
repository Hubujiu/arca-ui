import { ActionSurface } from "@/components/controls";
import { useEffect,useState } from "react";
import { api } from "@/shared/api/client";
import { Button } from "@/shared/ui";
import type { LowcodeField } from "./field-model";
import { filterSourceValues } from "./relation-filters";
import { validateRelation,type RelationItem,type RelationPage } from "./relations";
import { RelationCreateAction } from "./RelationCreateAction";
import { appendCreatedRelation } from "./relation-create";
export function CascadeRelationField({field,value,onChange,id,disabled,readOnly,values={}}:{field:LowcodeField;value:unknown;onChange:(value:string[])=>void;id:string;disabled?:boolean;readOnly?:boolean;values?:Record<string,unknown>}) {
  const config=field.relationConfig!,cascade=config.cascade!,selected=Array.isArray(value)?value.filter((id):id is string=>typeof id==="string"):[];
  const [open,setOpen]=useState(false),[path,setPath]=useState<string[]>([]),[labels,setLabels]=useState<Record<string,string>>({}),[result,setResult]=useState<RelationPage>(),[error,setError]=useState(""),[busy,setBusy]=useState(false),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
  const request={tableId:config.tableId,titleFieldId:config.titleFieldId,cascade,filter:config.filter,...(config.filter?{sourceValues:filterSourceValues(config.filter,values)}:{})},base=JSON.stringify(request),key=JSON.stringify([base,path,offset,retry]),selectedKey=JSON.stringify([base,selected,retry]);
  useEffect(()=>{setLabels({});setPath([]);setOffset(0);},[base]);
  useEffect(()=>{const refresh=()=>setRetry(value=>value+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
  useEffect(()=>{if(!selected.length||validateRelation(config).length)return;const abort=new AbortController();api<RelationPage>("/api/v1/lc/relation-records/search","POST",{...request,ids:selected},abort.signal).then(page=>{if(!abort.signal.aborted)setLabels(old=>({...Object.fromEntries(Object.entries(old).filter(([id])=>!selected.includes(id))),...Object.fromEntries(page.items.map(item=>[item.id,item.label]))}));}).catch(()=>{if(!abort.signal.aborted)setLabels({});});return()=>abort.abort();},[selectedKey]);
  useEffect(()=>{if(!open||validateRelation(config).length)return;const abort=new AbortController();setBusy(true);setError("");api<RelationPage>("/api/v1/lc/relation-records/search","POST",{...request,...(path.length?{parentId:path.at(-1)}:{}),offset},abort.signal).then(page=>{if(abort.signal.aborted)return;setResult(page);setLabels(old=>({...old,...Object.fromEntries(page.items.map(item=>[item.id,item.label]))}));}).catch(error=>{if(!abort.signal.aborted){setError(error instanceof Error?error.message:"级联读取失败");setResult(undefined);}}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});return()=>abort.abort();},[open,key]);
  const title=(id:string)=>labels[id]??"记录不可用";
  function choose(item:RelationItem){if(disabled||readOnly||item.selectable===false||path.includes(item.id))return;onChange([...path,item.id]);setOpen(false);}
  return <div id={id} className="space-y-2"><p className="break-words text-body">{selected.length?selected.map(title).join(" / "):"未选择路径"}</p>
    {!readOnly&&<div className="flex gap-2"><Button variant="outline" size="sm" disabled={disabled||!!validateRelation(config).length} onClick={()=>{setOpen(!open);setPath([]);setOffset(0);}}>选择层级路径</Button><Button size="sm" variant="ghost" disabled={disabled||!selected.length} onClick={()=>onChange([])}>清空路径</Button></div>}
    {open&&!readOnly&&<div className="space-y-3 rounded-card border border-border p-3"><nav aria-label="级联路径" className="flex flex-wrap gap-1"><Button variant="ghost" size="sm" onClick={()=>{setPath([]);setOffset(0);}}>根层级</Button>{path.map((entry,index)=><Button key={entry} variant="ghost" size="sm" onClick={()=>{setPath(path.slice(0,index+1));setOffset(0);}}>{title(entry)}</Button>)}</nav>
      <div role="list" aria-label={field.label} className="max-h-72 space-y-2 overflow-auto">{!busy&&result?.items.map(item=><div role="listitem" key={item.id} className="flex min-w-0 items-center gap-2"><ActionSurface type="button" disabled={disabled||path.includes(item.id)||!!item.hasChildren&&path.length+1>=(cascade.maxDepth??10)||!item.hasChildren&&item.selectable===false} className="min-w-0 flex-1 text-left disabled:opacity-50" onClick={()=>{if(item.hasChildren){setPath([...path,item.id]);setOffset(0);}else choose(item);}}>{item.label}{item.hasChildren?" ›":""}</ActionSurface>{item.hasChildren&&item.selectable&&<Button size="sm" variant="outline" disabled={disabled} onClick={()=>choose(item)}>选择此项</Button>}</div>)}</div>
      {busy&&<p role="status" className="text-caption text-muted-foreground">正在读取层级…</p>}{!busy&&!result?.items.length&&!error&&<p className="text-caption text-muted-foreground">当前层级没有可读取的记录</p>}{error&&<p role="alert" className="text-caption text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy} onClick={()=>setRetry(value=>value+1)}>刷新</Button>{result?.hasMore&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>setOffset(result.nextOffset??offset+20)}>下一页</Button>}<Button size="sm" onClick={()=>setOpen(false)}>关闭</Button></div>
      <p className="text-caption text-muted-foreground">{cascade.leafOnly!==false?"须选择末级记录":"可以选择中间层级"}，最多 {cascade.maxDepth??10} 层。</p>
      {config.allowCreate&&<RelationCreateAction field={field} values={values} parentPath={path} disabled={disabled} onCreated={recordId=>{onChange(appendCreatedRelation(config,selected,recordId,path));setRetry(value=>value+1);setOpen(false);}}/>}
    </div>}
  </div>;
}
