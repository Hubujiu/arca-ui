import type { Run, Task } from "./model";

export function workflowActorTask(run: Run | undefined, personId: string | undefined): Task | undefined {
  if (!run?.canAct || !personId) return undefined;
  return run.tasks.find((task) => task.assigneeId ? task.assigneeId === personId : task.candidateIds.includes(personId));
}

export function workflowDecisionNotice(action: "APPROVE" | "REJECT" | "RETURN", status?: string, handling = false): string {
  if (action === "RETURN") return "当前流程已退回";
  if (action === "REJECT") return status === "REJECTED"
    ? "当前流程已拒绝" : "拒绝意见已记录，当前流程仍在等待其他成员处理";
  if (handling) return "本次办理已完成";
  return status === "APPROVED" ? "当前流程已通过" : "同意意见已记录，当前流程继续处理中";
}
