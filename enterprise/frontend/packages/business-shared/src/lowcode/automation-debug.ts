import {uuidPattern,type AutomationKind} from "./automation-model";
export type AutomationDebugInput={revision:number;data:Record<string,unknown>;recordId?:string;recordRevision?:number;mockOutputs:Record<string,Record<string,unknown>>};
export type AutomationDebugStep={stepPath:string;kind:AutomationKind;state:"DONE"|"SIMULATED"|"SKIPPED"|"FAILED";input:unknown;output:unknown;mocked?:boolean;error?:string};
export type AutomationDebugResult={mode:"DRY_RUN";revision:number;trigger:unknown;steps:AutomationDebugStep[];outputs:unknown;error?:string;unusedMockPaths:string[]};
export const debugStates={DONE:"已计算 / 查询",SIMULATED:"已模拟",SKIPPED:"未进入分支",FAILED:"调试失败"};
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
export function parseDebugInput(revision:number,dataText:string,mocksText:string,recordId:string,recordRevision:string):AutomationDebugInput {
  if(!Number.isInteger(revision)||revision<1)throw Error("请重新读取已保存草稿");
  if(dataText.length+mocksText.length>262144)throw Error("调试输入与模拟输出合计最多 256 KB");
  let data:unknown,mocks:unknown;try{data=JSON.parse(dataText);mocks=JSON.parse(mocksText);}catch{throw Error("测试数据和模拟输出需要有效 JSON 对象");}
  if(!object(data)||!object(mocks))throw Error("测试数据和模拟输出需要 JSON 对象");
  const entries=Object.entries(mocks);if(entries.length>250)throw Error("最多提供二百五十项模拟输出");
  for(const [path,value] of entries)if(path.length>255||!/^root(?:\.(?:[A-Za-z][A-Za-z0-9]{0,31}|[0-9]{1,2})){1,20}$/.test(path)||!object(value))throw Error("模拟输出使用完整节点路径及 JSON 对象，例如 root.step1 或 root.loop.0.step2");
  const id=recordId.trim(),rev=recordRevision.trim();
  if(id&&!uuidPattern.test(id))throw Error("关联记录 ID 格式无效");
  if(rev&&(!/^[0-9]+$/.test(rev)||!Number.isSafeInteger(Number(rev))||Number(rev)<1||Number(rev)>2147483647))throw Error("记录修订需要有效的正整数");
  return {revision,data,...(id?{recordId:id}:{}),...(rev?{recordRevision:Number(rev)}:{}),mockOutputs:mocks as Record<string,Record<string,unknown>>};
}
