import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import "../../src/styles.css";
import fixture from "./automation-data.json";
import {AutomationWorkspace} from "../../src/lowcode/AutomationWorkspace";
import {AutomationRecordActions} from "../../src/lowcode/AutomationRecordActions";
import {WorkflowNotices} from "../../../../modules/workflow/src/features/workflow/WorkflowNotices";
import type {Automation,AutomationConnector} from "../../src/lowcode/automation-model";
import type {Row,Table} from "../../src/lowcode/model";
const table=fixture.table as Table,definitions=structuredClone(fixture.definitions) as unknown as Automation[],connectors:AutomationConnector[]=[],calls:{path:string;method:string;body:unknown}[]=[];
const runs:{run:Record<string,unknown>;steps:Record<string,unknown>[];canRetry:boolean}[]=[],original=window.fetch;
const recordId="10000000-0000-4000-8000-000000000010";
(window as unknown as {automationFixture:unknown}).automationFixture={definitions,connectors,calls,runs};
window.fetch=async(input,init)=>{
  const url=new URL(String(input),window.location.origin),path=url.pathname,method=init?.method??"GET",body=typeof init?.body==="string"?JSON.parse(init.body):{};
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
  if(!path.startsWith("/api/v1/lc/"))return original(input,init);
  calls.push({path,method,body});
  if(path==="/api/v1/lc/notices")return json(runs.map(item=>({id:`notice-${item.run.id}`,sourceType:"automation_run",sourceId:item.run.id,kind:"AUTOMATION_FAILED",message:"自动化执行失败，请查看运行详情。",createdAt:"2026-09-12T11:00:00Z"})));
  if(path.includes("/notices/")&&path.endsWith("/read"))return json({});
  if(path.endsWith("/relation-tables"))return json([{id:table.id,appId:table.appId,appName:"合同管理",name:table.name,fields:table.publishedVersion!.schema.fields}]);
  if(path===`/api/v1/lc/tables/${table.id}`)return json(table);
  if(path.endsWith("/automation-buttons"))return json(definitions.filter(item=>item.enabled&&item.publishedVersion?.definition?.trigger.type==="BUTTON").map(item=>({id:item.id,name:item.name})));
  if(path.endsWith("/automation-connectors")){
    if(method==="POST"){const connector={...body,id:crypto.randomUUID(),appId:table.appId,revision:1};connectors.push(connector);return json(connector);}
    return json(connectors);
  }
  if(path.includes("/automation-connectors/")){const index=connectors.findIndex(item=>item.id===path.split("/").at(-1));if(index<0)return json({message:"连接器不存在"},404);connectors[index]={...connectors[index],...body,revision:connectors[index].revision+1};return json(connectors[index]);}
  if(path===`/api/v1/lc/tables/${table.id}/automations`){
    if(method==="POST"){const definition={...body,id:crypto.randomUUID(),tableId:table.id,appId:table.appId,revision:1,enabled:false};definitions.push(definition);return json(definition);}
    return json(definitions);
  }
  if(path.includes("/automation-runs/")){
    const id=path.split("/")[5],value=runs.find(item=>item.run.id===id);if(!value)return json({message:"运行不存在"},404);
    if(path.endsWith("/retry")){value.run.state="SUCCEEDED";value.run.attempts=2;value.run.error=null;value.steps.forEach(step=>{step.state="SUCCEEDED";step.error=null;});}
    return json(value.canRetry?value:{...value,steps:value.steps.map(({output_snapshot,input_snapshot,...step})=>step)});
  }
  const match=path.match(/\/automations\/([^/]+)(?:\/(.+))?$/),definition=definitions.find(item=>item.id===match?.[1]);
  if(!definition)return json({message:`未模拟接口 ${path}`},404);
  if(match?.[2]==="failure-recipients")return json([{id:"10000000-0000-4000-8000-000000000021",displayName:"林青",creator:true},{id:"10000000-0000-4000-8000-000000000022",displayName:"周宁",creator:false}]);
  if(match?.[2]==="debug"){
    if(body.revision!==definition.revision)return json({message:"内容已变化，请刷新后重试"},409);
    const create={...(body.mockOutputs?.["root.create"]??{recordId:null,data:body.data}),simulated:true};
    return json({mode:"DRY_RUN",revision:body.revision,trigger:{type:"BUTTON",data:body.data,revision:body.recordRevision},steps:[
      {stepPath:"root.query",kind:"QUERY",state:"DONE",input:{limit:2},output:{items:[{id:recordId,data:{name:"示例合同",amount:1200}}]}},
      {stepPath:"root.branch",kind:"CONDITION",state:"DONE",input:{data:body.data},output:{matches:Number(body.data.amount??0)>100}},
      {stepPath:"root.create",kind:"CREATE",state:"SIMULATED",mocked:!!body.mockOutputs?.["root.create"],input:{values:body.data},output:create},
      {stepPath:"root.update",kind:"UPDATE",state:"SIMULATED",input:{recordId:create.recordId,values:{amount:2000}},output:{simulated:true,status:"SIMULATED",recordId:create.recordId}},
      {stepPath:"root.http",kind:"HTTP",state:"SIMULATED",input:{values:{token:"never-render-debug-token"}},output:{simulated:true,status:0,body:{}}},
      {stepPath:"root.branch.skip",kind:"NOTICE",state:"SKIPPED",input:{},output:{}}
    ],outputs:{create},unusedMockPaths:Object.keys(body.mockOutputs??{}).filter(path=>path!=="root.create")});
  }
  if(match?.[2]==="runs")return json(runs.filter(item=>item.run.automation_id===definition.id).map(item=>item.run));
  if(match?.[2]==="run"){
    const same=runs.find(item=>item.run.requestKey===body.requestKey);if(same)return json({id:same.run.id,state:same.run.state});
    const id=crypto.randomUUID();runs.unshift({run:{id,automation_id:definition.id,state:"FAILED",created_at:"2026-09-12T11:00:00Z",attempts:1,error:"目标记录内容版本已变化，请检查输入后重试。",requestKey:body.requestKey},canRetry:!body.recordId,steps:[{id:crypto.randomUUID(),step_path:"query",kind:"QUERY",state:"SUCCEEDED",started_at:"2026-09-12T11:00:00Z",completed_at:"2026-09-12T11:00:01Z",output_snapshot:{items:[{id:recordId,data:{name:"示例合同",amount:1200}}],token:"never-render-this-token"}},{id:crypto.randomUUID(),step_path:"condition.calculate",kind:"FUNCTION",state:"FAILED",error:"字段输入需要有效数字",started_at:"2026-09-12T11:00:01Z",completed_at:"2026-09-12T11:00:02Z",output_snapshot:{value:null}}]});return json({id,state:"QUEUED",created_at:"2026-09-12T11:00:00Z"});
  }
  if(method==="GET")return json(definition);
  if(body.revision!==definition.revision)return json({message:"定义版本已变化"},409);
  if(method==="PUT"){definition.name=body.name;definition.draft=body.draft;}
  if(match?.[2]==="publish"){const id=crypto.randomUUID();definition.publishedVersionId=id;definition.publishedVersion={id,version:(definition.publishedVersion?.version??0)+1,definition:structuredClone(definition.draft)};}
  if(match?.[2]==="enabled")definition.enabled=body.enabled;
  definition.revision++;
  if(match?.[2]==="webhook-token")return json({token:"fixture-one-time-token",revision:definition.revision,path:`/api/v1/lc/automation-webhook?automationId=${definition.id}`});
  return json(definition);
};
const row={id:recordId,tableId:table.id} as Row;
function RecordFixture(){const [key,setKey]=useState(0);return <div className="p-4"><button type="button" className="mr-3 text-sm underline" onClick={()=>setKey(value=>value+1)}>重新打开记录按钮</button><AutomationRecordActions key={key} row={row}/></div>;}
const root=createRoot(document.getElementById("root")!);root.render(<BrowserRouter><div className="flex flex-wrap items-center gap-3 px-4 pt-4"><p className="text-xs text-muted-foreground">验收夹具使用固定 JSON 和接口替身；调试结果为预设展示数据。</p><WorkflowNotices/></div><AutomationWorkspace table={table} directory={{people:[],units:[],positions:[]}}/><RecordFixture/></BrowserRouter>);
if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=original;});
