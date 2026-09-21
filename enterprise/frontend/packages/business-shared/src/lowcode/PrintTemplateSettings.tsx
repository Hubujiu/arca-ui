import {useState} from "react";
import {Button,FieldSelect,Input} from "@/shared/ui";
import {Checkbox} from "@/components/motion/checkbox";
import type {TableSchema} from "./field-model";
import {printableField,type PrintConfig,type PrintTemplate} from "./record-presentation";

export function PrintTemplateSettings({schema,onChange,disabled}:{schema:TableSchema;onChange:(schema:TableSchema)=>void;disabled?:boolean}) {
  const [selected,setSelected]=useState("");
  const templates=schema.printTemplates??[],active=templates.find(template=>template.id===selected)??templates[0];
  function update(patch:Partial<PrintTemplate>){if(active)onChange({...schema,printTemplates:templates.map(template=>template.id===active.id?{...template,...patch}:template)});}
  function config(patch:Partial<PrintConfig>){if(active)update({config:{...active.config,...patch}});}
  function add(){let index=1;while(templates.some(template=>template.name===`打印方案${index}`))index++;const id=`print${crypto.randomUUID().replaceAll("-","")}`;
    const template:PrintTemplate={id,name:`打印方案${index}`,config:structuredClone(active?.config??schema.printConfig??{fieldIds:schema.fields.filter(printableField).map(field=>field.id),columns:1,orientation:"portrait",showMetadata:true})};
    onChange({...schema,printTemplates:[...templates,template]});setSelected(id);
  }
  return <fieldset disabled={disabled} className="mt-5 space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-center gap-3"><h3 className="flex-1 text-body font-medium">保存多套打印方案</h3><span className="text-caption text-muted-foreground">{templates.length} / 6</span><Button size="sm" variant="outline" disabled={disabled||templates.length>=6||!schema.fields.some(printableField)} onClick={add}>新建打印方案</Button></div>
    <p className="text-caption leading-5 text-muted-foreground">为不同用途保存字段和纸张布局。记录使用其表单版本中的方案，临时切换或调整不改变已保存配置。</p>
    {templates.length>0&&<><div className="grid gap-4 md:grid-cols-2"><FieldSelect label="编辑打印方案" value={active?.id??""} options={templates.map(template=>({value:template.id,label:template.name||"未命名方案"}))} onChange={setSelected}/><FieldSelect label="默认打印方案" value={schema.defaultPrintTemplateId??""} options={[{value:"",label:"使用原默认配置"},...templates.map(template=>({value:template.id,label:template.name||"未命名方案"}))]} onChange={id=>onChange({...schema,defaultPrintTemplateId:id||undefined})}/></div>
    {active&&<div className="space-y-4 rounded-card border border-border p-4"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Input label="打印方案名称" value={active.name} maxLength={40} onChange={name=>update({name})}/></div><Button size="sm" variant="ghost" onClick={()=>{const remaining=templates.filter(template=>template.id!==active.id);onChange({...schema,printTemplates:remaining,defaultPrintTemplateId:schema.defaultPrintTemplateId===active.id?undefined:schema.defaultPrintTemplateId});setSelected(remaining[0]?.id??"");}}>删除此打印方案</Button></div>
      <div className="grid gap-4 md:grid-cols-2"><FieldSelect label="方案打印列数" value={String(active.config.columns)} options={[{value:"1",label:"单列"},{value:"2",label:"双列"}]} onChange={value=>config({columns:Number(value) as 1|2})}/><FieldSelect label="方案纸张方向" value={active.config.orientation} options={[{value:"portrait",label:"A4 纵向"},{value:"landscape",label:"A4 横向"}]} onChange={value=>config({orientation:value as "portrait"|"landscape"})}/></div>
      <Checkbox label="方案包含创建信息" checked={active.config.showMetadata} onCheckedChange={showMetadata=>config({showMetadata})}/>
      <div className="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">{schema.fields.filter(printableField).map(field=><Checkbox key={field.id} label={`方案字段：${field.label}`} checked={active.config.fieldIds.includes(field.id)} onCheckedChange={checked=>config({fieldIds:checked?[...active.config.fieldIds,field.id]:active.config.fieldIds.filter(id=>id!==field.id)})}/>)}</div>
      {!active.config.fieldIds.length&&<p role="alert" className="text-caption text-destructive">至少选择一个打印字段。</p>}
    </div>}</>}
  </fieldset>;
}
