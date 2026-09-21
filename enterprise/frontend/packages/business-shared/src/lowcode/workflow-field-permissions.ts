import { computedField } from "./calculations";
import { isDecoration, type LowcodeField, type TableSchema } from "./field-model";
import type { WorkflowNode } from "./workflow-model";

export type WorkflowFieldAccess = "HIDDEN" | "READ" | "EDIT";
export type WorkflowFieldPermission = { access: WorkflowFieldAccess; required?: boolean };
export type WorkflowFieldPermissions = Record<string, WorkflowFieldPermission>;
export const workflowFieldAccessLabels: Record<WorkflowFieldAccess, string> = {
  HIDDEN: "隐藏", READ: "只读", EDIT: "可编辑",
};

export function canEditWorkflowField(field: LowcodeField): boolean {
  return !isDecoration(field) && !computedField(field) && field.type !== "serial" && !field.readOnly && !field.hidden && field.visibility !== "alwaysHidden";
}

export function workflowFieldPermissionIssues(node: WorkflowNode, schema?: TableSchema): string[] {
  if (node.fieldPermissions == null) return [];
  if (!["APPROVAL", "HANDLING", "CC"].includes(node.type)) return ["只有审批、办理和抄送节点可以设置字段权限"];
  const permissions: unknown = node.fieldPermissions;
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) return ["字段权限必须为字段标识对应的配置对象"];
  const messages: string[] = [];
  for (const [fieldId, value] of Object.entries(permissions)) {
    const field = schema?.fields.find((entry) => entry.id === fieldId);
    const label = field?.label ?? fieldId;
    if (!fieldId || schema && !field) messages.push(`字段权限「${label}」必须对应当前表单中的根级字段`);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      messages.push(`字段「${label}」的权限配置格式无效`);
      continue;
    }
    const config = value as Record<string, unknown>;
    if (Object.keys(config).some((key) => key !== "access" && key !== "required")) messages.push(`字段「${label}」的权限包含未知设置`);
    if (typeof config.access !== "string" || !Object.hasOwn(workflowFieldAccessLabels, config.access)) messages.push(`字段「${label}」请选择隐藏、只读或可编辑`);
    if (Object.hasOwn(config, "required") && typeof config.required !== "boolean") messages.push(`字段「${label}」的必填设置必须为开关值`);
    if (config.required === true && config.access !== "EDIT") messages.push(`字段「${label}」只有可编辑时才能设为必填`);
    if (config.access === "EDIT" && node.type === "CC") messages.push(`抄送节点的字段「${label}」只能隐藏或只读`);
    if (config.access === "EDIT" && field && !canEditWorkflowField(field)) messages.push(`字段「${label}」是只读、编号、计算或展示字段，不能设为可编辑`);
  }
  return messages;
}

/** Changing away from EDIT always clears the node's required flag. */
export function setWorkflowFieldAccess(permissions: WorkflowFieldPermissions | null | undefined, fieldId: string, access: WorkflowFieldAccess): WorkflowFieldPermissions {
  return { ...permissions, [fieldId]: { access, ...(access === "EDIT" && permissions?.[fieldId]?.required === true ? { required: true } : {}) } };
}

/** The server already projects hidden fields; also fail closed for explicit hidden entries. */
export function workflowTaskSchemas(schema: TableSchema, permissions: WorkflowFieldPermissions) {
  const editableIds = new Set(schema.fields.filter((field) => permissions[field.id]?.access === "EDIT" && canEditWorkflowField(field)).map((field) => field.id));
  const readFields = schema.fields.filter((field) => permissions[field.id]?.access !== "HIDDEN" && !editableIds.has(field.id));
  const editFields = schema.fields.filter((field) => editableIds.has(field.id)).map((field) => ({
    ...field, readOnly: false, required: !!field.required || permissions[field.id]?.required === true,
  }));
  const readSchema: TableSchema = { ...schema, fields: readFields };
  const editSchema: TableSchema = {
    ...schema,
    name: readFields.length ? "" : schema.name,
    description: readFields.length ? "" : schema.description,
    ...(readFields.length && schema.appearance ? { appearance: { ...schema.appearance, cover: "none" } } : {}),
    fields: editFields,
  };
  // These root settings describe the complete record; a task editor is only an authorized field fragment.
  for (const key of ["titleFieldId","detailConfig","printConfig","printTemplates","defaultPrintTemplateId","layouts","defaultLayoutId","fieldEvents","validationRules"] as const) delete editSchema[key];
  const contextFields=schema.fields.filter(field=>permissions[field.id]?.access!=="HIDDEN");
  return { readSchema, editSchema, contextFields };
}

export function workflowFieldValues(schema: TableSchema, data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(schema.fields.filter((field) => Object.hasOwn(data, field.id)).map((field) => [field.id, data[field.id]]));
}

/** Replacing the editable subset must preserve cleared keys and ignore unexpected renderer output. */
export function mergeWorkflowFieldValues(schema: TableSchema, original: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return { ...original, ...Object.fromEntries(schema.fields.map((field) => [field.id, next[field.id]])) };
}

/** Include null for a cleared editor value; omitted policy keys must never grant write access. */
export function workflowDecisionData(schema: TableSchema, permissions: WorkflowFieldPermissions, data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(schema.fields.filter((field) => permissions[field.id]?.access === "EDIT" && canEditWorkflowField(field))
    .map((field) => [field.id, data[field.id] ?? null]));
}

/** Only fields present in the authorized response and not explicitly hidden supply read context. */
export function workflowReferenceValues(fields:LowcodeField[],data:Record<string,unknown>):Record<string,unknown> {
  return Object.fromEntries(fields.filter(field=>Object.hasOwn(data,field.id)).map(field=>[field.id,data[field.id]]));
}
