import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {AutomationStepEditor} from "../../src/lowcode/AutomationStepEditor";
import {AutomationRunDetail} from "../../src/lowcode/AutomationRuns";
import {validateAutomation,type AutomationStep} from "../../src/lowcode/automation-model";
const id="10000000-0000-4000-8000-000000000001",artifact="10000000-0000-4000-8000-000000000002",calls:{path:string;method:string}[]=[],original=window.fetch,denied=new URLSearchParams(location.search).has("denied");
(window as unknown as {printFixture:unknown}).printFixture={calls};
window.fetch=async(input,init)=>{const path=new URL(String(input),location.origin).pathname;if(!path.startsWith("/api/"))return original(input,init);calls.push({path,method:init?.method??"GET"});const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
  if(path.endsWith("/automation-print-templates"))return json({tableVersionId:id,templates:[{id:"receipt",name:"中文报销单",supported:true},{id:"rich",name:"图片详情",supported:false,error:"DOCX 打印不支持图片字段"}]});
  if(path.includes("/automation-runs/"))return json({run:{id,automationId:id,state:"DONE",createdAt:"2026-09-12T12:00:00Z",attempts:1},steps:[{stepPath:"root.print",kind:"PRINT",state:"DONE",outputSnapshot:{artifactId:artifact,fileName:"不应从原始输出渲染下载.docx"}}],artifacts:denied?[]:[{artifactId:artifact,stepPath:"root.print",fileName:"中文报销单-记录示例.docx",mediaType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",size:12345,recordId:id,revision:2,tableVersionId:id,templateId:"receipt",sha256:"a".repeat(64)}],canRetry:false});
  if(path.includes("/automation-artifacts/"))return json({message:"记录读取权限已撤销，请刷新运行详情"},403);
  return json({message:"未模拟接口"},404);
};
function Fixture(){const [steps,setSteps]=useState<AutomationStep[]>([{id:"print",kind:"PRINT",tableId:id,printTemplateId:"receipt",inputs:{recordId:{path:"trigger.recordId"},revision:{path:"trigger.revision"}}}]);return <main className="mx-auto max-w-4xl space-y-5 p-4"><h1 className="text-xl font-semibold">自动化打印配置与产物</h1><p className="text-sm text-muted-foreground">接口替身只验证界面，不生成真实 DOCX；下载故意返回当前权限被撤销。</p><AutomationRunDetail id={id}/><p role="status" className="text-sm">{validateAutomation({trigger:{type:"BUTTON"},steps}).join("；")||"打印配置校验通过"}</p><AutomationStepEditor steps={steps} rootSteps={steps} onChange={setSteps} schema={{name:"报销",description:"",fields:[{id:"amount",type:"number",label:"金额"}]}} directory={{people:[],units:[],positions:[]}} tables={[{id,appId:id,appName:"财务",name:"报销申请",fields:[]}]} automations={[]} connectors={[]}/><pre data-testid="definition" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(steps,null,2)}</pre></main>;}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=original;});
