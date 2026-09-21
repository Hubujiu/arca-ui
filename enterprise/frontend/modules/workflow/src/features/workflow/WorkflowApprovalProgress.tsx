import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import type { Run } from "@/lowcode/model";
import { approvalModeLabels } from "@/lowcode/workflow-model";

export function WorkflowApprovalProgress({ progress }: { progress?: Run["approvalProgress"] }) {
  if (!progress) return null;
  return <section aria-label="当前并行审批进度" className="rounded-card border border-border bg-muted/30 p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-body font-medium">{approvalModeLabels[progress.mode]}</h3>
      <span className="text-caption text-muted-foreground">共 {progress.total} 人</span>
    </div>
    <p className="mt-2 text-caption leading-5 text-muted-foreground">本次需要 {progress.requiredApprovals} 人同意通过</p>
    <div role="progressbar" aria-label="已同意人数" aria-valuenow={progress.approved}
      aria-valuemin={0} aria-valuemax={progress.requiredApprovals} className="my-3 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="dw-data-workflow-approval-progress-1 h-full rounded-full bg-primary" style={({ "--dw-data-workflow-approval-progress-1-width": cssLength(`${Math.min(100, progress.approved * 100 / progress.requiredApprovals)}%`) }) as DataStyle} />
    </div>
    <dl className="grid grid-cols-3 gap-2 text-center">
      {[["已同意", progress.approved], ["已拒绝", progress.rejected], ["待处理", progress.pending]].map(([label, count]) =>
        <div key={label} className="rounded-control bg-card px-2 py-2">
          <dt className="text-caption text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-body font-medium tabular-nums">{count}</dd>
        </div>)}
    </dl>
  </section>;
}

