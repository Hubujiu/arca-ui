import {createContext,useContext,useState} from "react";
import {api} from "@/shared/api/client";
import {AppModal,Button} from "@/shared/ui";
import type {Directory} from "../organization/model";
import {FieldRenderer} from "./FieldRenderer";
import {validateValues,type TableSchema} from "./field-model";
import {blankDirectory,message,statuses,type Change,type Row,type Table} from "./model";
import {relationEditResult,relationEditValues} from "./relation-edit";
const EditDepth=createContext(0);
export function RelationEditAction({tableId,recordId,onUpdated}:{tableId:string;recordId:string;onUpdated:()=>void}) {
  const depth=useContext(EditDepth),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[resolving,setResolving]=useState(false),[error,setError]=useState(""),[errors,setErrors]=useState<Record<string,string>>({}),[form,setForm]=useState<Record<string,unknown>>({}),[change,setChange]=useState<Change>(),[success,setSuccess]=useState(false);
  const [editor,setEditor]=useState<{row:Row;schema:TableSchema;table:Table;directory:Directory;requestKey:string}>();
  async function start(){setOpen(true);setBusy(true);setError("");setErrors({});setChange(undefined);setSuccess(false);setEditor(undefined);try{
    const [table,row,directory]=await Promise.all([api<Table>(`/api/v1/lc/tables/${tableId}`),api<Row>(`/api/v1/lc/records/${recordId}`),api<Directory>("/api/v1/organization")]);
    if(!table.publishedVersion?.schema||table.permissions.read==="NONE"||table.permissions.update==="NONE"||row.tableId!==tableId)throw Error("目标表未发布或当前没有编辑权限");
    setEditor({table,row,schema:table.publishedVersion.schema,directory,requestKey:crypto.randomUUID()});setForm(relationEditValues(table.publishedVersion.schema.fields,row.data));
  }catch(cause){setError(message(cause));}finally{setBusy(false);}}
  async function observe(result:Change){
    setChange(result);if(!editor)return;
    if(result.status!=="APPROVED"&&!(Number.isInteger(result.persistedRevision)&&result.persistedRevision!>0&&result.status!=="DRAFT"))return;
    const row=await api<Row>(`/api/v1/lc/records/${recordId}`);
    if(relationEditResult(result,row,editor.row.revision)!=="ready")throw Error("尚未读取到本次保存后的目标记录，请刷新检查。");
    setSuccess(true);onUpdated();
  }
  async function submit(){if(!editor||busy||uploading||resolving)return;const invalid=validateValues(editor.schema,form,true,{mode:"edit",existing:editor.row.data});setErrors(invalid);if(Object.keys(invalid).length)return;
    setBusy(true);setError("");try{await observe(await api<Change>(`/api/v1/lc/tables/${tableId}/records/${recordId}`,"PUT",{requestKey:editor.requestKey,title:editor.row.title??editor.table.name,data:form,revision:editor.row.revision,submit:true}));}catch(cause){setError(message(cause));}finally{setBusy(false);}}
  async function refresh(){if(!change||busy)return;setBusy(true);setError("");try{await observe(await api<Change>(`/api/v1/lc/changes/${change.id}`));}catch(cause){setError(message(cause));}finally{setBusy(false);}}
  return <><Button size="sm" variant="ghost" disabled={depth>=3} onClick={()=>void start()}>编辑记录</Button><AppModal open={open} onOpenChange={value=>{if(!busy&&!uploading)setOpen(value);}} dismissible={!busy&&!uploading} title={`编辑${editor?.table.name??"关联明细"}`} description="按目标表当前发布字段、记录修订和审批规则提交修改。" className="max-w-5xl" bodyClassName="max-h-data-list" footer={<div className="flex flex-wrap justify-end gap-2">{success?<Button onClick={()=>setOpen(false)}>完成</Button>:change?<><a href={`/workflows/${change.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-control border border-border px-3 py-2 text-body">查看申请</a><Button disabled={busy} onClick={()=>void refresh()}>{busy?"正在检查…":"刷新记录状态"}</Button></>:<Button disabled={!editor||busy||uploading||resolving} onClick={()=>void submit()}>{busy?"正在处理…":uploading?"等待文件上传…":resolving?"正在读取关联数据…":"提交修改"}</Button>}</div>}>
    {success?<p role="status" className="rounded-control bg-primary/5 p-4 text-body">目标记录已保存，查询结果已刷新。</p>:change?<p role="status" className="rounded-control bg-muted/50 p-4 text-body leading-6">{change.persistedRevision||change.status==="APPROVED"?"记录已保存，正在核对更新后的内容。":`提交状态：${statuses[change.status]??change.status}，请刷新检查记录。`}</p>:editor?<EditDepth.Provider value={depth+1}><FieldRenderer schema={editor.schema} originalValue={editor.row.data} value={form} onChange={setForm} directory={editor.directory??blankDirectory} mode="edit" fileContext={{tableId,recordId,recordRevision:editor.row.revision,versionId:editor.table.publishedVersion!.id}} disabled={busy} errors={errors} onUploadingChange={setUploading} onResolvingChange={setResolving}/></EditDepth.Provider>:busy?<p className="text-body text-muted-foreground">正在读取目标记录及表单…</p>:<Button variant="outline" onClick={()=>void start()}>重新读取记录</Button>}
    {error&&<p role="alert" className="mt-3 text-body text-destructive">{error}</p>}
  </AppModal></>;
}
