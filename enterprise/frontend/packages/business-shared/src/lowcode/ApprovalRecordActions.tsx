import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import { AppModal, Button, FieldSelect } from "@/shared/ui";
import { base, message, useLoad, type Row } from "./model";

type FlowButton = { id: string; name: string; revision: number };
type FlowRun = {
  id: string;
  flowName?: string;
  flowVersion?: number;
  recordRevision?: number;
  executionState?: string;
  approvalResult?: string;
  status?: string;
  changeId?: string;
  canOpen?: boolean;
  error?: string;
};

export function ApprovalRecordActions({ row }: { row: Row }) {
  const actions = useLoad<FlowButton[]>(`${base}/tables/${row.tableId}/flow-buttons?recordId=${row.id}`);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [run, setRun] = useState<FlowRun>();

  async function execute() {
    const action = actions.data?.find(item => item.id === selected);
    if (!action || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<FlowRun>(`${base}/flows/${action.id}/run`, "POST", { requestKey, recordId: row.id, revision: row.revision });
      setRun(result);
      setRequestKey(crypto.randomUUID());
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }

  if (actions.error) return <div className="flex flex-wrap items-center gap-2"><span role="alert" className="text-caption text-destructive">审批动作读取失败</span><Button size="sm" variant="outline" onClick={actions.refresh}>重试</Button></div>;
  if (!actions.data?.length) return null;
  return <><Button size="sm" variant="outline" onClick={() => { setSelected(actions.data?.[0]?.id ?? ""); setOpen(true); setError(""); setRun(undefined); setRequestKey(crypto.randomUUID()); }}>发起审批</Button><AppModal open={open} onOpenChange={value => { if (!busy) setOpen(value); }} dismissible={!busy} title="对当前记录发起审批" description="将以当前记录版本启动所选已启用流程；每条流程独立保存其审批结果。" footer={!run ? <Button disabled={busy || !selected} onClick={() => void execute()}>{busy ? "正在提交…" : "发起审批"}</Button> : <Button onClick={() => setOpen(false)}>完成</Button>}><div className="space-y-3">{run ? <RunReceipt run={run} /> : <><FieldSelect label="可发起的审批流程" value={selected} options={actions.data.map(action => ({ value: action.id, label: action.name }))} onChange={value => { setSelected(value); setRequestKey(crypto.randomUUID()); }} />{error && <p role="alert" className="text-body text-destructive">{error}</p>}</>}</div></AppModal></>;
}

function RunReceipt({ run }: { run: FlowRun }) {
  const state = run.executionState ?? run.status ?? "QUEUED";
  const label = ({ QUEUED: "已加入队列", STARTING: "正在启动", RETRY: "等待重试", PENDING: "等待审批", WAITING: "等待处理", RUNNING: "正在执行", DONE: "执行结束", COMPLETED: "已完成", FAILED: "执行失败", CANCELLED: "已取消" } as Record<string, string>)[state] ?? state;
  return <div className="rounded-card border border-border p-4 text-body"><p className="font-medium">审批已提交</p><p className="mt-2 text-muted-foreground">{run.flowName ?? "审批流程"}{run.flowVersion ? ` · V${run.flowVersion}` : ""} · 记录版本 V{run.recordRevision ?? "—"}</p><p className="mt-1 text-caption text-muted-foreground">当前状态：{label}</p>{run.canOpen && run.changeId && <Link className="mt-3 inline-flex text-body text-primary hover:underline" to={`/workflows/${run.changeId}?run=${run.id}`}>查看审批详情</Link>}{run.error && <p role="alert" className="mt-2 text-body text-destructive">{run.error}</p>}</div>;
}
