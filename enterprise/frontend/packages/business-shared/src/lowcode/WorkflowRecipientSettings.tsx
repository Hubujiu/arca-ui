import { ActionSurface, SelectEntry } from "@/components/controls";
import { useId, useState } from "react";
import * as Popover from "@/components/overlays/popover";
import { Check, ChevronDown } from "@/shared/icons/catalog";
import { Button, Input } from "@/shared/ui";
import { Checkbox } from "@/components/motion/checkbox";
import { cn } from "@/lib/utils";
import { unitPath, type Directory } from "../organization/model";
import { PeoplePickerField } from "../organization/PeoplePicker";
import { type TableSchema } from "./field-model";
import {
  changeWorkflowRecipientSource,
  recipientFields,
  recipientSourceLabels,
  workflowRecipientPolicyIssues,
  type WorkflowNode,
  type WorkflowRecipientConfig,
  type WorkflowRecipientSource,
  type WorkflowRecipientPolicy,
} from "./workflow-model";

function SourceDirectoryPicker({ label, value, choices, onChange, disabled }: {
  label: string;
  value: string[];
  choices: { id: string; name: string; detail?: string }[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const includes = (selected: string) => value.some((id) => id.toLowerCase() === selected.toLowerCase());
  const available = [...choices, ...value.filter((id) => !choices.some((choice) => choice.id.toLowerCase() === id.toLowerCase()))
    .map((id) => ({ id, name: `已移除${label}（${id.slice(0, 8)}）`, detail: "请取消此项并重新选择" }))];
  const filtered = available.filter((choice) => `${choice.name} ${choice.detail ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-caption font-medium">选择{label}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <ActionSurface id={id} type="button" disabled={disabled} className={cn("", "flex min-h-11 items-center justify-between gap-2 text-left")}>
            <span className={cn("flex min-w-0 flex-wrap gap-1", !value.length && "text-muted-foreground")}>
              {value.length ? value.map((selected) => <span key={selected} className="max-w-full truncate rounded-control bg-muted px-2 py-0.5 text-caption">{available.find((choice) => choice.id.toLowerCase() === selected.toLowerCase())?.name}</span>) : `选择${label}，可多选`}
            </span>
            <span className="inline-flex shrink-0 text-muted-foreground"><ChevronDown size={14}  /></span>
          </ActionSurface>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content data-dw-surface="popover" align="start" sideOffset={6} collisionPadding={12} aria-label={`选择来源${label}`} className="max-w-popover-viewport p-2">
            <Input aria-label={`搜索${label}`} value={query} onChange={setQuery} placeholder={`搜索${label}`} classNames={{ field: "", input: "" }} />
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto overscroll-contain p-1" role="group" aria-label={label}>
              {filtered.map((choice) => <div key={choice.id} className="rounded-control px-2 py-2 hover:bg-muted">
                <Checkbox checked={includes(choice.id)} label={choice.name} className="w-full" disabled={disabled || value.length >= 20 && !includes(choice.id)} onCheckedChange={() => {
                  if (!disabled) onChange(includes(choice.id) ? value.filter((id) => id.toLowerCase() !== choice.id.toLowerCase()) : [...value, choice.id]);
                }} />
                {choice.detail && <p className="ml-8 mt-0.5 break-words text-caption text-muted-foreground">{choice.detail}</p>}
              </div>)}
              {!filtered.length && <p className="px-2 py-5 text-center text-caption text-muted-foreground">没有可选{label}</p>}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <Button variant="ghost" size="sm" disabled={disabled || !value.length} onClick={() => onChange([])}>清空</Button>
              <Popover.Close asChild><Button size="sm"><Check size={13} />完成 · {value.length}/20</Button></Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export function WorkflowRecipientSettings({ node, schema, directory, disabled, onChange }: {
  node: WorkflowNode;
  schema: TableSchema;
  directory: Directory;
  disabled: boolean;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const id = useId();
  const config = node.recipientConfig;
  const source = config?.source ?? "FIXED";
  const fields = recipientFields(schema);
  const label = node.type === "APPROVAL" ? "审批人" : node.type === "HANDLING" ? "办理人" : "抄送人";
  const limit = node.type === "CC" ? 50 : 20;
  const policy=node.recipientPolicy??{};
  const policyIssue=workflowRecipientPolicyIssues(node,directory)[0];
  const patchPolicy=(patch:Partial<WorkflowRecipientPolicy>)=>{if(!disabled)onChange({recipientPolicy:{...policy,...patch}});};
  function patchConfig(recipientConfig: WorkflowRecipientConfig) {
    if (!disabled) onChange({ recipientConfig, approverIds: [], ccIds: [] });
  }
  return (
    <section className="space-y-3" aria-label={`${label}来源设置`}>
      <label htmlFor={`${id}-source`} className="block space-y-2 text-caption">
        <span className="font-medium">{label}来源</span>
        <SelectEntry id={`${id}-source`} value={source} disabled={disabled} className={cn("", "")} onChange={(event) => {
          if (!disabled) onChange(changeWorkflowRecipientSource(event.target.value as WorkflowRecipientSource));
        }}>
          {Object.entries(recipientSourceLabels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          {!Object.hasOwn(recipientSourceLabels, source) && <option value={source}>无效的人员来源</option>}
        </SelectEntry>
      </label>
      {source === "FIXED" && <PeoplePickerField
        directory={directory}
        value={(node.type === "CC" ? node.ccIds : node.approverIds) ?? []}
        onChange={(ids) => { if (!disabled) onChange({ recipientConfig: undefined, approverIds: node.type === "CC" ? [] : ids, ccIds: node.type === "CC" ? ids : [] }); }}
        disabled={disabled}
        limit={limit}
        ordered={node.type === "HANDLING" || node.type === "APPROVAL" && node.approvalMode === "ALL"}
        label={label}
        placeholder={`选择${label}`}
      />}
      {config?.source === "FIELD" && <>
        <label htmlFor={`${id}-field`} className="block space-y-2 text-caption">
          <span className="font-medium">成员字段</span>
          <SelectEntry id={`${id}-field`} value={config.fieldId} disabled={disabled} className={cn("", "")} onChange={(event) => patchConfig({ source: "FIELD", fieldId: event.target.value })}>
            <option value="">请选择成员字段</option>
            {fields.map((field) => <option key={field.id} value={field.id}>{field.label} · {field.type === "member" ? "单成员" : "多成员"}</option>)}
            {config.fieldId && !fields.some((field) => field.id === config.fieldId) && <option value={config.fieldId}>原成员字段已移除或不再兼容</option>}
          </SelectEntry>
        </label>
        <p className="text-caption leading-5 text-muted-foreground">{fields.length ? "读取本次申请固定表单版本中的根级成员字段，按所选审批方式分派待办。" : "请先在表单设计中添加根级的单成员或多成员字段。子表中的成员字段不可选。"}</p>
      </>}
      {config?.source === "DEPARTMENT" && <>
        <SourceDirectoryPicker label="部门" value={Array.isArray(config.departmentIds) ? config.departmentIds : []} choices={directory.units.filter((unit) => unit.kind === "DEPARTMENT").map((unit) => ({ id: unit.id, name: unit.name, detail: unitPath(directory.units, unit.id) }))} disabled={disabled}
          onChange={(departmentIds) => patchConfig({ source: "DEPARTMENT", departmentIds, ...(config.includeDescendants === true ? { includeDescendants: true } : {}) })} />
        <Checkbox label="包含所选部门的下级组织" checked={config.includeDescendants === true} disabled={disabled} onCheckedChange={(includeDescendants) => patchConfig({ source: "DEPARTMENT", departmentIds: config.departmentIds, includeDescendants })} />
      </>}
      {config?.source === "POSITION" && <SourceDirectoryPicker label="岗位" value={Array.isArray(config.positionIds) ? config.positionIds : []} choices={directory.positions} disabled={disabled} onChange={(positionIds) => patchConfig({ source: "POSITION", positionIds })} />}
      {config?.source === "INITIATOR" && <p className="text-caption leading-5 text-muted-foreground">由本次流程的发起人处理。</p>}
      {config?.source === "INITIATOR_MANAGER" && <p className="text-caption leading-5 text-muted-foreground">读取发起人在组织通讯录中配置的直属上级。未配置时按空名单策略处理；上级账号不可用时仍报错。</p>}
      {config?.source === "INITIATOR_DEPARTMENT_LEADER" && <p className="text-caption leading-5 text-muted-foreground">读取发起人所属部门的负责人。进入节点时按组织设置确定名单，并检查负责人的账号是否可用。</p>}
      {(config?.source === "DEPARTMENT" || config?.source === "POSITION") && <p className="text-caption leading-5 text-muted-foreground">只包含已启用且绑定登录账号的成员。多个来源合并去重，按成员标识的固定顺序确定名单。</p>}
      {config?.source === "OWNER" && <p className="text-caption leading-5 text-muted-foreground">从已有记录的负责人设置读取；新增记录使用本次发起人。表单中的成员字段不会改变此来源。</p>}
      {config?.source === "COLLABORATORS" && <p className="text-caption leading-5 text-muted-foreground">从已有记录的协作者设置读取并去重。新增记录尚无协作者，按下方空名单策略处理。</p>}
      <div className="space-y-3 border-t border-border pt-4">
        <label className="block space-y-2 text-caption"><span className="font-medium">发起人同时在名单中</span><SelectEntry className={""} disabled={disabled} value={policy.samePerson??"KEEP"} onChange={event=>patchPolicy({samePerson:event.target.value as WorkflowRecipientPolicy["samePerson"]})}><option value="KEEP">保留，由发起人正常处理</option><option value="REMOVE_INITIATOR">从候选名单排除发起人</option></SelectEntry></label>
        <label className="block space-y-2 text-caption"><span className="font-medium">候选名单为空时</span><SelectEntry className={""} disabled={disabled} value={policy.empty??"ERROR"} onChange={event=>patchPolicy({empty:event.target.value as WorkflowRecipientPolicy["empty"],fallbackIds:event.target.value==="FIXED"?policy.fallbackIds??[]:undefined})}><option value="ERROR">报错，保持当前状态</option><option value="INITIATOR">交给发起人正常处理</option><option value="FIXED">交给指定成员正常处理</option></SelectEntry></label>
        {policy.empty==="FIXED"&&<PeoplePickerField directory={{...directory,people:directory.people.filter(person=>person.enabled&&person.loginBound===true)}} value={Array.isArray(policy.fallbackIds)?policy.fallbackIds:[]} onChange={fallbackIds=>patchPolicy({fallbackIds})} disabled={disabled} limit={20} ordered={node.type==="HANDLING"||node.approvalMode==="ALL"} label="回退处理人" placeholder="选择回退处理人"/>}
      <p className="text-caption leading-5 text-muted-foreground">先去重和排除发起人，再判断是否为空。明确选择的回退名单不会再次排除发起人。回退只确定处理人；自动通过需另行显式配置。固定回退最多二十人。</p>
        {policyIssue&&<p role="alert" className="text-caption text-destructive">{policyIssue}</p>}
      </div>
      <div className="space-y-1 rounded-card bg-muted/50 p-3 text-caption leading-5 text-muted-foreground">
        <p>进入此节点时确定并保存人员名单；后续组织变动不影响本次待办。退回后重新进入节点时会重新确定名单。</p>
        <p>名单为空且未设置回退、含失效的指定成员或超过 {limit} 人时，本次推进会报错并保持原状态。</p>
        {disabled && <p>当前版本为只读预览。</p>}
      </div>
    </section>
  );
}
