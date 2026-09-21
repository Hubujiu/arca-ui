import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FormLayoutSettings} from "../../src/lowcode/FormLayoutSettings";
import {Button} from "../../src/shared/ui";
import {validateFieldConfigs,validateValues,type TableSchema} from "../../src/lowcode/field-model";
const initial:TableSchema={name:"项目费用申请",description:"切换布局会保留填写内容",fields:[{id:"title",type:"text",label:"项目名称",required:true},{id:"amount",type:"number",label:"申请金额",required:true},{id:"note",type:"textarea",label:"申请说明",width:12}],layouts:[{id:"compact",name:"金额优先",columns:2,fieldOrder:["amount","title","note"],widths:{note:12}},{id:"vertical",name:"逐项填写",columns:1,fieldOrder:["title","note","amount"]}],defaultLayoutId:"compact"};
function Fixture(){const[schema,setSchema]=useState(initial),[values,setValues]=useState<Record<string,unknown>>({title:"内部项目",amount:1200}),[errors,setErrors]=useState<Record<string,string>>({});return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8"><FormLayoutSettings schema={schema} onChange={setSchema}/><FieldRenderer schema={schema} value={values} onChange={setValues} directory={{units:[],positions:[],people:[]}} errors={errors}/><Button onClick={()=>setErrors({...validateFieldConfigs(schema),...validateValues(schema,values)})}>保存并验证配置</Button><pre data-testid="errors">{JSON.stringify(errors)}</pre><pre data-testid="values" className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(values)}</pre></main>;}
createRoot(document.getElementById("root")!).render(<Fixture/>);
