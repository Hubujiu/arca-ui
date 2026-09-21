import { TextEntry } from "@/components/controls";
import { Checkbox } from "@/components/motion/checkbox";
import { workflowActionIssues, type WorkflowNode, type WorkflowActionConfig } from "./workflow-model";

export function WorkflowActionSettings({ node, disabled, onChange }: { node: WorkflowNode; disabled: boolean; onChange: (patch: Partial<WorkflowNode>) => void }) {
  const config = node.actionConfig ?? {};
  const patch = (value: Partial<WorkflowActionConfig>) => onChange({ actionConfig: { ...config, ...value } });
  const labels = node.type === "APPROVAL" ? [["approveLabel", "通过按钮名称", "同意"], ["rejectLabel", "拒绝按钮名称", "拒绝"], ["returnLabel", "退回按钮名称", "退回"]] as const : [["approveLabel", "完成按钮名称", "完成办理"]] as const;
  const issue=workflowActionIssues(node)[0];
  return <section className="space-y-3 border-t border-border pt-5">
    <h3 className="text-body font-medium">处理规则</h3>
    <div><Checkbox label="允许转交" checked={config.allowTransfer === true} disabled={disabled} onCheckedChange={value => patch({ allowTransfer: value === true })} /></div>
    <div><Checkbox label="允许前加签" checked={config.allowAddSign === true} disabled={disabled} onCheckedChange={value => patch({ allowAddSign: value === true })} /></div>
    <p className="text-caption leading-5 text-muted-foreground">前加签先交给指定成员处理，同意后回到原处理人；并行节点的计票人数保持不变，最多嵌套五层。</p>
    <div><Checkbox label="必须填写处理意见" checked={config.requireComment === true} disabled={disabled} onCheckedChange={value => patch({ requireComment: value === true })} /></div>
    <div><Checkbox label="同意时必须手写签名" checked={config.requireSignature === true} disabled={disabled} onCheckedChange={value => patch({ requireSignature: value === true })} /></div>
    {node.type === "APPROVAL" && <>
      <div><Checkbox label="允许拒绝" checked={config.allowReject !== false} disabled={disabled} onCheckedChange={value => patch({ allowReject: value === true })} /></div>
      <div><Checkbox label="拒绝时必须手写签名" checked={config.requireRejectSignature === true} disabled={disabled || config.allowReject === false} onCheckedChange={value => patch({ requireRejectSignature: value === true })} /></div>
      <div><Checkbox label="允许退回" checked={config.allowReturn !== false} disabled={disabled} onCheckedChange={value => patch({ allowReturn: value === true })} /></div>
    </>}
    {labels.map(([key,label,fallback])=><label key={key} className="block space-y-2 text-caption"><span>{label}（留空使用默认）</span><TextEntry className={""} disabled={disabled} maxLength={32} value={config[key]??""} placeholder={fallback} onChange={event=>patch({[key]:event.target.value||null})}/></label>)}
    <label className="block space-y-2 text-caption"><span>处理期限（小时，留空不限时）</span><TextEntry type="number" min={1} max={8760} step={1} className={""} disabled={disabled} value={config.deadlineHours ?? ""} onChange={event => patch({ deadlineHours: event.target.value === "" ? null : Number(event.target.value) })} /></label>
    <p className="text-caption leading-5 text-muted-foreground">逾期发送一次站内提醒。转交和加签继续使用本次节点原有的截止时间。</p>
    <label className="block space-y-2 text-caption"><span>阶段名称（可选）</span><TextEntry className={""} disabled={disabled} maxLength={80} value={config.stageName??""} placeholder="例如：预算核准" onChange={event=>patch({stageName:event.target.value||null,...(!event.target.value?{keyStage:false}:{})})}/></label>
    <div><Checkbox label="标记为关键节点" checked={config.keyStage === true} disabled={disabled || !config.stageName?.trim()} onCheckedChange={value=>patch({keyStage:value===true})}/></div>
    <p className="text-caption leading-5 text-muted-foreground">阶段标记显示在当前任务和流转进度中。已发起的流程保留当时发布的阶段名称。</p>
    {issue&&<p role="alert" className="text-caption text-destructive">{issue}</p>}
  </section>;
}
