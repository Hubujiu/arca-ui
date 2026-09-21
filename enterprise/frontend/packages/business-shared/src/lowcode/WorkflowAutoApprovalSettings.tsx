import { Checkbox } from "@/components/motion/checkbox";
import type { Directory } from "../organization/model";
import type { TableSchema } from "./field-model";
import { RuleEditor } from "./RuleEditor";
import { createRule } from "./rules";
import { conditionFields, workflowAutoApprovalIssues, type WorkflowAutoApproval, type WorkflowNode } from "./workflow-model";

export function WorkflowAutoApprovalSettings({node,schema,directory,disabled,onChange}:{node:WorkflowNode;schema:TableSchema;directory:Directory;disabled:boolean;onChange:(patch:Partial<WorkflowNode>)=>void}) {
  const config=node.autoApproval??{},fields=conditionFields(schema),issues=workflowAutoApprovalIssues(node,schema,directory);
  function patch(value:Partial<WorkflowAutoApproval>) {
    if(disabled)return;
    const next={...config,...value};
    onChange({autoApproval:next.initiatorIsApprover||next.condition?next:null});
  }
  return <section className="space-y-3 border-t border-border pt-5" aria-label="自动通过设置">
    <h3 className="text-body font-medium">自动通过</h3>
    <Checkbox label="发起人与审批人相同时自动通过" checked={config.initiatorIsApprover===true} disabled={disabled} onCheckedChange={value=>patch({initiatorIsApprover:value===true})}/>
    <Checkbox label="满足条件时自动通过" checked={!!config.condition} disabled={disabled||!fields.length} onCheckedChange={value=>patch({condition:value===true?createRule(fields):null})}/>
    {config.condition&&<RuleEditor value={config.condition} fields={fields} directory={directory} disabled={disabled} onChange={condition=>patch({condition})}/>}
    <p className="text-caption leading-5 text-muted-foreground">任一启用规则命中时，系统在进入节点后自动同意对应待办；未命中仍需人工审批。与字段编辑、必填意见、同意签名不可同时配置。</p>
    <p className="text-caption leading-5 text-muted-foreground">同人规则只处理发起人席位；或签共享待办包含发起人时可通过。顺序审批逐位处理，并行审批保留人数与通过阈值。条件命中可处理节点各席位。转交、加签不重新评估；退回后重入会重新评估。</p>
    {!!issues.length&&<p role="alert" className="text-caption text-destructive">{issues[0]}</p>}
  </section>;
}
