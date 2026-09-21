import type { LowcodeField, TableSchema, ValueContext } from "./field-model";
import { collectLookupQueries, lookupKey, lookupQuery, validateLookup, validateQuery, validateRelation } from "./relations";
import { validateRelationFilter } from "./relation-filters";

/** Context is already authorized by the caller; editable definitions win by stable ID. */
export function mergeReferenceFields(fields:LowcodeField[],contextFields:LowcodeField[]=[]):LowcodeField[] {
  return [...new Map([...contextFields,...fields].map(field=>[field.id,field])).values()];
}
/** A cleared editable key remains absent, and unlisted context values never enter queries. */
export function mergeReferenceValues(fields:LowcodeField[],values:Record<string,unknown>,contextFields:LowcodeField[]=[],contextValues:Record<string,unknown>={}):Record<string,unknown> {
  const editable=new Set(fields.map(field=>field.id));
  return Object.fromEntries([
    ...contextFields.filter(field=>!editable.has(field.id)&&Object.hasOwn(contextValues,field.id)).map(field=>[field.id,contextValues[field.id]]),
    ...fields.filter(field=>Object.hasOwn(values,field.id)).map(field=>[field.id,values[field.id]]),
  ]);
}
export function fieldReferenceIssues(field:LowcodeField,fields:LowcodeField[]):string[] {
  if(field.type==="relation")return [...validateRelation(field.relationConfig,fields),...(field.relationConfig?.filter?validateRelationFilter(field.relationConfig.filter,fields):[])];
  if(field.type==="queryTable")return validateQuery(field.queryConfig,fields);
  if(field.type==="lookup"){
    const issues=validateLookup(field.lookupConfig,fields),relation=fields.find(entry=>entry.id===field.lookupConfig?.relationFieldId&&entry.type==="relation");
    return [...issues,...(relation?fieldReferenceIssues(relation,fields):[])];
  }
  return [];
}
export function referenceLookupQuery(field:LowcodeField,values:Record<string,unknown>,fields:LowcodeField[]) {
  return fieldReferenceIssues(field,fields).length?undefined:lookupQuery(field,values,fields);
}
export function collectReferenceLookupQueries(schema:TableSchema,values:Record<string,unknown>,context:ValueContext={}) {
  // Child rows retain their own scope. READ context fields are definitions, never extra queried fields.
  const queries=collectLookupQueries({...schema,fields:schema.fields.filter(field=>field.type==="subtable")},values);
  const fields=mergeReferenceFields(schema.fields,context.referenceFields),data=mergeReferenceValues(schema.fields,values,context.referenceFields,context.referenceValues);
  for(const field of schema.fields)if(field.type==="lookup"){const query=referenceLookupQuery(field,data,fields);if(query)queries.set(lookupKey(query),query);}
  return queries;
}
