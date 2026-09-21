import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { Button } from "@/components/motion/button";
import type { TableSchema } from "./field-model";
import { fieldEventIssues, fieldEventsEnabled, FieldEventSession, type FieldEventContext, type FieldEventState } from "./field-events";

export function useFieldEvents(schema:TableSchema,context:FieldEventContext|undefined,enabled:boolean,apply:(values:Record<string,unknown>)=>void,onBusy:(busy:boolean)=>void) {
  const [states,setStates]=useState<FieldEventState[]>([]),callbacks=useRef({apply,onBusy});callbacks.current={apply,onBusy};
  const active=!!schema.fieldEvents?.length&&fieldEventsEnabled(context,enabled)&&!fieldEventIssues(schema).length;
  const identity=JSON.stringify([schema.fieldEvents,context?.tableId,context?.versionId,context?.recordId,context?.recordRevision,active]);
  const session=useMemo(()=>active&&context?new FieldEventSession(schema.fieldEvents??[],context,(event,body,signal)=>api(`/api/v1/lc/tables/${context.tableId}/field-events/${event.id}`,"POST",body,signal),values=>callbacks.current.apply(values),(next,busy)=>{setStates(next);callbacks.current.onBusy(busy);}):undefined,[identity]);
  useEffect(()=>()=>session?.dispose(),[session]);
  return {change:(id:string,values:Record<string,unknown>)=>session?.change(id,values),states,retry:(id:string)=>session?.retry(id)};
}
export function FieldEventStatus({states,retry,disabled}:{states:FieldEventState[];retry:(id:string)=>void;disabled?:boolean}) {
  if(!states.length)return null;
  return <div className="space-y-2" aria-label="字段查询状态">{states.map(state=><div key={state.id} role={state.status==="error"?"alert":"status"} className={`flex flex-wrap items-center gap-2 rounded-control border px-3 py-2 text-caption ${state.status==="error"?"border-destructive/30 text-destructive":"border-border text-muted-foreground"}`}><span className="font-medium">{state.name}</span><span>{state.status==="pending"?"等待输入完成…":state.status==="running"?"正在查询…":state.message}</span>{state.canRetry&&<Button size="sm" variant="ghost" disabled={disabled} onClick={()=>retry(state.id)}>重试查询</Button>}</div>)}</div>;
}
