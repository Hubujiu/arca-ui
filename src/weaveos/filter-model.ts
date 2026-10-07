export type FilterOperator='eq'|'neq'|'gt'|'gte'|'lt'|'lte'
export interface FilterField{id:string;label:string;type:'text'|'number'|'time'}
export interface FilterCondition{fieldId:string;operator:FilterOperator;value:string}
export interface FilterGroup{operator:'and'|'or';children:(FilterCondition|FilterGroup)[]}
export interface FilterPreset{id:string;name:string;filter:FilterGroup}
/** Bounded validation only; no client-side filtering or coercion of precise decimals. */
export function validateFilter(filter:unknown,fields:readonly FilterField[]):string|null {
 const known=new Map(fields.map(field=>[field.id,field])),seen=new Set<object>()
 let leaves=0
 function visit(value:unknown,depth:number):string|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return '筛选条件无效'
  if(seen.has(value))return '筛选结构不能循环引用'
  seen.add(value)
  const item=value as Record<string,unknown>
  if('children' in item){
   if(depth>3)return '最多支持三层条件组'
   if(item.operator!=='and'&&item.operator!=='or')return '请选择且或或条件'
   if(Object.keys(item).some(k=>k!=='operator'&&k!=='children')||!Array.isArray(item.children)||!item.children.length||item.children.length>20)return '每个条件组需有 1–20 个条件'
   for(const child of item.children){const error=visit(child,depth+1);if(error)return error}
   return null
  }
  if(++leaves>20)return '最多支持二十个条件'
  if(Object.keys(item).some(k=>!['fieldId','operator','value'].includes(k))||typeof item.fieldId!=='string'||typeof item.value!=='string')return '请填写完整条件'
  const field=known.get(item.fieldId)
  if(!field)return '字段不存在或不可用'
  const ops=field.type==='text'?['eq','neq']:['eq','neq','gt','gte','lt','lte']
  if(typeof item.operator!=='string'||!ops.includes(item.operator))return '该字段不支持此条件'
  if(field.type==='number'&&!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(item.value))return '请输入有效数字'
  if(field.type==='time'&&!item.value.trim())return '请选择日期或时间'
  return null
 }
 if(!filter||typeof filter!=='object'||!('children' in filter))return '筛选必须是条件组'
 const error=visit(filter,1);if(error)return error
 try{if(new TextEncoder().encode(JSON.stringify(filter)).length>16*1024)return '筛选条件超过大小限制'}catch{return '筛选条件无法保存'}
 return null
}
