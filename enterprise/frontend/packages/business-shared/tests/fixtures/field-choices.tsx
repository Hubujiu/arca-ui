import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {Button} from "../../src/shared/ui";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {FieldDesigner} from "../../src/lowcode/FieldDesigner";
import {ChoiceOptionsSettings} from "../../src/lowcode/ChoiceOptionsSettings";
import {validateValues,type TableSchema} from "../../src/lowcode/field-model";
import {ruleMatches,ruleSummary} from "../../src/lowcode/rules";
import {recordTitle} from "../../src/lowcode/record-presentation";
const originalFetch=window.fetch;window.fetch=async(input,init)=>new URL(String(input),location.origin).pathname==="/api/v1/me"?new Response(JSON.stringify({id:"10000000-0000-4000-8000-000000000099",displayName:"验收成员",username:"fixture",enabled:true}),{headers:{"Content-Type":"application/json"}}):originalFetch(input,init);
const directory={people:[],units:[],positions:[]};
const definition:TableSchema={name:"稳定选项验收",description:"选项重命名与独立其他文本",titleFieldId:"status",fields:[
 {id:"status",label:"处理状态",type:"select",options:["pending","done"],choiceConfig:{displayLabels:{pending:"待处理",done:"已完成"},allowOther:true,otherLabel:"其他状态",otherMaxLength:20}},
 {id:"tags",label:"业务分类",type:"multiselect",options:["legacy","optFinance"],choiceConfig:{displayLabels:{legacy:"历史分类",optFinance:"财务服务"},style:"vertical",allowOther:true,otherLabel:"其他分类"}},
 {id:"stage",label:"当前阶段",type:"select",options:["a","b","c"],choiceConfig:{displayLabels:{a:"受理",b:"办理",c:"归档"},style:"stages"}}
]};
const initial={status:"pending",tags:["legacy"],stage:"a"};
function Fixture(){const [schema,setSchema]=useState(definition),[values,setValues]=useState<Record<string,unknown>>(initial),[selected,setSelected]=useState("status"),[errors,setErrors]=useState<Record<string,string>>({}),[designer,setDesigner]=useState(false),[readOnly,setReadOnly]=useState(false);const field=schema.fields.find(field=>field.id===selected)!;const rule={fieldId:"status",operator:"EQ" as const,value:"pending"};
 return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"><h1 className="text-xl font-semibold">选项设置与记录填写</h1><div className="flex flex-wrap items-center gap-2"><Button onClick={()=>setDesigner(!designer)}>{designer?"返回填写":"打开真实设计器"}</Button><Button variant="outline" onClick={()=>setReadOnly(!readOnly)}>{readOnly?"返回编辑":"查看记录"}</Button><Button variant="outline" onClick={()=>setErrors(validateValues(schema,values,true,{mode:"edit",existing:initial}))}>验证保存</Button></div><p data-testid="title">记录标题：{recordTitle(schema,values)}</p><p data-testid="rule">{ruleSummary(rule,schema.fields)}：{ruleMatches(rule,values,schema.fields)?"满足":"不满足"}</p>
 {designer?<FieldDesigner value={schema} onChange={setSchema} directory={directory}/>:<div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_320px]"><FieldRenderer schema={schema} value={values} originalValue={initial} mode="edit" onChange={value=>{setValues(value);setErrors({});}} readOnly={readOnly} errors={errors} directory={directory}/><aside className="min-w-0 space-y-4 rounded-xl border border-border p-4"><label className="block space-y-2 text-sm">配置字段<select aria-label="配置字段" value={selected} onChange={event=>setSelected(event.target.value)} className="block w-full rounded-lg border border-border bg-background p-2">{schema.fields.map(field=><option key={field.id} value={field.id}>{field.label}</option>)}</select></label><ChoiceOptionsSettings field={field} onChange={patch=>setSchema(current=>({...current,fields:current.fields.map(item=>item.id===selected?{...item,...patch}:item)}))}/></aside></div>}
 <pre data-testid="values" className="overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(values,null,2)}</pre><pre data-testid="errors" className="text-xs text-destructive">{JSON.stringify(errors,null,2)}</pre><pre data-testid="schema" className="max-h-48 overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(schema,null,2)}</pre></main>;
}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>{root.unmount();window.fetch=originalFetch;});
