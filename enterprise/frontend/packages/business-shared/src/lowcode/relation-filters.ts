import type { LowcodeField } from "./field-model";
import type { RuleOperator } from "./rules";
export type RelationFilter = { operator: "AND" | "OR"; conditions: RelationFilter[] } | {fieldId:string;operator:RuleOperator;value?:string|number|boolean;sourceFieldId?:string};
export const filterGroup = (filter:RelationFilter):filter is Extract<RelationFilter,{conditions:RelationFilter[]}> => filter.operator==="AND"||filter.operator==="OR";
export function filterSources(filter?:RelationFilter):string[] {
  if(!filter)return[];return filterGroup(filter)?[...new Set(filter.conditions.flatMap(filterSources))]:filter.sourceFieldId?[filter.sourceFieldId]:[];
}
export function filterSourceValues(filter:RelationFilter|undefined,values:Record<string,unknown>) {return Object.fromEntries(filterSources(filter).filter(id=>values[id]!==undefined).map(id=>[id,values[id]]));}
const identifier=(value:unknown)=>typeof value==="string"&&/^[a-z][a-zA-Z0-9]{0,63}$/.test(value)&&!["constructor","prototype","__proto__"].includes(value);
export function validateRelationFilter(raw:unknown,fields?:LowcodeField[]):string[] {
  const errors:string[]=[];let count=0;
  function visit(raw:unknown,depth:number) {
    if(depth>4||++count>32){errors.push("关联筛选最多四层、三十二个节点");return;}
    if(!raw||typeof raw!=="object"||Array.isArray(raw)){errors.push("筛选需要对象");return;}
    const value=raw as Record<string,unknown>;
    if(value.operator==="AND"||value.operator==="OR") {if(Object.keys(value).some(key=>!["operator","conditions"].includes(key))||!Array.isArray(value.conditions)||!value.conditions.length||value.conditions.length>8){errors.push("筛选组需要一至八项");return;}value.conditions.forEach(child=>visit(child,depth+1));return;}
    if(Object.keys(value).some(key=>!["fieldId","operator","value","sourceFieldId"].includes(key))||!identifier(value.fieldId)||!["EQ","NE","GT","GTE","LT","LTE","CONTAINS","EMPTY","NOT_EMPTY"].includes(String(value.operator))){errors.push("筛选包含无效字段或运算符");return;}
    const hasValue=Object.hasOwn(value,"value"),hasSource=Object.hasOwn(value,"sourceFieldId"),empty=["EMPTY","NOT_EMPTY"].includes(String(value.operator));
    if(empty?hasValue||hasSource:hasValue===hasSource)errors.push("比较需要一个固定值或来源字段");
    if(hasValue&&!['string','number','boolean'].includes(typeof value.value))errors.push("筛选比较值格式无效");
    if(hasSource&&(!identifier(value.sourceFieldId)||value.operator==="CONTAINS"||fields&&!fields.some(field=>field.id===value.sourceFieldId&&!['heading','divider','remark','displayImage','tabs','collapse','queryTable','relation','subtable','signature','image','attachment','location'].includes(field.type))))errors.push("动态筛选需要同层可比较字段");
  }
  visit(raw,1);return errors;
}
