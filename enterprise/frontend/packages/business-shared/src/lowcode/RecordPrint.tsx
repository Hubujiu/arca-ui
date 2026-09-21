import type { DataStyle } from "@/lib/data-style";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {AppModal,Button,FieldSelect} from "@/shared/ui";
import {Checkbox} from "@/components/motion/checkbox";
import type {Directory} from "../organization/model";
import {FieldRenderer} from "./FieldRenderer";
import {defaultAppearance,type LowcodeField,type TableSchema} from "./field-model";
import {dateLabel,type Row} from "./model";
import {printFields,printableField,recordTitle,type PrintTemplate} from "./record-presentation";
import type {FileContext} from "./FileField";

function PrintSnapshot({schema,data,directory,context,columns,contextFields}:{schema:TableSchema;contextFields:LowcodeField[];data:Record<string,unknown>;directory:Directory;context:FileContext;columns:1|2}) {
  return <div className="dw-data-record-print-1 grid gap-5" style={({"--dw-data-record-print-1-grid-template-columns": `repeat(${columns},minmax(0,1fr))`}) as DataStyle}>{schema.fields.map(field=><div className="dw-data-record-print-2 min-w-0 break-inside-avoid" key={field.id} style={({"--dw-data-record-print-2-grid-column": field.type==="subtable"?"1 / -1":undefined}) as DataStyle}>
    {field.type==="subtable"&&field.subtableConfig?<section className="space-y-4"><h3 className="font-medium">{field.label}</h3>{(Array.isArray(data[field.id])?data[field.id] as {id:string;values:Record<string,unknown>}[]:[]).map((row,index)=><section key={row.id} className="rounded-control border border-border p-3"><h4 className="mb-3 text-caption text-muted-foreground">第 {index+1} 行</h4><PrintSnapshot contextFields={field.subtableConfig!.fields} schema={{name:"",description:"",fields:printFields({name:"",description:"",fields:field.subtableConfig!.fields},row.values)}} data={row.values} directory={directory} context={context} columns={columns}/></section>)}</section>:<FieldRenderer contextFields={contextFields} contextValues={data} schema={{name:"",description:"",fields:[{...field,width:12}],appearance:{...defaultAppearance,cover:"none",columns:1}}} value={data} onChange={()=>{}} directory={directory} readOnly mode="edit" fileContext={context}/>}</div>)}</div>;
}
export function RecordPrint({row,schema,directory,onClose}:{row:Row;schema:TableSchema;directory:Directory;onClose:()=>void}) {
  const templates:PrintTemplate[]=schema.printTemplates??[],initialTemplate=templates.find(template=>template.id===schema.defaultPrintTemplateId);
  const [templateId,setTemplateId]=useState(initialTemplate?.id??"");
  const config=initialTemplate?.config??schema.printConfig,[selected,setSelected]=useState(config?.fieldIds??schema.fields.filter(printableField).map(field=>field.id)),[columns,setColumns]=useState<1|2>(config?.columns??1),[orientation,setOrientation]=useState(config?.orientation??"portrait"),[metadata,setMetadata]=useState(config?.showMetadata??true);
  const [portal]=useState(()=>{const element=document.createElement("div");element.dataset.recordPrintRoot="";element.setAttribute("aria-hidden","true");return element;});
  useEffect(()=>{document.body.append(portal);return()=>portal.remove();},[portal]);
  useEffect(()=>{portal.dataset.orientation=orientation;},[portal,orientation]);
  const fields=printFields(schema,row.data,selected),title=recordTitle(schema,row.data,row.title),context={tableId:row.tableId,recordId:row.id};
  const content=<article className="bg-card p-6 text-foreground"><h1 className="mb-3 break-words text-heading font-semibold">{title}</h1>{metadata&&<p className="mb-6 whitespace-pre-wrap text-caption text-muted-foreground">创建人：{row.creatorName||"—"}　创建时间：{dateLabel(row.createdAt)}　记录版本：V{row.revision}</p>}<PrintSnapshot contextFields={schema.fields} schema={{...schema,fields}} data={row.data} directory={directory} context={context} columns={columns}/></article>;
  function selectTemplate(id:string) {
    const config=templates.find(template=>template.id===id)?.config??schema.printConfig;
    setTemplateId(id);setSelected(config?.fieldIds??schema.fields.filter(printableField).map(field=>field.id));setColumns(config?.columns??1);setOrientation(config?.orientation??"portrait");setMetadata(config?.showMetadata??true);
  }
  async function print() {
    await document.fonts.ready;
    await Promise.all(Array.from(portal.querySelectorAll("img")).map(img=>img.decode().catch(()=>{})));
    window.print();
  }
  return <>{createPortal(content,portal)}
    <AppModal open onOpenChange={open=>{if(!open)onClose();}} title="打印当前记录" className="max-w-6xl" footer={<Button disabled={!fields.length} onClick={()=>void print()}>打开浏览器打印</Button>}><div className="grid gap-5 lg:grid-cols-relation-settings"><aside className="space-y-3">{templates.length>0&&<FieldSelect label="打印模板" value={templateId} options={[{value:"",label:"默认方案"},...templates.map(template=>({value:template.id,label:template.name}))]} onChange={selectTemplate}/>}<FieldSelect label="打印列数" value={String(columns)} options={[{value:"1",label:"单列"},{value:"2",label:"双列"}]} onChange={value=>setColumns(Number(value) as 1|2)}/><FieldSelect label="打印方向" value={orientation} options={[{value:"portrait",label:"A4 纵向"},{value:"landscape",label:"A4 横向"}]} onChange={value=>setOrientation(value as "portrait"|"landscape")}/><Checkbox label="显示创建信息" checked={metadata} onCheckedChange={setMetadata}/><div className="max-h-72 space-y-2 overflow-auto">{schema.fields.filter(printableField).map(field=><Checkbox key={field.id} className="w-full" label={field.label} checked={selected.includes(field.id)} onCheckedChange={checked=>setSelected(checked?[...selected,field.id]:selected.filter(id=>id!==field.id))}/>)}</div><p className="text-caption leading-5 text-muted-foreground">打印已保存的当前记录。按条件隐藏的字段不会打印；实时查询表不属于记录快照。</p></aside><div className="min-w-0 overflow-auto rounded-card border border-border" data-testid="record-print-preview">{content}</div></div></AppModal>
  </>;
}
