import {Button,FieldSelect} from "@/shared/ui";
import {base,useLoad} from "./model";
export type AutomationPrintTemplates={tableVersionId?:string;templates:{id:string;name:string;supported:boolean;error?:string}[]};
export function AutomationPrintSettings({tableId,templateId,onChange,disabled}:{tableId?:string;templateId?:string;onChange:(id:string)=>void;disabled?:boolean}){
  const templates=useLoad<AutomationPrintTemplates>(tableId?`${base}/tables/${tableId}/automation-print-templates`:undefined);
  return <div className="min-w-0 space-y-3">{tableId&&<FieldSelect label="已发布打印模板" value={templateId??""} options={(templates.data?.templates??[]).filter(template=>template.supported).map(template=>({value:template.id,label:template.name}))} disabled={disabled||templates.loading} onChange={onChange}/>}
    {templates.error&&<p role="alert" className="text-caption text-destructive">{templates.error}</p>}{tableId&&<Button size="sm" variant="ghost" onClick={templates.refresh}>刷新已发布模板</Button>}
    {tableId&&!templates.loading&&!templates.error&&!templates.data?.templates.some(template=>template.supported)&&<p className="text-caption text-muted-foreground">目标表尚无可用于 DOCX 的已发布模板。请在表单打印设置中配置并发布。</p>}
    {(templates.data?.templates??[]).filter(template=>!template.supported).map(template=><p key={template.id} className="text-caption text-muted-foreground">{template.name}：{template.error??"此模板包含不支持的字段"}</p>)}
    <p className="text-caption leading-5 text-muted-foreground">发布自动化时固定所选模板版本。记录需属于相同表单版本且修订一致；表单版本变化后请重新发布自动化。生成内容为文本、数字、日期、选择及计算快照，图片、附件、签名、富文本、子表和关联对象需要使用其他模板。每次最多 20 份文档。</p>
  </div>;
}
