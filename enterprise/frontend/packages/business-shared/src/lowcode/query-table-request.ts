import type { QueryConfig } from "./relations";
import { filterSourceValues } from "./relation-filters";
export function queryTableRequest(config:QueryConfig|undefined,values:Record<string,unknown>,recordId?:string):Record<string,unknown>|undefined {
  if(!config||config.backReferenceFieldId&&!recordId)return undefined;
  const selected=config.relationFieldId?values[config.relationFieldId]:undefined;
  return {tableId:config.tableId,titleFieldId:config.columnIds[0],columns:config.columnIds,pageSize:config.pageSize??10,...(config.filter?{filter:config.filter,sourceValues:filterSourceValues(config.filter,values)}:{}),...(config.relationFieldId?{ids:Array.isArray(selected)?selected:[]} :{}),...(config.backReferenceFieldId?{backReferenceFieldId:config.backReferenceFieldId,sourceRecordId:recordId}:{})};
}
