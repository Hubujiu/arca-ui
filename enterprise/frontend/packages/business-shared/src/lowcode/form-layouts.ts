import type { TableSchema } from "./field-model";
export type FormLayout = { id:string; name:string; columns:1|2|3|4; fieldOrder:string[]; widths?:Record<string,number> };
type SchemaWithLayouts = TableSchema & { layouts?:FormLayout[]; defaultLayoutId?:string };
export function validateFormLayouts(schema:SchemaWithLayouts,child=false):string|undefined {
  if(schema.layouts===undefined && schema.defaultLayoutId===undefined)return;
  if(child)return "多布局仅支持根表单";
  if(!Array.isArray(schema.layouts)||!schema.layouts.length||schema.layouts.length>6)return "自定义布局需要一至六个";
  const ids=new Set<string>(),names=new Set<string>(),fields=new Set(schema.fields.map(field=>field.id));
  for(const layout of schema.layouts) {
    if(!layout||Object.keys(layout).some(key=>!["id","name","columns","fieldOrder","widths"].includes(key))||!/^[a-z][a-zA-Z0-9]{0,63}$/.test(layout.id)||["constructor","prototype","__proto__"].includes(layout.id)||ids.has(layout.id))return "布局标识无效或重复";
    ids.add(layout.id);
    if(typeof layout.name!=="string"||!layout.name.trim()||[...layout.name].length>40||names.has(layout.name.trim()))return "布局名称无效或重复";
    names.add(layout.name.trim());
    if(![1,2,3,4].includes(layout.columns))return "布局支持一至四列";
    if(!Array.isArray(layout.fieldOrder)||layout.fieldOrder.length>100||new Set(layout.fieldOrder).size!==layout.fieldOrder.length||layout.fieldOrder.some(id=>!fields.has(id)))return "布局顺序包含不存在或重复的字段";
    if(layout.widths!==undefined && (!layout.widths||typeof layout.widths!=="object"||Array.isArray(layout.widths)||Object.entries(layout.widths).some(([id,n])=>!fields.has(id)||!Number.isInteger(n)||n<1||n>12)))return "布局字段宽度无效";
  }
  if(schema.defaultLayoutId!==undefined&&!ids.has(schema.defaultLayoutId))return "默认布局不存在";
}
export function applyFormLayout(schema:SchemaWithLayouts,id?:string):TableSchema {
  const layout=schema.layouts?.find(layout=>layout.id===id);if(!layout)return schema;
  const byId=new Map(schema.fields.map(field=>[field.id,field]));
  const order=[...new Set([...layout.fieldOrder,...schema.fields.map(field=>field.id)])];
  const decorations=new Set(["heading","divider","remark","displayImage","tabs","collapse","queryTable"]);
  return {...schema,appearance:{accent:"slate",cover:"none",density:"comfortable",submitLabel:"提交",...schema.appearance,columns:layout.columns},fields:order.flatMap(id=>{
    const field=byId.get(id);if(!field)return[];const next={...field,width:layout.widths?.[id]??(decorations.has(field.type)?12:12/layout.columns)};delete next.column;return[next];
  })};
}
