import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FieldDesigner} from "../../src/lowcode/FieldDesigner";
import {validateValues, type TableSchema} from "../../src/lowcode/field-model";
import {Button} from "../../src/shared/ui";
const initial: TableSchema={name:"地区与详细地址",description:"带代码和版本的地址快照",fields:[{id:"address",label:"收货地址",type:"region",required:true,width:12,regionConfig:{depth:3,address:true,requireAddress:true}}]};
function Fixture(){
 const [schema,setSchema]=useState(initial),[values,setValues]=useState<Record<string,unknown>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[designer,setDesigner]=useState(false),[readOnly,setReadOnly]=useState(false);
 return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8"><h1 className="text-xl font-semibold">地区字段验收</h1><div className="flex flex-wrap gap-2"><Button onClick={()=>setDesigner(!designer)}>{designer?"返回填写":"编辑配置"}</Button><Button onClick={()=>setReadOnly(!readOnly)}>{readOnly?"编辑地址":"查看快照"}</Button></div>
 {designer?<FieldDesigner value={schema} onChange={setSchema} directory={{units:[],positions:[],people:[]}}/>:<FieldRenderer schema={schema} value={values} onChange={setValues} errors={errors} readOnly={readOnly} directory={{units:[],positions:[],people:[]}}/>}
 <Button onClick={()=>setErrors(validateValues(schema,values))}>验证完整地址</Button><pre data-testid="errors" className="whitespace-pre-wrap text-sm text-destructive">{JSON.stringify(errors)}</pre><pre data-testid="values" className="whitespace-pre-wrap break-all rounded-xl bg-muted p-4 text-xs">{JSON.stringify(values,null,2)}</pre></main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
