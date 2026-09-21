import { useState } from "react";
import { Button, FieldSelect, Input } from "@/shared/ui";
import type { TableSchema } from "./field-model";
import { fieldEventField, fieldEventIssues, type FieldEvent } from "./field-events";
import { AutomationConnectors } from "./AutomationConnectors";
import type { AutomationConnector } from "./automation-model";
import { base, useLoad } from "./model";

export function FieldEventSettings({schema,onChange,appId,disabled,connectors:provided}:{schema:TableSchema;onChange:(schema:TableSchema)=>void;appId?:string;disabled?:boolean;connectors?:AutomationConnector[]}) {
  const loaded=useLoad<AutomationConnector[]>(!provided&&appId?`${base}/applications/${appId}/automation-connectors`:undefined),[manage,setManage]=useState(false);
  const connectors=provided??loaded.data??[],eligible=connectors.filter(connector=>connector.enabled&&["GET","POST"].includes(connector.method)),fields=schema.fields.filter(fieldEventField),events=schema.fieldEvents??[];
  const availableSource=fields.find(field=>!events.some(event=>event.sourceFieldId===field.id));
  const update=(id:string,patch:Partial<FieldEvent>)=>onChange({...schema,fieldEvents:events.map(event=>event.id===id?{...event,...patch}:event)});
  return <details className="mb-5 rounded-card border border-border bg-card p-4"><summary className="cursor-pointer text-body font-medium">字段变化查询回填</summary><fieldset disabled={disabled} className="mt-4 space-y-4">
    <p className="text-caption leading-5 text-muted-foreground">选择用于查询的连接器；输入会发送给该服务，回填仍可手工修改。只在正式新增、修改记录时响应用户输入，预览、审批和分享表单不会调用外部服务。</p>
    {loaded.error&&<p role="alert" className="text-caption text-destructive">{loaded.error} <Button size="sm" variant="ghost" onClick={loaded.refresh}>重试读取连接器</Button></p>}
    {appId&&<Button size="sm" variant="outline" onClick={()=>setManage(true)}>管理连接器</Button>}
    {!eligible.length&&<p className="text-caption text-muted-foreground">需要同一应用中已启用的 GET 或 POST 连接器。连接器配置需要应用管理权限。</p>}
    {events.map(event=><details key={event.id} open className="space-y-3 rounded-card border border-border p-3"><summary className="cursor-pointer text-body font-medium">{event.name||"未命名查询"}</summary>
      <Input label="查询名称" value={event.name} maxLength={40} onChange={name=>update(event.id,{name})}/>
      <FieldSelect label="触发查询的字段" value={event.sourceFieldId} options={[{value:"",label:"选择字段"},...fields.map(field=>({value:field.id,label:field.label}))]} onChange={sourceFieldId=>update(event.id,{sourceFieldId})}/>
      <FieldSelect label="查询连接器" value={event.connectorId} options={[{value:"",label:"选择连接器"},...eligible.map(connector=>({value:connector.id,label:`${connector.name} · ${connector.method}`}))]} onChange={connectorId=>update(event.id,{connectorId})}/>
      <div className="space-y-2"><p className="text-body font-medium">发送字段</p>{Object.entries(event.inputs).map(([key,id],index)=><div key={index} className="grid gap-2 rounded-control bg-muted/30 p-2 sm:grid-cols-mapping-row">
        <Input label={`参数 ${index+1} 名称`} value={key} maxLength={64} onChange={next=>{const entries=Object.entries(event.inputs);if(next!==key&&Object.hasOwn(event.inputs,next))return;entries[index]=[next,id];update(event.id,{inputs:Object.fromEntries(entries)});}}/>
        <FieldSelect label={`参数 ${index+1} 来源`} value={id} options={[{value:"",label:"选择字段"},...fields.map(field=>({value:field.id,label:field.label}))]} onChange={next=>update(event.id,{inputs:{...event.inputs,[key]:next}})}/>
        <Button size="sm" variant="ghost" aria-label={`删除发送参数 ${index+1}`} onClick={()=>update(event.id,{inputs:Object.fromEntries(Object.entries(event.inputs).filter(([name])=>name!==key))})}>删除</Button>
      </div>)}<Button size="sm" variant="outline" disabled={disabled||Object.keys(event.inputs).length>=10} onClick={()=>{let index=1;while(Object.hasOwn(event.inputs,`input${index}`))index++;update(event.id,{inputs:{...event.inputs,[`input${index}`]:event.sourceFieldId}});}}>添加发送参数</Button></div>
      <div className="space-y-2"><p className="text-body font-medium">回填字段</p>{Object.entries(event.outputs).map(([id,path],index)=><div key={index} className="grid gap-2 rounded-control bg-muted/30 p-2 sm:grid-cols-mapping-row">
        <FieldSelect label={`回填 ${index+1} 目标`} value={id} options={[{value:"",label:"选择字段"},...fields.filter(field=>field.id!==event.sourceFieldId&&(!Object.hasOwn(event.outputs,field.id)||field.id===id)).map(field=>({value:field.id,label:field.label}))]} onChange={next=>{const entries=Object.entries(event.outputs);entries[index]=[next,path];update(event.id,{outputs:Object.fromEntries(entries)});}}/>
        <Input label={`回填 ${index+1} 响应路径`} value={path} maxLength={200} placeholder="body.customerName" onChange={next=>update(event.id,{outputs:{...event.outputs,[id]:next}})}/>
        <Button size="sm" variant="ghost" aria-label={`删除回填字段 ${index+1}`} onClick={()=>update(event.id,{outputs:Object.fromEntries(Object.entries(event.outputs).filter(([key])=>key!==id))})}>删除</Button>
      </div>)}<Button size="sm" variant="outline" disabled={disabled||Object.keys(event.outputs).length>=10||!fields.some(field=>field.id!==event.sourceFieldId&&!Object.hasOwn(event.outputs,field.id))} onClick={()=>{const target=fields.find(field=>field.id!==event.sourceFieldId&&!Object.hasOwn(event.outputs,field.id));if(target)update(event.id,{outputs:{...event.outputs,[target.id]:`body.${target.id}`}});}}>添加回填字段</Button></div>
      <Button size="sm" variant="ghost" onClick={()=>{const next=events.filter(item=>item.id!==event.id);onChange({...schema,fieldEvents:next.length?next:undefined});}}>删除此查询</Button>
    </details>)}
    <Button size="sm" variant="outline" disabled={disabled||events.length>=10||fields.length<2||!eligible.length||!availableSource} onClick={()=>onChange({...schema,fieldEvents:[...events,{id:`event${crypto.randomUUID().replaceAll("-","")}`,name:`字段查询 ${events.length+1}`,sourceFieldId:availableSource!.id,connectorId:eligible[0].id,inputs:{query:availableSource!.id},outputs:{[fields.find(field=>field.id!==availableSource!.id)!.id]:`body.${fields.find(field=>field.id!==availableSource!.id)!.id}`}}]})}>添加字段查询</Button>
    {fieldEventIssues(schema).map(error=><p key={error} role="alert" className="text-caption text-destructive">{error}</p>)}
  </fieldset>{manage&&appId&&<AutomationConnectors appId={appId} connectors={connectors} onSaved={loaded.refresh} onClose={()=>setManage(false)}/>}</details>;
}
