import React from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {RecordDetail} from "../../src/lowcode/RecordDetail";
import type {TableSchema} from "../../src/lowcode/field-model";
import type {Row} from "../../src/lowcode/model";
const record="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",table="bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee",owner="11111111-2222-4333-8444-000000000001",collaborator="11111111-2222-4333-8444-000000000002";
let current={ownerId:owner,ownerName:"陈负责人",collaboratorIds:[collaborator],collaborators:[{id:collaborator,name:"林协作者"}],revision:1,canManage:true,history:[] as unknown[]};
const original=window.fetch;
window.fetch=async(input,init)=>{const path=String(input),body=typeof init?.body==="string"?JSON.parse(init.body):{},json=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json"}});
 if(path.endsWith("/ownership")){if(init?.method==="PUT")current={...current,...body,ownerName:body.ownerId===owner?"陈负责人":"林协作者",collaborators:body.collaboratorIds.map((id:string)=>({id,name:id===owner?"陈负责人":"林协作者"})),revision:current.revision+1,history:[{revision:current.revision+1,actorName:"陈负责人",createdAt:"2026-09-12T10:00:00Z",beforeValue:{ownerId:current.ownerId},afterValue:{ownerId:body.ownerId}}]};return json(current);}
 if(path.includes("/automation-buttons?"))return json([]);
 if(path.endsWith("/workflows"))return json([{id:"workflow1",title:"客户服务合同",operation:"CREATE",creatorName:"陈负责人",status:"APPROVED",createdAt:"2026-09-10T08:00:00Z",completedAt:"2026-09-10T10:00:00Z",visits:[{nodeName:"部门审核",nodeType:"APPROVAL",state:"COMPLETED",valid:true,enteredAt:"2026-09-10T08:00:00Z",completedAt:"2026-09-10T10:00:00Z"}]}]);
 return original(input,init);
};
const schema:TableSchema={name:"客户合同",description:"",titleFieldId:"name",detailConfig:{layout:"tabs",sections:["overview","history","workflow","attachments"]},printConfig:{fieldIds:["name","amount","note","computed"],columns:2,orientation:"portrait",showMetadata:true},fields:[{id:"name",label:"合同名称",type:"text"},{id:"amount",label:"合同金额",type:"number",format:"currency"},{id:"note",label:"服务约定",type:"richtext"},{id:"hidden",label:"隐藏字段",type:"text",visibility:"alwaysHidden"},{id:"computed",label:"已保存计算快照",type:"formula",formulaConfig:{expression:{op:"FIELD",fieldId:"amount"}}},{id:"condition",label:"大额备注",type:"text",visibleWhen:{fieldId:"amount",operator:"GT",value:100000}}]};
const row:Row={id:record,tableId:table,schema,title:"旧标题",data:{name:"客户服务合同",amount:12500,note:"<p><strong>服务范围</strong>：资料整理与交付。</p>",computed:42,hidden:"不应打印",condition:"不应打印"},revision:3,createdBy:owner,creatorName:"陈负责人",createdAt:"2026-09-10T08:00:00Z",updatedAt:"2026-09-12T08:00:00Z",canUpdate:true,canDelete:true,pendingChange:false,history:[{revision:3,action:"UPDATE",createdAt:"2026-09-12T08:00:00Z",actorName:"林协作者"},{revision:1,action:"CREATE",createdAt:"2026-09-10T08:00:00Z",actorName:"陈负责人"}]};
const directory={people:[{id:owner,username:"chen",displayName:"陈负责人",enabled:true,loginBound:true,systemRole:"USER" as const},{id:collaborator,username:"lin",displayName:"林协作者",enabled:true,loginBound:true,systemRole:"USER" as const}],units:[],positions:[]};
const root=createRoot(document.getElementById("root")!);root.render(<main className="mx-auto max-w-5xl p-4 sm:p-8"><p className="mb-5 text-xs text-muted-foreground">组件夹具使用接口替身；真实授权由数据库集成测试验证。</p><RecordDetail row={row} schema={schema} directory={directory}/></main>);if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=original;});
