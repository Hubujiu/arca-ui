import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { FieldRenderer } from "../../src/lowcode/FieldRenderer";
import { FieldDesigner } from "../../src/lowcode/FieldDesigner";
import { Button } from "../../src/shared/ui";
import { validateValues, type TableSchema } from "../../src/lowcode/field-model";
const definition: TableSchema = { name: "扩展字段验收", description: "富文本、布局、大写金额与定位", fields: [
  { id:"notice",label:"填写说明",type:"remark",richContent:"<h3>费用申请</h3><p>请填写<strong>实际金额</strong>及支出说明。</p><script>window.bad=1</script>" },
  { id:"tabs",label:"申请内容",type:"tabs",layoutConfig:{sections:[{id:"details",title:"费用信息",fieldIds:["amount","upper"]},{id:"notes",title:"详细说明",fieldIds:["body"]}]} },
  { id:"amount",label:"支出金额",type:"number",required:true },
  { id:"upper",label:"大写金额",type:"chineseAmount",amountConfig:{sourceFieldId:"amount",unit:"元"} },
  { id:"body",label:"支出说明",type:"richtext",required:true,width:12,maxLength:20000 },
  { id:"panels",label:"其他信息",type:"collapse",layoutConfig:{sections:[{id:"where",title:"发生地点",fieldIds:["place"],collapsed:true}]} },
  { id:"place",label:"发生位置",type:"location",required:true,width:12,locationConfig:{bounds:{south:20,north:40,west:100,east:125}} },
] };
function Fixture() {
  const [schema,setSchema]=useState(definition),[values,setValues]=useState<Record<string,unknown>>({amount:10001.05}),[errors,setErrors]=useState<Record<string,string>>({}),[designer,setDesigner]=useState(false),[readOnly,setReadOnly]=useState(false);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6"><div className="flex flex-wrap gap-2"><Button onClick={()=>setDesigner(!designer)}>{designer?"返回填写":"打开设计器"}</Button><Button variant="outline" onClick={()=>setReadOnly(!readOnly)}>{readOnly?"返回编辑":"查看快照"}</Button></div>
    {designer?<FieldDesigner value={schema} onChange={setSchema} directory={{units:[],positions:[],people:[]}}/>:<FieldRenderer schema={schema} value={values} onChange={(next)=>{setValues(next);setErrors({});}} directory={{units:[],positions:[],people:[]}} errors={errors} readOnly={readOnly}/>}
    <Button onClick={()=>setErrors(validateValues(schema,values))}>验证完整表单</Button>
    <pre data-testid="values" className="overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(values,null,2)}</pre><pre data-testid="errors" className="text-xs text-destructive">{JSON.stringify(errors,null,2)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
