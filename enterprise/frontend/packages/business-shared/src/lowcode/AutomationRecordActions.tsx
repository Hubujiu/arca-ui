import {useState} from "react";
import {api} from "@/shared/api/client";
import {AppModal,Button,FieldSelect} from "@/shared/ui";
import {base,message,useLoad,type Row} from "./model";
import {AutomationRunDetail} from "./AutomationRuns";
export function AutomationRecordActions({row}:{row:Row}) {
  const actions=useLoad<{id:string;name:string}[]>(`${base}/tables/${row.tableId}/automation-buttons?recordId=${row.id}`),[open,setOpen]=useState(false),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[key,setKey]=useState(()=>crypto.randomUUID()),[run,setRun]=useState<string>();
  async function execute(){if(!selected||busy)return;setBusy(true);setError("");try{const result=await api<{id:string}>(`${base}/automations/${selected}/run`,"POST",{requestKey:key,recordId:row.id});setRun(result.id);setKey(crypto.randomUUID());}catch(e){setError(message(e));}finally{setBusy(false);}}
  if(!actions.data?.length)return null;
  return <><Button size="sm" variant="outline" onClick={()=>{setSelected(actions.data?.[0].id??"");setOpen(true);setRun(undefined);setError("");setKey(crypto.randomUUID());}}>执行自动化</Button><AppModal open={open} onOpenChange={open=>{if(!busy)setOpen(open);}} dismissible={!busy} title="对当前记录执行自动化" description="使用服务端最新记录及已发布配置，可能修改记录或触发通知。" className="max-w-3xl" footer={!run?<Button disabled={busy||!selected} onClick={()=>void execute()}>{busy?"正在提交…":"执行"}</Button>:undefined}>{run?<AutomationRunDetail id={run}/>:<div className="space-y-3"><FieldSelect label="可执行自动化" value={selected} options={actions.data.map(action=>({value:action.id,label:action.name}))} onChange={id=>{setSelected(id);setKey(crypto.randomUUID());}}/>{error&&<p role="alert" className="text-body text-destructive">{error}</p>}</div>}</AppModal></>;
}
