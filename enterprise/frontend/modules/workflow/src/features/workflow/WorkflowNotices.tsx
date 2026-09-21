import { ActionSurface } from "@/components/controls";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BellAction, CheckAction, RefreshAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { AppModal, Button, EmptyState } from "@/shared/ui";
import { base, dateLabel, message, useLoad } from "@/lowcode/model";
import { LoadState } from "@/lowcode/common";
import { AutomationNoticeAction } from "@/lowcode/AutomationNoticeAction";

type Notice = { id: string; sourceType: string; sourceId?: string; context?: {runId?: string; changeId?: string}; kind: string; message: string; readAt?: string; createdAt: string };
const noticeLabels:Record<string,string>={APPROVED:"申请已通过",REJECTED:"申请已拒绝",WITHDRAWN:"申请已撤回",MANUAL_REMINDER:"催办提醒",OVERDUE:"逾期提醒",AUTOMATION:"自动化消息",AUTOMATION_FAILED:"自动化失败"};
export function WorkflowNotices() {
  const [open, setOpen] = useState(false), [offset, setOffset] = useState(0), [error, setError] = useState("");
  const loaded = useLoad<Notice[]>(open ? `${base}/notices?offset=${offset}` : undefined);
  async function read(notice: Notice) {
    if (notice.readAt) return;
    try { await api(`${base}/notices/${notice.id}/read`, "POST"); loaded.setData(items => items?.map(item => item.id === notice.id ? { ...item, readAt: new Date().toISOString() } : item)); }
    catch (cause) { setError(message(cause)); }
  }
  return <><Button variant="secondary" size="sm" onClick={() => setOpen(true)}><BellAction size={14} />站内通知</Button>
    <AppModal open={open} onOpenChange={setOpen} title="站内通知" description="申请结果、审批催办、逾期提醒与自动化消息。" className="max-w-2xl">
      {error && <p role="alert" className="mb-3 text-body text-destructive">{error}</p>}
      {loaded.loading || loaded.error || !loaded.data ? <LoadState error={loaded.error} retry={loaded.refresh} /> : <>
        {!loaded.data.length ? <EmptyState title="暂无通知" /> : <ul className="divide-y divide-border">{loaded.data.map(notice => <li key={notice.id} className="space-y-2 py-4">
          <span className="inline-flex rounded-control bg-primary/5 px-2 py-1 text-caption text-primary">{noticeLabels[notice.kind]??"站内消息"}</span>
          <p className={`text-body leading-6 ${notice.readAt ? "text-muted-foreground" : "font-medium"}`}>{notice.message}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-muted-foreground"><time>{dateLabel(notice.createdAt)}</time><div className="flex items-center gap-3">
            {notice.sourceType === "workflow_change" && notice.sourceId && <Link className="text-primary hover:underline" onClick={() => { void read(notice); setOpen(false); }} to={`/workflows/${notice.sourceId}${notice.context?.runId?`?run=${encodeURIComponent(notice.context.runId)}`:""}`}>{notice.context?.runId?"查看流程":"查看申请"}</Link>}
            {notice.sourceType === "automation_run" && notice.sourceId && <AutomationNoticeAction runId={notice.sourceId} onOpen={() => void read(notice)} />}
            {!notice.readAt && <ActionSurface onClick={() => void read(notice)} className="flex items-center gap-1"><CheckAction size={12} />标为已读</ActionSurface>}
          </div></div>
        </li>)}</ul>}
        <div className="mt-3 flex justify-between gap-2 border-t border-border pt-3"><Button variant="ghost" size="sm" onClick={loaded.refresh}><RefreshAction running={loaded.loading} size={13} />刷新</Button><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 50))}>上一页</Button><Button variant="secondary" size="sm" disabled={loaded.data.length < 50} onClick={() => setOffset(value => value + 50)}>下一页</Button></div></div>
      </>}
    </AppModal>
  </>;
}

