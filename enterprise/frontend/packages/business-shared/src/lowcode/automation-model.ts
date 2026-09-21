import {validateRule,type Rule} from "./rules";
import {validateExpression,type Expression} from "./calculations";
import type {LowcodeField} from "./field-model";
export type AutomationTrigger="CREATE"|"UPDATE"|"DELETE"|"BUTTON"|"SCHEDULE"|"DATE_FIELD"|"WEBHOOK";
export type AutomationKind="QUERY"|"ORG_QUERY"|"PRINT"|"CREATE"|"UPDATE"|"DELETE"|"CONDITION"|"FOREACH"|"SUBFLOW"|"FUNCTION"|"NOTICE"|"HTTP"|"AI"|"EMAIL"|"SMS";
export type AutomationBinding={literal:unknown}|{path:string};
export type AutomationStep={id:string;kind:AutomationKind;tableId?:string;automationId?:string;connectorId?:string;printTemplateId?:string;inputs?:Record<string,AutomationBinding>;values?:Record<string,AutomationBinding>;rule?:Rule;formula?:Expression;steps?:AutomationStep[];elseSteps?:AutomationStep[]};
export type AutomationFailureNotice={enabled:boolean;recipientIds:string[]};
export type AutomationDraft={trigger:{type:AutomationTrigger;intervalMinutes?:number;dateFieldId?:string;offsetMinutes?:number};steps:AutomationStep[];failureNotice?:AutomationFailureNotice};
export type Automation={id:string;tableId:string;appId?:string;name:string;revision:number;enabled:boolean;draft:AutomationDraft;publishedVersionId?:string|null;publishedVersion?:{id:string;version:number;draft?:AutomationDraft;definition?:AutomationDraft};canRun?:boolean};
export type AutomationConnector={id:string;appId:string;name:string;url:string;method:"GET"|"POST"|"PUT"|"DELETE";enabled:boolean;authorizationEnv?:string;revision:number};
export type AutomationRun={id:string;automationId:string;automationName?:string;status:string;state?:string;createdAt:string;startedAt?:string;finishedAt?:string;completedAt?:string;attempt?:number;attempts?:number;error?:string;errorCode?:string;retryable?:boolean;canRetry?:boolean;artifacts?:AutomationPrintArtifact[];steps?:AutomationRunStep[]};
export type AutomationRunStep={id?:string;stepId?:string;stepPath?:string;kind:string;status:string;createdAt?:string;startedAt?:string;finishedAt?:string;error?:string;errorCode?:string;output?:unknown};
export type AutomationPrintArtifact={artifactId:string;stepPath:string;fileName:string;mediaType:string;size:number;recordId:string;revision:number;tableVersionId:string;templateId:string;sha256:string};
export type AutomationRunResponse={run:AutomationRun;steps:(AutomationRunStep&{state?:string;completedAt?:string;outputSnapshot?:unknown})[];canRetry?:boolean;artifacts?:AutomationPrintArtifact[]};
export function normalizeAutomationRun(value:AutomationRunResponse):AutomationRun {return {...value.run,status:value.run.state??value.run.status,canRetry:value.canRetry??value.run.canRetry,artifacts:value.artifacts??[],steps:value.steps.map(step=>({...step,status:step.state??step.status,finishedAt:step.completedAt??step.finishedAt,output:step.outputSnapshot??step.output}))};}
export function normalizeAutomation(value:Automation):Automation {
  function steps(entries:AutomationStep[]):AutomationStep[]{return (entries??[]).map(entry=>{const step=Object.fromEntries(Object.entries(entry).filter(([,value])=>value!==null)) as AutomationStep;for(const key of ["inputs","values"] as const)if(step[key])step[key]=Object.fromEntries(Object.entries(step[key]!).map(([id,value])=>{const binding=value as {path?:string|null;literal?:unknown};return [id,binding.path!=null?{path:binding.path}:{literal:binding.literal}];}));step.steps=steps(step.steps??[]);step.elseSteps=steps(step.elseSteps??[]);return step;});}
  return {...value,draft:{trigger:Object.fromEntries(Object.entries(value.draft.trigger).filter(([,value])=>value!==null)) as AutomationDraft["trigger"],steps:steps(value.draft.steps),...(value.draft.failureNotice?{failureNotice:{enabled:value.draft.failureNotice.enabled??true,recipientIds:value.draft.failureNotice.recipientIds??[]}}:{})}};
}
export function redactAutomationValue(value:unknown,depth=0):unknown {if(depth>8)return "[已省略]";if(Array.isArray(value))return value.slice(0,50).map(item=>redactAutomationValue(item,depth+1));if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/password|secret|token|authorization|cookie|api.?key/i.test(key)?"[已隐藏]":redactAutomationValue(item,depth+1)]));return typeof value==="string"&&value.length>4000?`${value.slice(0,4000)}…`:value;}
export const automationTriggers:Record<AutomationTrigger,string>={CREATE:"新增记录后",UPDATE:"修改记录后",DELETE:"删除记录后",BUTTON:"手动按钮",SCHEDULE:"定时间隔",DATE_FIELD:"到达日期字段",WEBHOOK:"收到 Webhook"};
export const automationKinds:Record<AutomationKind,string>={QUERY:"查询记录",ORG_QUERY:"获取组织成员",PRINT:"生成打印文档",CREATE:"新增记录",UPDATE:"更新记录",DELETE:"删除记录",CONDITION:"条件分支",FOREACH:"逐项循环",SUBFLOW:"调用子自动化",FUNCTION:"计算函数",NOTICE:"站内通知",HTTP:"HTTP 请求",AI:"AI 处理",EMAIL:"发送邮件",SMS:"发送短信"};
export const runStates:Record<string,string>={QUEUED:"排队中",PENDING:"等待执行",RUNNING:"执行中",DONE:"已完成",SUCCEEDED:"成功",SUCCESS:"成功",COMPLETED:"完成",FAILED:"失败",SKIPPED:"已跳过",RETRY:"等待重试",RETRYING:"等待重试",CANCELLED:"已取消"};
export const externalKinds=new Set<AutomationKind>(["HTTP","EMAIL","SMS"]);
export const uuidPattern=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const automationKey=(value:string)=>/^[A-Za-z][A-Za-z0-9]{0,31}$/.test(value)&&!["constructor","prototype","__proto__"].includes(value);
export function stepCount(steps:AutomationStep[]):number {return steps.reduce((total,step)=>total+1+stepCount(step.steps??[])+stepCount(step.elseSteps??[]),0);}
export function allSteps(steps:AutomationStep[]):AutomationStep[]{return steps.flatMap(step=>[step,...allSteps(step.steps??[]),...allSteps(step.elseSteps??[])]);}
export function newAutomationStep(kind:AutomationKind,existing:AutomationStep[]):AutomationStep {let index=1;const ids=new Set(allSteps(existing).map(step=>step.id));while(ids.has(`step${index}`))index++;return {id:`step${index}`,kind,...(["CONDITION","FOREACH"].includes(kind)?{steps:[]}:{}),...(kind==="CONDITION"?{elseSteps:[],rule:{fieldId:"",operator:"NOT_EMPTY" as const}}:{}),...(kind==="FUNCTION"?{formula:{op:"CONST" as const,value:0}}:{})};}
export function moveAutomationStep(steps:AutomationStep[],index:number,direction:-1|1) {const next=[...steps],target=index+direction;if(index<0||index>=next.length||target<0||target>=next.length)return steps;[next[index],next[target]]=[next[target],next[index]];return next;}
export function bindingError(binding:unknown):string|undefined {if(!binding||typeof binding!=="object"||Array.isArray(binding))return "请选择固定值或变量来源";const value=binding as Record<string,unknown>,keys=Object.keys(value);if(keys.length!==1)return "绑定只能有一种来源";if(keys[0]==="literal"){try {const text=JSON.stringify(value.literal);if(text===undefined||text.length>50000||typeof value.literal==="number"&&!Number.isFinite(value.literal))return "固定值需要有效 JSON，最长 50000 字符";}catch{return "固定值需要有效 JSON";}return;}
  if(keys[0]!=="path"||typeof value.path!=="string"||!value.path||value.path.split(".").some(part=>["constructor","prototype","__proto__"].includes(part))||! /^(trigger|steps|item)(?:\.[A-Za-z][A-Za-z0-9_]{0,63}|\.[0-9]{1,2}){0,8}$/.test(value.path))return "变量路径需要 trigger、steps.步骤标识 或 item，最多八层";
}
export function validateAutomation(draft:AutomationDraft,fields?:LowcodeField[]):string[] {
  const issues:string[]=[],ids=new Set<string>();
  if(!draft||typeof draft!=="object"||Object.keys(draft).some(key=>!["trigger","steps","failureNotice"].includes(key)))return["自动化配置无效"];
  if(draft.failureNotice!==undefined){const config=draft.failureNotice;if(!config||typeof config!=="object"||Object.keys(config).some(key=>!["enabled","recipientIds"].includes(key))||typeof config.enabled!=="boolean"||!Array.isArray(config.recipientIds)||config.recipientIds.length>20||config.recipientIds.some(id=>typeof id!=="string"||!uuidPattern.test(id))||new Set(config.recipientIds.map(id=>id.toLowerCase())).size!==config.recipientIds.length)issues.push("失败通知最多选择二十名不同的有效管理者");}
  const trigger=draft.trigger;
  if(!trigger||!Object.hasOwn(automationTriggers,trigger.type))issues.push("请选择触发方式");
  if(!Array.isArray(draft.steps)||!draft.steps.length)return[...issues,"至少添加一个步骤"];
  if(trigger?.type==="SCHEDULE"&&(!Number.isInteger(trigger.intervalMinutes)||Number(trigger.intervalMinutes)<1||Number(trigger.intervalMinutes)>525600))issues.push("执行间隔需要 1 至 525600 分钟");
  if(trigger?.type==="DATE_FIELD"){
    if(!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(trigger.dateFieldId??"")||fields&&!fields.some(field=>field.id===trigger.dateFieldId&&["date","datetime"].includes(field.type)))issues.push("请选择有效日期字段");
    if(trigger.offsetMinutes!==undefined&&(!Number.isInteger(trigger.offsetMinutes)||Math.abs(trigger.offsetMinutes)>525600))issues.push("日期偏移需要正负 525600 分钟以内的整数");
  }
  function visit(steps:AutomationStep[],depth:number){
    if(!steps.length)return;
    if(depth>5){issues.push("自动化最多嵌套五层");return;}
    for(const step of steps){
      if(!automationKey(step.id)||ids.has(step.id))issues.push("步骤标识必须有效且全局唯一");
      ids.add(step.id);
      if(!Object.hasOwn(automationKinds,step.kind))issues.push("步骤类型无效");
      if(["QUERY","PRINT","CREATE","UPDATE","DELETE"].includes(step.kind)&&!uuidPattern.test(step.tableId??""))issues.push(`${step.id}：请选择目标表`);
      if(step.kind==="SUBFLOW"&&!uuidPattern.test(step.automationId??""))issues.push(`${step.id}：请选择子自动化`);
      if(externalKinds.has(step.kind)&&!uuidPattern.test(step.connectorId??""))issues.push(`${step.id}：需要配置连接器`);
      if(Object.keys(step.inputs??{}).length>50||Object.keys(step.values??{}).length>100)issues.push(`${step.id}：最多 50 个输入、100 个字段映射`);
      for(const values of [step.inputs,step.values])for(const [key,binding] of Object.entries(values??{})){
        if(!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(key))issues.push(`${step.id}：映射名称无效`);
        const error=bindingError(binding);if(error)issues.push(`${step.id} · ${key}：${error}`);
      }
      if(step.kind==="CONDITION"){
        if(!step.rule)issues.push(`${step.id}：请配置条件`);
        else if(fields)issues.push(...validateRule(step.rule,fields).map(error=>`${step.id}：${error}`));
      }
      if(step.kind==="FUNCTION"){
        if(!step.formula)issues.push(`${step.id}：请配置计算公式`);
        else issues.push(...validateExpression(step.formula,inputFields(step.values).map(field=>({...field,type:"number" as const}))).map(error=>`${step.id}：${error}`));
        if(Object.values(step.values??{}).some(binding=>"literal" in binding&&typeof binding.literal!=="number"))issues.push(`${step.id}：计算变量固定值需要数字`);
      }
      const required:Partial<Record<AutomationKind,string[]>>={PRINT:["recordId","revision"],UPDATE:["recordId","revision"],DELETE:["recordId","revision"],FOREACH:["items"],NOTICE:["recipients","message"],AI:["prompt"]};
      for(const key of required[step.kind]??[])if(!step.inputs?.[key])issues.push(`${step.id}：请映射 ${key}`);
      if(["CREATE","UPDATE"].includes(step.kind)&&step.inputs?.data&&Object.keys(step.values??{}).length)issues.push(`${step.id}：完整数据对象与逐字段写入只能选择一种`);
      const limit=step.inputs?.limit;
      if(["QUERY","ORG_QUERY"].includes(step.kind)&&limit&&"literal" in limit&&(!Number.isInteger(limit.literal)||Number(limit.literal)<1||Number(limit.literal)>50))issues.push(`${step.id}：查询条数需要 1 至 50`);
      if(step.kind==="PRINT"){
        if(!/^[a-z][a-zA-Z0-9]{0,63}$/.test(step.printTemplateId??""))issues.push(`${step.id}：请选择已发布的命名打印模板`);
        if(step.connectorId||step.automationId||Object.keys(step.values??{}).length||Object.keys(step.inputs??{}).some(key=>!["recordId","revision"].includes(key)))issues.push(`${step.id}：打印只接受正式记录编号和内容修订`);
        const record=step.inputs?.recordId,revision=step.inputs?.revision;
        if(record&&"literal" in record&&(typeof record.literal!=="string"||!uuidPattern.test(record.literal)))issues.push(`${step.id}：打印需要有效正式记录编号`);
        if(revision&&"literal" in revision&&(!Number.isInteger(revision.literal)||Number(revision.literal)<1))issues.push(`${step.id}：打印内容修订必须为正整数`);
      }else if(step.printTemplateId!==undefined)issues.push(`${step.id}：只有打印节点可选择打印模板`);
      if(step.kind==="ORG_QUERY"){
        if(step.tableId||step.automationId||step.connectorId||Object.keys(step.values??{}).length)issues.push(`${step.id}：组织查询只接受输入参数`);
        for(const [key,binding] of Object.entries(step.inputs??{})){
          if(!["departmentIds","positionIds","userIds","includeDescendants","selection","limit"].includes(key))issues.push(`${step.id}：组织查询包含未知参数`);
          if(!("literal" in binding))continue;const value=binding.literal;
          if(["departmentIds","positionIds","userIds"].includes(key)&&(!Array.isArray(value)||value.length>50||value.some(id=>typeof id!=="string"||!uuidPattern.test(id))))issues.push(`${step.id}：组织筛选需要最多五十个 UUID 的列表`);
          if(key==="includeDescendants"&&typeof value!=="boolean")issues.push(`${step.id}：包含下级组织需要是或否`);
          if(key==="selection"&&!["MEMBERS","DIRECT_MANAGERS","DEPARTMENT_LEADERS"].includes(String(value)))issues.push(`${step.id}：组织查询结果类型无效`);
        }
      }
      if(["CONDITION","FOREACH"].includes(step.kind)&&!step.steps?.length)issues.push(`${step.id}：至少添加一个内部步骤`);
      visit(step.steps??[],depth+1);visit(step.elseSteps??[],depth+1);
    }
  }
  visit(draft.steps,1);
  if(ids.size>50||stepCount(draft.steps)>50)issues.push("最多声明五十个步骤");
  if(JSON.stringify(draft).length>65536)issues.push("自动化定义超出 64 KB 大小限制");
  return [...new Set(issues)];
}
export function inputFields(inputs?:Record<string,AutomationBinding>):LowcodeField[] {return Object.entries(inputs??{}).map(([id,binding])=>({id,label:id,type:"literal" in binding&&typeof binding.literal==="boolean"?"checkbox":"literal" in binding&&typeof binding.literal==="string"?"text":"number"}));}
export function connectorError(input:Omit<AutomationConnector,"id"|"appId"|"revision">):string|undefined {
  if(!input.name.trim()||input.name.length>128)return "请填写连接器名称";
  try{const url=new URL(input.url);if(!["https:","http:"].includes(url.protocol)||url.username||url.password||url.hash||url.search)return "地址不能包含凭据、查询参数或片段";if(url.protocol==="http:"&&!["localhost","127.0.0.1","[::1]"].includes(url.hostname))return "连接器需使用 HTTPS 地址";}catch{return "请填写有效连接器地址";}
  if(input.authorizationEnv&&!/^DOCWEAVE_CONNECTOR_[A-Z0-9_]{1,100}$/.test(input.authorizationEnv))return "授权环境变量名需以 DOCWEAVE_CONNECTOR_ 开头，后接大写字母、数字或下划线";
}
