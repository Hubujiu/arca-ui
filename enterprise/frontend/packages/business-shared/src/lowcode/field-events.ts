import type { LowcodeField, TableSchema } from "./field-model";
export type FieldEvent={id:string;name:string;sourceFieldId:string;connectorId:string;inputs:Record<string,string>;outputs:Record<string,string>};
export type FieldEventContext={tableId:string;versionId?:string;recordId?:string;recordRevision?:number;design?:boolean;changeId?:string;shareToken?:string};
export type FieldEventRequest={versionId:string;recordId?:string;recordRevision?:number;requestKey:string;data:Record<string,unknown>};
export const fieldEventField=(field:LowcodeField)=>"text textarea number email phone url date datetime time rating checkbox select".split(" ").includes(field.type)&&!field.readOnly&&!field.hidden&&!["alwaysHidden","createHidden"].includes(field.visibility??"");
const uuid=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const key=(value:unknown):value is string=>typeof value==="string"&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value)&&!["constructor","prototype","__proto__"].includes(value);
export function fieldEventPath(value:unknown):value is string {return typeof value==="string"&&value.length<=200&&value.split(".").length<=8&&value.split(".").every(key);}
export function fieldEventIssues(schema:TableSchema,child=false):string[] {
  if(schema.fieldEvents===undefined)return[];
  if(child)return["字段事件仅支持根表单"];
  if(!Array.isArray(schema.fieldEvents)||schema.fieldEvents.length>10)return["字段事件最多 10 项"];
  if(!Array.isArray(schema.fields))return["字段事件需要有效的表单字段"];
  const errors:string[]=[],ids=new Set<string>(),sourcesUsed=new Set<string>(),fields=new Map(schema.fields.map(field=>[field.id,field])),graph=new Map<string,Set<string>>();
  const allowed=(id:unknown)=>typeof id==="string"&&!!fields.get(id)&&fieldEventField(fields.get(id)!);
  for(const event of schema.fieldEvents){
    if(!event||typeof event!=="object"||Array.isArray(event)||Object.keys(event).some(key=>!["id","name","sourceFieldId","connectorId","inputs","outputs"].includes(key))){errors.push("字段事件配置包含未知属性");continue;}
    if(!key(event.id)||ids.has(event.id))errors.push("字段事件标识需要有效且不重复");ids.add(event.id);
    if(typeof event.name!=="string"||!event.name.trim()||event.name.length>40)errors.push("字段事件名称需要 1 至 40 个字符");
    if(sourcesUsed.has(event.sourceFieldId))errors.push("每个触发字段只能配置一个查询");sourcesUsed.add(event.sourceFieldId);
    if(!allowed(event.sourceFieldId)||!uuid.test(event.connectorId))errors.push("字段事件需要可编辑的触发字段及有效连接器");
    const input=event.inputs,output=event.outputs;
    if(!input||typeof input!=="object"||Array.isArray(input)||(!Object.keys(input).length||Object.keys(input).length>10)||Object.entries(input).some(([payload,id])=>!key(payload)||!allowed(id))){errors.push("事件输入需要1 至 10 个有效字段映射");continue;}
    if(!output||typeof output!=="object"||Array.isArray(output)||!Object.keys(output).length||Object.keys(output).length>10||Object.entries(output).some(([id,path])=>!allowed(id)||!fieldEventPath(path))){errors.push("事件回填需要 1 至 10 个字段和有效响应路径");continue;}
    const sources=new Set([event.sourceFieldId,...Object.values(input)]);
    for(const target of Object.keys(output))for(const source of sources){if(target===source)errors.push("回填字段不能同时作为本事件来源");const targets=graph.get(source)??new Set();targets.add(target);graph.set(source,targets);}
  }
  const done=new Set<string>(),visiting=new Set<string>();
  function visit(id:string):boolean {if(visiting.has(id))return true;if(done.has(id))return false;visiting.add(id);for(const target of graph.get(id)??[])if(visit(target))return true;visiting.delete(id);done.add(id);return false;}
  if([...graph.keys()].some(visit))errors.push("字段事件存在循环依赖");
  return [...new Set(errors)];
}
export function fieldEventsEnabled(context?:FieldEventContext,enabled=true) {return !!enabled&&!!context&&uuid.test(context.tableId)&&uuid.test(context.versionId??"")&&!context.design&&!context.changeId&&!context.shareToken&&(!context.recordId||uuid.test(context.recordId)&&Number.isInteger(context.recordRevision)&&Number(context.recordRevision)>=1);}
export function fieldEventData(event:FieldEvent,values:Record<string,unknown>):Record<string,unknown> {
  const result=Object.fromEntries([...new Set([event.sourceFieldId,...Object.values(event.inputs)])].map(id=>[id,values[id]??null]));
  if(Object.values(result).some(value=>value!==null&&!["string","number","boolean"].includes(typeof value)||typeof value==="number"&&!Number.isFinite(value)))throw new Error("查询来源需要普通文本、数字或是否值");
  if(new TextEncoder().encode(JSON.stringify(result)).length>16384)throw new Error("查询输入最多 16 KiB，请减少发送字段或内容");
  return structuredClone(result);
}
export type FieldEventState={id:string;name:string;status:"pending"|"running"|"success"|"error";message?:string;canRetry?:boolean};
type Flight={event:FieldEvent;body:FieldEventRequest;targets:Map<string,number>;timer?:ReturnType<typeof setTimeout>;controller?:AbortController;attempts:number;generation:number};
/** Explicit user-change scheduler. Programmatic patches never call change(). */
export class FieldEventSession {
  private edits=new Map<string,number>();private flights=new Map<string,Flight>();private states=new Map<string,FieldEventState>();private latestTargets=new Map<string,number>();private sequence=0;private disposed=false;
  constructor(private events:FieldEvent[],private context:FieldEventContext,private request:(event:FieldEvent,body:FieldEventRequest,signal:AbortSignal)=>Promise<{values:Record<string,unknown>}>,private apply:(values:Record<string,unknown>)=>void,private notify:(states:FieldEventState[],busy:boolean)=>void,private delay=300){}
  private emit(){if(!this.disposed)this.notify([...this.states.values()],[...this.states.values()].some(state=>state.status==="pending"||state.status==="running"));}
  change(fieldId:string,values:Record<string,unknown>){
    if(this.disposed)return;this.edits.set(fieldId,(this.edits.get(fieldId)??0)+1);
    for(const event of this.events){
      if(event.sourceFieldId!==fieldId&&!Object.values(event.inputs).includes(fieldId))continue;
      this.cancel(event.id);
      if(event.sourceFieldId!==fieldId)continue;
      try {
        const body:FieldEventRequest={versionId:this.context.versionId!,...(this.context.recordId?{recordId:this.context.recordId,recordRevision:this.context.recordRevision}:{}),requestKey:crypto.randomUUID(),data:fieldEventData(event,values)};
        const flight:Flight={event,body,targets:new Map(Object.keys(event.outputs).map(id=>[id,this.edits.get(id)??0])),attempts:0,generation:++this.sequence};
        for(const id of flight.targets.keys())this.latestTargets.set(id,flight.generation);
        this.flights.set(event.id,flight);this.states.set(event.id,{id:event.id,name:event.name,status:"pending"});flight.timer=setTimeout(()=>void this.run(flight),this.delay);
      }catch(error){this.states.set(event.id,{id:event.id,name:event.name,status:"error",message:error instanceof Error?error.message:"查询输入无效"});}
    }
    this.emit();
  }
  private cancel(id:string){const flight=this.flights.get(id);if(flight?.timer)clearTimeout(flight.timer);flight?.controller?.abort();this.flights.delete(id);this.states.delete(id);}
  private async run(flight:Flight){
    if(this.disposed||this.flights.get(flight.event.id)!==flight)return;
    flight.timer=undefined;flight.attempts++;flight.controller=new AbortController();this.states.set(flight.event.id,{id:flight.event.id,name:flight.event.name,status:"running"});this.emit();
    try {
      const result=await this.request(flight.event,flight.body,flight.controller.signal);
      if(this.disposed||flight.controller.signal.aborted||this.flights.get(flight.event.id)!==flight)return;
      if(!result?.values||typeof result.values!=="object"||Array.isArray(result.values)||Object.entries(result.values).some(([id,value])=>!Object.hasOwn(flight.event.outputs,id)||value!==null&&!["string","number","boolean"].includes(typeof value)||typeof value==="number"&&!Number.isFinite(value)))throw new Error("连接器回填结果格式无效");
      const patch=Object.fromEntries(Object.entries(result.values).filter(([id,value])=>value!==null&&(this.edits.get(id)??0)===flight.targets.get(id)&&this.latestTargets.get(id)===flight.generation));
      const skipped=Object.entries(result.values).filter(([id,value])=>value!==null&&(this.edits.get(id)??0)!==flight.targets.get(id)).length;
      if(Object.keys(patch).length)this.apply(patch);
      this.states.set(flight.event.id,{id:flight.event.id,name:flight.event.name,status:"success",message:skipped?`已完成，保留 ${skipped} 个手工修改字段`:Object.keys(patch).length?"已回填查询结果":"查询完成，无可回填内容"});this.flights.delete(flight.event.id);
    }catch(error){if(this.disposed||flight.controller.signal.aborted||this.flights.get(flight.event.id)!==flight)return;this.states.set(flight.event.id,{id:flight.event.id,name:flight.event.name,status:"error",message:(error instanceof Error?error.message:"查询失败，请重试")+(flight.attempts>=3?"（已尝试 3 次，请修改输入后重新查询）":""),canRetry:flight.attempts<3});}
    this.emit();
  }
  retry(id:string){const flight=this.flights.get(id);if(flight&&this.states.get(id)?.status==="error"&&flight.attempts<3)void this.run(flight);}
  dispose(){this.disposed=true;for(const id of this.flights.keys())this.cancel(id);this.states.clear();this.notify([],false);}
}
