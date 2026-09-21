import {isDecoration,type LowcodeField} from "./field-model";
import type {Change,Row} from "./model";
export function relationEditValues(fields:LowcodeField[],values:Record<string,unknown>):Record<string,unknown> {
  return Object.fromEntries(fields.filter(field=>!isDecoration(field)&&values[field.id]!==undefined).map(field=>{
    const value=values[field.id];if(field.type!=="subtable"||!field.subtableConfig||!Array.isArray(value))return[field.id,value];
    return[field.id,value.map((row:{id:string;values:Record<string,unknown>})=>({id:row.id,values:relationEditValues(field.subtableConfig!.fields,row.values)}))];
  }));
}
export function relationEditResult(change:Pick<Change,"status"|"recordId"|"persistedRevision">,record:Pick<Row,"id"|"revision">,originalRevision:number):"pending"|"ready"|"closed" {
  if(change.status!=="DRAFT"&&Number.isInteger(change.persistedRevision)&&change.persistedRevision!>0)return change.recordId?.toLowerCase()===record.id.toLowerCase()&&record.revision>=change.persistedRevision!&&change.persistedRevision!>originalRevision?"ready":"pending";
  if(["DRAFT","PENDING","RETURNED"].includes(change.status))return "pending";
  if(change.status!=="APPROVED")return "closed";
  return change.recordId?.toLowerCase()===record.id.toLowerCase()&&record.revision>originalRevision?"ready":"pending";
}
