import { createContext,useContext,useState } from "react";
import { PlusAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { AppModal,Button } from "@/shared/ui";
import type { Directory } from "../organization/model";
import { FieldRenderer } from "./FieldRenderer";
import { initialValues,validateValues,type DefaultUser,type LowcodeField } from "./field-model";
import { blankDirectory,message,statuses,useLoad,type Change,type Row,type Table } from "./model";
import { filterSourceValues } from "./relation-filters";
import { createdRelation } from "./relation-create";
import type { RelationPage } from "./relations";

const CreationDepth=createContext(0);
export function RelationCreateAction({field,values={},parentPath=[],disabled,onBeforeOpen,onCreated}:{field:LowcodeField;values?:Record<string,unknown>;parentPath?:string[];disabled?:boolean;onBeforeOpen?:()=>void;onCreated:(id:string)=>void}) {
  const config=field.relationConfig,depth=useContext(CreationDepth),[open,setOpen]=useState(false),[form,setForm]=useState<Record<string,unknown>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[error,setError]=useState(""),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[resolving,setResolving]=useState(false),[change,setChange]=useState<Change>(),[requestKey,setRequestKey]=useState("");
  const table=useLoad<Table>(config?.allowCreate?`/api/v1/lc/tables/${config.tableId}`:undefined),directory=useLoad<Directory>(open?"/api/v1/organization":undefined),me=useLoad<DefaultUser>(config?.allowCreate?"/api/v1/me":undefined);
  const schema=table.data?.publishedVersion?.schema,allowed=!!config?.allowCreate&&!!table.data?.permissions.create&&table.data.permissions.read!=="NONE"&&!!schema;
  if(!allowed||!config||!schema)return null;
  const relation=config,definition=schema;
  function start(){
    onBeforeOpen?.();setForm({...initialValues(definition,me.data),...(relation.cascade?{[relation.cascade.parentFieldId]:parentPath.length?[parentPath.at(-1)!]:[]}: {})});
    setErrors({});setError("");setChange(undefined);setRequestKey(crypto.randomUUID());setOpen(true);
  }
  async function attach(result:Change){
    setChange(result);const outcome=createdRelation(result);if(outcome.kind==="pending")return;
    if(outcome.kind!=="ready")throw new Error(`提交状态：${statuses[result.status]??result.status}。尚未取得已保存的记录，请刷新检查后再关联。`);
    const page=await api<RelationPage>("/api/v1/lc/relation-records/search","POST",{tableId:relation.tableId,titleFieldId:relation.titleFieldId,ids:[outcome.recordId],...(relation.filter?{filter:relation.filter,sourceValues:filterSourceValues(relation.filter,values)}:{}),...(relation.cascade?{cascade:relation.cascade}:{})});
    const selected=page.items.find(item=>item.id.toLowerCase()===outcome.recordId.toLowerCase());
    if(!selected||selected.selectable===false)throw new Error("记录已保存，但当前没有读取权限或不符合关联筛选，请调整条件后重试。");
    if(relation.cascade){
      const row=await api<Row>(`/api/v1/lc/records/${outcome.recordId}`),raw=row.data[relation.cascade.parentFieldId],parent=Array.isArray(raw)?raw:[];
      if(parent.length>1||(parent[0]??null)!==(parentPath.at(-1)??null))throw new Error("记录已保存，但父记录与当前选择层级不同，请回到对应层级选择。");
    }
    onCreated(outcome.recordId);setOpen(false);
  }
  async function submit(){
    if(busy||uploading||resolving)return;const invalid=validateValues(definition,form,true,{mode:"create"});setErrors(invalid);if(Object.keys(invalid).length)return;
    setBusy(true);setError("");try{await attach(await api<Change>(`/api/v1/lc/tables/${relation.tableId}/records`,"POST",{requestKey,data:form,title:table.data!.name,submit:true}));}catch(e){setError(message(e));}finally{setBusy(false);}
  }
  async function refresh(){if(!change||busy)return;setBusy(true);setError("");try{await attach(await api<Change>(`/api/v1/lc/changes/${change.id}`));}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <><Button variant="outline" size="sm" disabled={disabled||depth>=3||!!relation.cascade&&parentPath.length>=(relation.cascade.maxDepth??10)} onClick={start}><PlusAction size={14}/>新建关联记录</Button>
    <AppModal open={open} onOpenChange={next=>{if(!busy&&!uploading)setOpen(next);}} dismissible={!busy&&!uploading} title={`新增${table.data!.name}`} description="按目标表的权限和审批规则提交，记录保存后检查权限和筛选条件，并加入当前关联。" className="max-w-5xl" bodyClassName="max-h-data-list" footer={<div className="flex flex-wrap justify-end gap-2">{change?<><a href={`/workflows/${change.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-control border border-border px-3 py-2 text-body">查看申请</a><Button disabled={busy} onClick={()=>void refresh()}>{busy?"正在检查…":"刷新记录并关联"}</Button></>:<Button disabled={busy||uploading||resolving} onClick={()=>void submit()}>{busy?"正在提交…":uploading?"等待文件上传…":resolving?"正在读取关联数据…":"提交新记录"}</Button>}</div>}>
      {change?<p role="status" className="rounded-control bg-muted/50 p-4 text-body leading-6">{createdRelation(change).kind==="ready"?"目标记录已保存，正在检查能否加入关联。":`提交状态：${statuses[change.status]??change.status}。请刷新检查记录。`}</p>:<CreationDepth.Provider value={depth+1}><FieldRenderer schema={definition} value={form} onChange={setForm} directory={directory.data??blankDirectory} mode="create" fileContext={{tableId:relation.tableId}} disabled={busy} errors={errors} onUploadingChange={setUploading} onResolvingChange={setResolving}/></CreationDepth.Provider>}
      {error&&<p role="alert" className="mt-3 text-body text-destructive">{error}</p>}{directory.error&&!change&&<p role="alert" className="mt-3 text-caption text-destructive">成员目录读取失败：{directory.error}</p>}
    </AppModal>
  </>;
}
