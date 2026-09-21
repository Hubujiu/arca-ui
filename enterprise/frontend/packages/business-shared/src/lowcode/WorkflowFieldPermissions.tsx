import { SelectEntry } from "@/components/controls";
import { useId } from "react";
import { Button } from "@/shared/ui";
import { Switch } from "@/components/motion/switch";
import { Checkbox } from "@/components/motion/checkbox";
import { cn } from "@/lib/utils";
import { fieldTypes, type TableSchema } from "./field-model";
import type { WorkflowNode } from "./workflow-model";
import { canEditWorkflowField, setWorkflowFieldAccess, workflowFieldAccessLabels, type WorkflowFieldAccess, type WorkflowFieldPermissions as Permissions } from "./workflow-field-permissions";

export function WorkflowFieldPermissions({ node, schema, disabled, onChange }: {
  node: WorkflowNode;
  schema: TableSchema;
  disabled: boolean;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const id = useId();
  const permissions = node.fieldPermissions;
  const enabled = permissions != null;
  const canEdit = node.type !== "CC";
  const unknownIds = Object.keys(permissions ?? {}).filter((fieldId) => !schema.fields.some((field) => field.id === fieldId));
  function update(fieldPermissions: Permissions | undefined) {
    if (!disabled) onChange({ fieldPermissions });
  }
  function bulk(access: "HIDDEN" | "READ") {
    update(Object.fromEntries(schema.fields.map((field) => [field.id, { access }])));
  }
  return <section aria-label="节点字段权限" className="space-y-3 border-t border-border pt-4">
    <div className="flex items-center justify-between gap-3">
      <h5 className="text-caption font-medium">字段权限</h5>
      <Switch checked={enabled} disabled={disabled} ariaLabel="启用节点字段权限" onCheckedChange={(active) => update(active ? {} : undefined)} />
    </div>
    <p className="text-caption leading-5 text-muted-foreground">{enabled
      ? canEdit ? "设置本节点处理人可查看和修改的字段。未单独设置的字段默认为只读。" : "设置抄送快照中可查看的字段。抄送人仅可查看，不能修改。"
      : "未启用时沿用当前表单展示规则，处理人只读查看。"}</p>
    {enabled && <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" disabled={disabled || !schema.fields.length} onClick={() => bulk("READ")}>全部只读</Button>
        <Button size="sm" variant="ghost" disabled={disabled || !schema.fields.length} onClick={() => bulk("HIDDEN")}>全部隐藏</Button>
      </div>
      <div className="space-y-2" role="group" aria-label="字段访问设置">
        {schema.fields.map((field) => {
          const permission = permissions?.[field.id];
          const access = permission?.access ?? "READ";
          const editable = canEdit && canEditWorkflowField(field);
          return <div key={field.id} className="space-y-2 rounded-card border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <label htmlFor={`${id}-${field.id}`} className="min-w-0 text-caption font-medium leading-5">
                <span className="block break-words">{field.label}</span>
                <span className="text-caption font-normal text-muted-foreground">{fieldTypes.find((entry) => entry.type === field.type)?.label ?? field.type}</span>
              </label>
              <SelectEntry id={`${id}-${field.id}`} aria-label={`${field.label}的字段权限`} value={access} disabled={disabled} className={cn("", "!w-24 shrink-0")} onChange={(event) => update(setWorkflowFieldAccess(permissions, field.id, event.target.value as WorkflowFieldAccess))}>
                {Object.entries(workflowFieldAccessLabels).map(([value, label]) => <option key={value} value={value} disabled={value === "EDIT" && !editable}>{label}</option>)}
              </SelectEntry>
            </div>
            {access === "EDIT" && editable && <Checkbox checked={field.required === true || permission?.required === true} label="本节点必填" disabled={disabled || field.required === true} onCheckedChange={(required) => update({ ...permissions, [field.id]: { access: "EDIT", required } })} />}
            {access === "EDIT" && editable && field.required && <p className="text-caption leading-4 text-muted-foreground">表单已设为必填，本节点继续保留此要求。</p>}
            {!editable && canEdit && <p className="text-caption leading-4 text-muted-foreground">表单只读、编号、计算及展示字段不可编辑。</p>}
            {field.type === "subtable" && <p className="text-caption leading-4 text-muted-foreground">权限作用于整张子表，子字段仍遵守各自的表单设置。</p>}
          </div>;
        })}
        {!schema.fields.length && <p className="rounded-card bg-muted/50 p-3 text-caption text-muted-foreground">表单还没有字段，请先添加字段。</p>}
      </div>
      {!!unknownIds.length && <div className="space-y-2 rounded-card border border-destructive/30 p-3 text-caption text-destructive">
        <p>有 {unknownIds.length} 项权限对应的字段已移除，请清理后发布。</p>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => update(Object.fromEntries(Object.entries(permissions ?? {}).filter(([fieldId]) => !unknownIds.includes(fieldId))))}>清理失效字段</Button>
      </div>}
      <p className="text-caption leading-5 text-muted-foreground">{canEdit ? "修改随同意审批或完成办理保存到当前流程，整个流程通过后回填记录；冲突字段保留记录现值。拒绝或退回不保存本次编辑。" : "隐藏字段不包含在抄送快照中。"}{disabled ? " 当前版本为只读预览。" : ""}</p>
    </>}
  </section>;
}
