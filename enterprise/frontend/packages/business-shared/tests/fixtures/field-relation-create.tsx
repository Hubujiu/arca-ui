import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FieldDesigner} from "../../src/lowcode/FieldDesigner";
import {Button} from "../../src/shared/ui";
import type {TableSchema} from "../../src/lowcode/field-model";
const tableId="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",recordId="11111111-2222-4333-8444-555555555555",changeId="22222222-2222-4333-8444-555555555555",sourceId="33333333-2222-4333-8444-555555555555";
const params=new URLSearchParams(location.search),pending=params.get("mode")==="pending",canCreate=params.get("mode")!=="reader",unsaved=params.has("unsaved");
const target:TableSchema={name:"商品",description:"填写后按目标表规则提交。",fields:[{id:"name",type:"text",label:"商品名称",required:true}]};
let created=false,approved=!pending,data:Record<string,unknown>={},posts=0,reverseRequests=0;
const realFetch=window.fetch;
window.fetch=async(input,init)=>{
  const url=String(input),body=typeof init?.body==="string"?JSON.parse(init.body):{},reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
  if(url==="/api/v1/me")return reply({id:sourceId,displayName:"测试成员"});
  if(url==="/api/v1/organization")return reply({people:[],units:[],positions:[]});
  if(url===`/api/v1/lc/tables/${tableId}`)return reply({id:tableId,name:"商品",permissions:{create:canCreate,read:"ALL"},publishedVersion:{schema:target}});
  if(url==="/api/v1/lc/relation-tables")return reply([{id:tableId,appId:tableId,appName:"关联验收",name:"商品",canCreate,fields:[...target.fields,{id:"parent",label:"关联当前记录",type:"relation",relationConfig:{tableId}}]}]);
  if(url===`/api/v1/lc/tables/${tableId}/records`){if(!canCreate)return reply({message:"没有创建权限"},403);posts++;data=body.data;created=true;return reply({id:changeId,status:approved?"APPROVED":"PENDING",record_id:approved?recordId:null,data});}
  if(url===`/api/v1/lc/changes/${changeId}`){approved=true;return reply({id:changeId,status:"APPROVED",record_id:recordId,data});}
  if(url===`/api/v1/lc/records/${recordId}`)return reply({id:recordId,table_id:tableId,data});
  if(url==="/api/v1/lc/relation-records/search"){
    if(body.backReferenceFieldId){reverseRequests++;return reply({items:[{id:recordId,label:"引用当前记录",values:{name:"仅当前记录的关联结果"}}],hasMore:false,offset:0});}
    return reply({items:created&&approved?[{id:recordId,label:data.name??"已生效记录"}]:[],hasMore:false,offset:0});
  }
  return realFetch(input,init);
};
const initial:TableSchema={name:"关联新建与反向查询",description:"使用接口替身检查交互；数据库权限另由真实集成测试验证。",fields:[{id:"link",label:"关联商品",type:"relation",relationConfig:{tableId,allowCreate:true,titleFieldId:"name"}},{id:"backrefs",label:"引用当前记录的商品",type:"queryTable",queryConfig:{tableId,columnIds:["name"],backReferenceFieldId:"parent"}}]};
function Fixture(){const [schema,setSchema]=useState(initial),[values,setValues]=useState<Record<string,unknown>>({}),[design,setDesign]=useState(false),[checks,setChecks]=useState({posts,reverseRequests});return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8"><div className="flex flex-wrap items-center gap-3"><a href="?">直接生效场景</a><a href="?mode=pending">审批场景</a><a href="?mode=reader">只读场景</a><a href="?unsaved=1">未保存场景</a><Button onClick={()=>setDesign(!design)}>{design?"返回填写":"设计设置"}</Button></div>{design?<FieldDesigner value={schema} onChange={setSchema} directory={{people:[],units:[],positions:[]}}/>:<FieldRenderer schema={schema} value={values} onChange={setValues} directory={{people:[],units:[],positions:[]}} fileContext={{tableId,recordId:unsaved?undefined:sourceId}}/>}<pre data-testid="values" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(values,null,2)}</pre><Button variant="outline" onClick={()=>setChecks({posts,reverseRequests})}>读取请求计数</Button><pre data-testid="requests">{JSON.stringify(checks)}</pre></main>;}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);
if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=realFetch;});
