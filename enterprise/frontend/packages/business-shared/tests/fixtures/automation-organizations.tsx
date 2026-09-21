import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {AutomationStepEditor} from "../../src/lowcode/AutomationStepEditor";
import {validateAutomation,type AutomationStep} from "../../src/lowcode/automation-model";
const initial:AutomationStep[]=[{id:"people",kind:"ORG_QUERY",inputs:{userIds:{path:"trigger.data.people"},selection:{literal:"MEMBERS"},includeDescendants:{literal:true},limit:{literal:50}}},{id:"notice",kind:"NOTICE",inputs:{recipients:{path:"steps.people.userIds"},message:{literal:"组织成员提醒"}}}];
function Fixture(){const [steps,setSteps]=useState(initial),issues=validateAutomation({trigger:{type:"BUTTON"},steps});return <main className="mx-auto max-w-4xl space-y-4 p-4"><h1 className="text-xl font-semibold">原生组织查询配置</h1><p className="text-sm text-muted-foreground">此夹具只验证配置交互，不执行查询或发送通知。</p><p role="status" className="text-sm">{issues.length?issues.join("；"):"配置校验通过"}</p><AutomationStepEditor steps={steps} rootSteps={steps} onChange={setSteps} schema={{name:"申请",description:"",fields:[{id:"people",type:"members",label:"相关成员"}]}} directory={{people:[],units:[],positions:[]}} tables={[]} automations={[]} connectors={[]}/><pre data-testid="definition" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(steps,null,2)}</pre></main>;}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
