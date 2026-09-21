import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FieldDesigner} from "../../src/lowcode/FieldDesigner";
import {Button} from "../../src/shared/ui";
import type {TableSchema} from "../../src/lowcode/field-model";
const a="10000000-0000-4000-8000-000000000001",b="10000000-0000-4000-8000-000000000002",source="10000000-0000-4000-8000-000000000003",recordA="10000000-0000-4000-8000-000000000011",recordB="10000000-0000-4000-8000-000000000012",sourceRecord="10000000-0000-4000-8000-000000000013",changeId="10000000-0000-4000-8000-000000000014";
const params=new URLSearchParams(location.search),pending=params.has("pending"),canUpdate=!params.has("reader");let revision=1,data:Record<string,unknown>={name:"大额商品",price:20,parent:[sourceRecord]},nextData:Record<string,unknown>|undefined;
const calls:{url:string;method:string;body:unknown}[]=[],original=window.fetch;
const targetSchema:TableSchema={name:"大额商品",description:"按当前发布表单提交",fields:[{id:"name",label:"商品名称",type:"text",required:true},{id:"price",label:"单价",type:"number",required:true},{id:"parent",label:"所属申请",type:"relation",readOnly:true,relationConfig:{tableId:source}}]};
const tables=[{id:a,appId:source,appName:"验收应用",name:"普通商品",fields:targetSchema.fields.slice(0,2),canCreate:false},{id:b,appId:source,appName:"验收应用",name:"大额商品",fields:targetSchema.fields,canCreate:false},{id:source,appId:source,appName:"验收应用",name:"申请",fields:[{id:"name",label:"名称",type:"text"}]}];
(window as unknown as {dynamicFixture:unknown}).dynamicFixture={calls,get data(){return data;},get revision(){return revision;}};
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.origin),path=url.pathname,method=init?.method??"GET",body=typeof init?.body==="string"?JSON.parse(init.body):{},reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
  if(!path.startsWith("/api/"))return original(input,init);calls.push({url:path,method,body});
  if(path==="/api/v1/me")return reply({id:sourceRecord,displayName:"验收用户"});
  if(path==="/api/v1/organization")return reply({people:[],units:[],positions:[]});
  if(path==="/api/v1/lc/relation-tables")return reply(tables);
  if(path===`/api/v1/lc/tables/${b}`)return reply({id:b,name:"大额商品",permissions:{read:"ALL",update:canUpdate?"ALL":"NONE"},publishedVersion:{id:changeId,schema:targetSchema}});
  if(path===`/api/v1/lc/records/${recordB}`)return reply({id:recordB,table_id:b,title:"大额商品",revision,data});
  if(path===`/api/v1/lc/tables/${b}/records/${recordB}`){if(!canUpdate)return reply({message:"没有修改权限"},403);if(body.revision!==revision)return reply({message:"内容已变化"},409);nextData=body.data;if(!pending){data=nextData!;revision++;}return reply({id:changeId,record_id:recordB,status:pending?"PENDING":"APPROVED",data:nextData});}
  if(path===`/api/v1/lc/changes/${changeId}`){if(nextData){data=nextData;nextData=undefined;revision++;}return reply({id:changeId,record_id:recordB,status:"APPROVED",data});}
  if(path==="/api/v1/lc/relation-records/search"){
    if(body.backReferenceFieldId)return reply({items:[{id:recordB,label:data.name,values:{name:data.name,price:data.price},canUpdate,revision}],offset:0,hasMore:false});
    const items=body.tableId===a?[{id:recordA,label:"普通商品 A"}]:body.tableId===b?[{id:recordB,label:data.name}]:[{id:sourceRecord,label:"当前申请"}];
    return reply({items:body.ids?items.filter(row=>(body.ids as string[]).includes(row.id)):items,offset:0,hasMore:false});
  }
  return reply({message:`未模拟接口 ${path}`},404);
};
const initial:TableSchema={name:"动态关联与反向明细",description:"接口替身仅用于交互验收；权限与数据库行为由集成测试验证。",fields:[{id:"amount",label:"申请金额",type:"number"},{id:"link",label:"关联商品",type:"relation",relationConfig:{tableId:a,titleFieldId:"name",targets:[{id:"large",name:"大额商品来源",when:{fieldId:"amount",operator:"GT",value:10},tableId:b,titleFieldId:"name"}]}},{id:"details",label:"反向关联商品明细",type:"queryTable",queryConfig:{tableId:b,columnIds:["name","price"],backReferenceFieldId:"parent",allowEdit:true}}]};
function Fixture(){const [schema,setSchema]=useState(initial),[values,setValues]=useState<Record<string,unknown>>({amount:1,link:[recordA]}),[design,setDesign]=useState(false);return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8"><div className="flex flex-wrap gap-3"><a href="?">直接生效</a><a href="?pending=1">等待审批</a><a href="?reader=1">只读权限</a><Button onClick={()=>setDesign(!design)}>{design?"填写表单":"设计设置"}</Button></div>{design?<FieldDesigner value={schema} onChange={setSchema} directory={{people:[],units:[],positions:[]}}/>:<FieldRenderer schema={schema} value={values} onChange={setValues} directory={{people:[],units:[],positions:[]}} fileContext={{tableId:source,recordId:sourceRecord}}/>}<pre data-testid="values" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(values,null,2)}</pre></main>;}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=original;});
