import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FieldDesigner} from "../../src/lowcode/FieldDesigner";
import {Button} from "../../src/shared/ui";
import {validateValues,type TableSchema,type LowcodeField} from "../../src/lowcode/field-model";
const tableId="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",id=(index:number)=>`11111111-2222-4333-8444-${String(index).padStart(12,"0")}`;
const records=[{id:id(1),label:"总目录",parent:undefined,category:"",price:0},{id:id(2),label:"办公用品",parent:id(1),category:"",price:0},{id:id(3),label:"A 类纸张",parent:id(2),category:"A",price:10},{id:id(4),label:"A 类文具",parent:id(2),category:"A",price:20},{id:id(5),label:"B 类设备",parent:id(1),category:"B",price:50}];
const targetFields:LowcodeField[]=[{id:"name",label:"名称",type:"text"},{id:"category",label:"分类",type:"text"},{id:"price",label:"价格",type:"number"},{id:"parent",label:"父记录",type:"relation",relationConfig:{tableId}}];
const originalFetch=window.fetch;
window.fetch=async(input,init)=>{const path=String(input),body=typeof init?.body==="string"?JSON.parse(init.body):{},json=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json"}});
  if(path==="/api/v1/me")return json({id:id(9),displayName:"预览用户"});
  if(path==="/api/v1/lc/relation-tables")return json([{id:tableId,appId:tableId,appName:"组件验收",name:"商品目录",fields:targetFields}]);
  if(path==="/api/v1/lc/relation-records/search") {await new Promise(resolve=>setTimeout(resolve,70));const found=records.filter(record=>(!body.ids||body.ids.includes(record.id))&&(!body.cascade||body.ids||record.parent===body.parentId)&&(!body.filter||body.cascade||record.category===body.sourceValues?.category)&&record.label.includes(body.q??"")),offset=body.offset??0,size=body.pageSize??20;return json({items:found.slice(offset,offset+size).map(record=>({id:record.id,label:record.label,...(body.cascade?{hasChildren:records.some(entry=>entry.parent===record.id),selectable:!records.some(entry=>entry.parent===record.id)}:{}),...(body.columns?{values:Object.fromEntries(body.columns.map((field:string)=>[field,field==="name"?record.label:record[field as keyof typeof record]]))}:{})})),offset,nextOffset:offset+size,hasMore:found.length>offset+size});}
  if(path==="/api/v1/lc/relation-records/lookup") {await new Promise(resolve=>setTimeout(resolve,80));if(body.aggregate){const found=records.filter(record=>(body.recordIds??[]).includes(record.id));return json({value:body.aggregate==="COUNT"?found.length:found.reduce((sum,row)=>sum+row.price,0)});}return json({value:records.find(record=>record.id===body.recordId)?.label});}
  return originalFetch(input,init);
};
const filter={fieldId:"category",operator:"EQ" as const,sourceFieldId:"category"};
const initial:TableSchema={name:"关联扩展验收",description:"接口替身只用于交互验收；目标授权与路径有效性由后端集成测试验证。",fields:[
  {id:"category",label:"当前分类",type:"text",defaultValue:"A"},
  {id:"products",label:"筛选后的商品",type:"relation",relationConfig:{tableId,titleFieldId:"name",multiple:true,maxRecords:50,filter},width:12},
  {id:"total",label:"商品合计",type:"lookup",lookupConfig:{relationFieldId:"products",targetFieldId:"price",resultType:"number",aggregate:"SUM"}},
  {id:"count",label:"关联条数",type:"lookup",lookupConfig:{relationFieldId:"products",resultType:"number",aggregate:"COUNT"}},
  {id:"path",label:"逐级选择商品",type:"relation",relationConfig:{tableId,titleFieldId:"name",cascade:{parentFieldId:"parent",leafOnly:true,maxDepth:5}},width:12},
  {id:"table",label:"已关联商品表",type:"queryTable",queryConfig:{tableId,columnIds:["name","price"],relationFieldId:"products",pageSize:10}},
]};
function Fixture(){const [schema,setSchema]=useState(initial),[values,setValues]=useState<Record<string,unknown>>({category:"A"}),[errors,setErrors]=useState<Record<string,string>>({}),[designer,setDesigner]=useState(false),[busy,setBusy]=useState(false);
 return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"><Button onClick={()=>setDesigner(!designer)}>{designer?"返回填写":"打开设计器"}</Button>{designer?<FieldDesigner value={schema} onChange={setSchema} directory={{people:[],positions:[],units:[]}}/>:<FieldRenderer schema={schema} value={values} onChange={setValues} directory={{people:[],positions:[],units:[]}} errors={errors} onResolvingChange={setBusy}/>}<Button disabled={busy} onClick={()=>setErrors(validateValues(schema,values))}>验证填写</Button><pre data-testid="values" className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(values,null,2)}</pre><pre data-testid="errors">{JSON.stringify(errors)}</pre></main>;
}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=originalFetch;});
