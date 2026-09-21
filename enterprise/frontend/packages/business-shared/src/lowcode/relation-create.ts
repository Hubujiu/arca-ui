import type { RelationConfig } from "./relations";
import type { Change } from "./model";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createdRelation(change:Pick<Change,"id"|"recordId"|"status"|"persistedRevision">):{kind:"ready";recordId:string}|{kind:"pending";changeId:string}|{kind:"unavailable"} {
  if(change.status!=="DRAFT"&&Number.isInteger(change.persistedRevision)&&change.persistedRevision!>0&&change.recordId&&uuid.test(change.recordId))return {kind:"ready",recordId:change.recordId};
  if(change.status==="APPROVED")return change.recordId&&uuid.test(change.recordId)?{kind:"ready",recordId:change.recordId}:{kind:"unavailable"};
  if(["PENDING","RETURNED","DRAFT"].includes(change.status)&&uuid.test(change.id))return {kind:"pending",changeId:change.id};
  return {kind:"unavailable"};
}
export function appendCreatedRelation(config:RelationConfig,selected:string[],recordId:string,parentPath:string[]=[]):string[] {
  if(!uuid.test(recordId))throw new Error("新建结果没有可关联的记录标识");
  if(config.cascade){if(parentPath.length>=(config.cascade.maxDepth??10)||parentPath.some(id=>id.toLowerCase()===recordId.toLowerCase()))throw new Error("新记录超出级联路径范围");return [...parentPath,recordId];}
  if(!config.multiple)return [recordId];
  if(selected.some(id=>id.toLowerCase()===recordId.toLowerCase()))return selected;
  if(selected.length>=(config.maxRecords??20))throw new Error("已达到关联记录数量上限，请先移除一条记录");
  return [...selected,recordId];
}
