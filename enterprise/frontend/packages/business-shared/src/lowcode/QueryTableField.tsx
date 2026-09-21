import { DataTable } from "@/components/controls";
import { useEffect,useState } from "react";
import { api } from "@/shared/api/client";
import { Button,Input } from "@/shared/ui";
import type { LowcodeField } from "./field-model";
import { queryTableRequest } from "./query-table-request";
import { useLoad } from "./model";
import type { RelationPage,RelationTable } from "./relations";
import {RelationEditAction} from "./RelationEditAction";
export function QueryTableField({field,values,recordId}:{field:LowcodeField;values:Record<string,unknown>;recordId?:string}) {
  const config=field.queryConfig,[query,setQuery]=useState(""),[offset,setOffset]=useState(0),[result,setResult]=useState<RelationPage>(),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const tables=useLoad<RelationTable[]>("/api/v1/lc/relation-tables"),table=tables.data?.find(table=>table.id===config?.tableId);
  const request=queryTableRequest(config,values,recordId);
  const sourceKey=JSON.stringify(request),key=JSON.stringify([sourceKey,query,offset,refresh]);
  useEffect(()=>setOffset(0),[sourceKey,query]);
  useEffect(()=>{if(!request||!config?.tableId||!config.columnIds.length){setResult(undefined);setBusy(false);return;}const abort=new AbortController();setBusy(true);setError("");const timer=setTimeout(()=>{api<RelationPage>("/api/v1/lc/relation-records/search","POST",{...request,q:query,offset},abort.signal).then(page=>{if(!abort.signal.aborted)setResult(page);}).catch(error=>{if(!abort.signal.aborted){setResult(undefined);setError(error instanceof Error?error.message:"查询失败");}}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});},200);return()=>{clearTimeout(timer);abort.abort();};},[key]);
  if(!config)return <p className="text-caption text-muted-foreground">请配置查询数据表和显示列。</p>;
  if(config.backReferenceFieldId&&!recordId)return <p className="text-caption text-muted-foreground">保存当前记录后，可查看通过目标关联字段引用它的记录。</p>;
  return <section className="space-y-3" aria-label={field.label}><div className="flex flex-wrap items-end gap-2"><h3 className="min-w-0 flex-1 text-body font-medium">{field.label}</h3><Button variant="outline" size="sm" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>刷新查询</Button></div><Input label="搜索首列" value={query} maxLength={200} onChange={setQuery}/>
    <div className="max-w-full overflow-auto rounded-card border border-border"><DataTable className="w-full text-left"><thead><tr className="bg-muted/40">{config.columnIds.map(id=><th key={id} className="whitespace-nowrap px-3 py-2 font-medium">{table?.fields.find(field=>field.id===id)?.label??id}</th>)}{config.allowEdit&&<th className="whitespace-nowrap px-3 py-2 font-medium">操作</th>}</tr></thead><tbody>{!busy&&result?.items.map(item=><tr key={item.id} className="border-t border-border">{config.columnIds.map(id=><td key={id} className="max-w-72 whitespace-pre-wrap break-words px-3 py-2">{item.values?.[id]??"—"}</td>)}{config.allowEdit&&<td className="whitespace-nowrap px-3 py-2">{item.canUpdate?<RelationEditAction tableId={config.tableId} recordId={item.id} onUpdated={()=>setRefresh(value=>value+1)}/>:<span className="text-caption text-muted-foreground">只读</span>}</td>}</tr>)}</tbody></DataTable></div>
    {busy&&<p role="status" className="text-caption text-muted-foreground">正在查询…</p>}{error&&<p role="alert" className="text-caption text-destructive">{error}</p>}{!busy&&!error&&!result?.items.length&&<p className="text-caption text-muted-foreground">没有符合条件且可读取的记录</p>}
    <div className="flex gap-2">{offset>0&&<Button variant="ghost" size="sm" disabled={busy} onClick={()=>setOffset(0)}>返回首页</Button>}{result?.hasMore&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>setOffset(result.nextOffset??offset+(config.pageSize??10))}>下一页</Button>}</div>
    <p className="text-caption text-muted-foreground">实时显示有权读取的数据，查询结果不复制到当前记录。</p>
  </section>;
}
