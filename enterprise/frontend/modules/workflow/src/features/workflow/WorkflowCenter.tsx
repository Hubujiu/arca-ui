import { ActionSurface, MultilineEntry, TextEntry } from "@/components/controls";
import {RecordWorkflows} from "@/lowcode/RecordWorkflows";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  FileText,
  History,
  Inbox,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  X,
  UserPlus,
  Forward,
} from "@/shared/icons/catalog";
import { BellAction, RefreshAction, SearchAction, SaveAction, SendAction, ArrowRightAction } from "@/shared/icons/motion";
import { api, ApiError } from "@/shared/api/client";
import { AppModal, Button, EmptyState, FieldSelect } from "@/shared/ui";
import { cn } from "@/lib/utils";
import type { Directory } from "@/organization/model";
import { FieldRenderer } from "@/lowcode/FieldRenderer";
import { LookupContext } from "@/lowcode/LookupSession";
import { SignatureField, SignatureImage } from "@/lowcode/SignatureField";
import { validSignature, type SignatureValue } from "@/lowcode/signature-model";
import { WorkflowNotices } from "./WorkflowNotices";
import {
  initialValues,
  validateValues,
  type DefaultUser,
  type TableSchema,
} from "@/lowcode/field-model";
import { BackLink, LoadState, Status } from "@/lowcode/common";
import { recipientSourceLabels, workflowActionPolicy, workflowAutoApprovalReason } from "@/lowcode/workflow-model";
import { WorkflowApprovalProgress } from "./WorkflowApprovalProgress";
import { workflowActorTask, workflowDecisionNotice } from "@/lowcode/workflow-progress";
import { mergeWorkflowFieldValues, workflowDecisionData, workflowFieldValues, workflowTaskSchemas, workflowReferenceValues } from "@/lowcode/workflow-field-permissions";
import {
  actions,
  base,
  blankDirectory,
  dateLabel,
  message,
  useLoad,
  type Change,
  type Run,
  type Task,
} from "@/lowcode/model";

type InboxView = "pending" | "handled" | "copies" | "mine";
type CopyReceipt = {
  id: string;
  title: string;
  nodeName: string;
  valid: boolean;
  readAt?: string;
  createdAt: string;
};
type CopyDetail = {
  id: string;
  tableId: string;
  changeId: string;
  recordId?: string;
  createdAt: string;
  snapshot: {
    title: string;
    data: Record<string, unknown>;
    schema: TableSchema;
    operation: "CREATE" | "UPDATE";
  };
};
type SharedEntry =
  | {
      mode: "FILL";
      tableId: string;
      name: string;
      schema: TableSchema;
      expiresAt: string;
    }
  | { mode: "DATA"; tableId: string; appId: string };
const inboxTabs = [
  { id: "pending", label: "待我处理", icon: Inbox },
  { id: "handled", label: "我已处理", icon: CheckCheck },
  { id: "copies", label: "抄送我的", icon: Mail },
  { id: "mine", label: "我发起的", icon: Send },
] as const;

function InlineError({
  error,
  onRefresh,
}: {
  error: string;
  onRefresh?: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-destructive/20 bg-destructive/5 p-4 text-body text-destructive"
    >
      <span className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        {error}
      </span>
      {onRefresh && (
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshAction size={13} />
          刷新最新状态
        </Button>
      )}
    </div>
  );
}
function Pagination({
  offset,
  size,
  disabled,
  onPage,
}: {
  offset: number;
  size: number;
  disabled: boolean;
  onPage: (offset: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <span className="text-caption text-muted-foreground">
        第 {offset / 50 + 1} 页 · {size} 条
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || offset === 0}
          onClick={() => onPage(Math.max(0, offset - 50))}
        >
          <ArrowLeft size={13} />
          上一页
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || size < 50}
          onClick={() => onPage(offset + 50)}
        >
          下一页
          <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
function CopySnapshot({
  receipt,
  directory,
  onClose,
  onRead,
}: {
  receipt: CopyReceipt;
  directory: Directory;
  onClose: () => void;
  onRead: (id: string) => void;
}) {
  const loaded = useLoad<CopyDetail>(`${base}/copies/${receipt.id}`);
  const notified = useRef(false);
  useEffect(() => {
    if (loaded.data && !notified.current) {
      notified.current = true;
      onRead(receipt.id);
    }
  }, [loaded.data, receipt.id, onRead]);
  return (
    <AppModal
      open
      onOpenChange={(open) => !open && onClose()}
      title={loaded.data?.snapshot.title ?? receipt.title}
      description={`抄送于 ${dateLabel(receipt.createdAt)} · ${receipt.nodeName}`}
      className="max-w-3xl"
    >
      {!receipt.valid && (
        <p className="mb-4 rounded-card bg-status-warning/10 p-3 text-caption leading-5 text-status-warning dark:bg-status-warning/10 dark:text-status-warning">
          流程已退回，此抄送所属的历史路径已失效。下方仍保留当时收到的内容。
        </p>
      )}
      {loaded.error || !loaded.data ? (
        <LoadState
          error={loaded.error}
          retry={loaded.refresh}
          title="正在读取抄送内容…"
        />
      ) : (
        <>
          <p className="mb-5 flex items-center gap-2 text-caption text-muted-foreground">
            <History size={14} />
            这是抄送时的申请快照
          </p>
          <FieldRenderer
            schema={loaded.data.snapshot.schema}
            value={loaded.data.snapshot.data}
            originalValue={loaded.data.snapshot.data}
            onChange={() => {}}
            directory={directory}
            mode={loaded.data.snapshot.operation === "UPDATE" ? "edit" : "create"}
            fileContext={{
              tableId: loaded.data.tableId,
              changeId: loaded.data.changeId,
              recordId: loaded.data.recordId,
            }}
            readOnly
          />
        </>
      )}
    </AppModal>
  );
}

export function WorkflowCenter() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view"),
    view: InboxView = inboxTabs.some((tab) => tab.id === requested)
      ? (requested as InboxView)
      : "pending";
  const rawOffset = Number(params.get("offset") ?? 0),
    offset =
      Number.isSafeInteger(rawOffset) && rawOffset >= 0
        ? Math.floor(rawOffset / 50) * 50
        : 0;
  const [query, setQuery] = useState("");
  const [selectedCopy, setSelectedCopy] = useState<CopyReceipt>();
  const changes = useLoad<Change[]>(
    view !== "copies"
      ? `${base}/changes?view=${view}&offset=${offset}`
      : undefined,
  );
  const copies = useLoad<CopyReceipt[]>(
    view === "copies" ? `${base}/copies?offset=${offset}` : undefined,
  );
  const directory = useLoad<Directory>("/api/v1/organization");
  const current = view === "copies" ? copies : changes;
  function changePage(nextView: InboxView, nextOffset = 0) {
    setParams({
      view: nextView,
      ...(nextOffset ? { offset: String(nextOffset) } : {}),
    });
    setQuery("");
  }
  const lowered = query.trim().toLocaleLowerCase();
  const visibleChanges =
    changes.data?.filter((change) =>
      `${change.title} ${change.creatorName ?? ""} ${change.tableName ?? ""} ${change.appName ?? ""} ${change.flowName ?? ""}`
        .toLocaleLowerCase()
        .includes(lowered),
    ) ?? [];
  const visibleCopies =
    copies.data?.filter((copy) =>
      `${copy.title} ${copy.nodeName}`.toLocaleLowerCase().includes(lowered),
    ) ?? [];
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-caption text-muted-foreground">工作台 / 审批</p>
          <h1 className="text-heading font-semibold tracking-tight">审批中心</h1>
          <p className="mt-2 text-body text-muted-foreground">
            集中处理申请，随时跟进每一步进展。
          </p>
        </div>
        <div className="flex gap-2"><WorkflowNotices /><Button
          variant="secondary"
          size="sm"
          disabled={current.loading}
          onClick={current.refresh}
        >
          <RefreshAction running={current.loading} size={14} />
          刷新
        </Button></div>
      </header>
      {params.get("returned") === "1" && (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-card bg-primary/5 p-4 text-body"
        >
          <span className="inline-flex text-primary"><Check size={15}  /></span>
          申请已退回，后续由所选节点的处理人继续办理。
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto" aria-label="审批分类">
          {inboxTabs.map((tab) => (
            <ActionSurface active={view === tab.id}
              type="button"
              key={tab.id}
              aria-current={view === tab.id ? "page" : undefined}
              onClick={() => changePage(tab.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2",
                view === tab.id
                  ? "after:absolute after:inset-x-4 after:bottom-0 after:h-0.5"
                  : "",
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </ActionSurface>
          ))}
        </nav>
        <label className="relative mb-2 block w-full sm:w-64" data-action-icon-host="">
          <span className="inline-flex pointer-events-none absolute left-3 top-3 text-muted-foreground"><SearchAction
            size={15}

          /></span>
          <TextEntry
            className={cn("", "h-9")}
            aria-label="筛选本页申请"
            placeholder="筛选本页标题、发起人"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {current.loading || current.error || !current.data ? (
        <LoadState
          error={current.error}
          retry={current.refresh}
          title="正在加载审批列表…"
        />
      ) : (
        <>
          {(view === "copies" ? visibleCopies : visibleChanges).length === 0 ? (
            <EmptyState
              title={
                query
                  ? "没有匹配的申请"
                  : view === "pending"
                    ? "当前没有待处理申请"
                    : view === "copies"
                      ? "还没有收到抄送"
                      : "这里还没有申请"
              }
            >
              {query
                ? "尝试其他关键词，或切换到其他页面查找。"
                : view === "pending"
                  ? "新的审批任务会出现在这里。"
                  : view === "mine"
                    ? "在应用中填写表单后，可以在这里查看提交记录。"
                    : "后续记录会展示在这里。"}
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-control border border-border bg-card">
              <div className="hidden grid-cols-record-columns gap-4 border-b border-border bg-muted/25 px-5 py-3 text-caption text-muted-foreground md:grid">
                <span>申请</span>
                <span>{view === "copies" ? "抄送状态" : "状态 / 类型"}</span>
                <span>{view === "copies" ? "抄送时间" : "发起时间"}</span>
                <span />
              </div>
              <ul className="divide-y divide-border">
                {view === "copies"
                  ? visibleCopies.map((copy) => (
                      <li key={copy.id}>
                        <ActionSurface
                          type="button"
                          onClick={() => setSelectedCopy(copy)}
                          className="w-full items-center gap-3 text-left md:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-card bg-status-info/70 text-status-info dark:bg-status-info/10 dark:text-status-info">
                              <Mail size={18} />
                              {!copy.readAt && (
                                <span className="absolute right-0 top-0 size-2 rounded-full bg-primary ring-2 ring-card" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-body font-medium">
                                {copy.title}
                              </strong>
                              <small className="mt-1 block text-caption text-muted-foreground">
                                {copy.nodeName}
                              </small>
                            </span>
                          </div>
                          <span className="text-caption text-muted-foreground">
                            {copy.valid
                              ? copy.readAt
                                ? "已读"
                                : "未读"
                              : "历史路径已失效"}
                          </span>
                          <time className="text-caption text-muted-foreground">
                            {dateLabel(copy.createdAt)}
                          </time>
                          <span className="inline-flex hidden text-muted-foreground md:block"><ChevronRight
                            size={16}

                          /></span>
                        </ActionSurface>
                      </li>
                    ))
                  : visibleChanges.map((change) => (
                      <li key={change.runId ?? change.run?.id ?? change.id}>
                        <Link
                          to={`/workflows/${change.id}${change.runId || change.run?.id ? `?run=${encodeURIComponent(change.runId ?? change.run!.id)}` : ""}`}
                          className="grid items-center gap-3 px-5 py-4 outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-record-columns md:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
                              <FileText size={18} />
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-body font-medium">
                                {change.title}
                              </strong>
                              <small className="mt-1 block truncate text-caption text-muted-foreground">
                                {change.creatorName ?? "发起人"} ·{" "}
                                {[change.appName, change.tableName, change.flowName]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </small>
                            </span>
                          </div>
                          <span className="flex items-center gap-2">
                            <Status value={change.status} />
                            <span className="text-caption text-muted-foreground">
                              {change.operation === "UPDATE" ? "修改" : "新增"}
                            </span>
                          </span>
                          <time className="text-caption text-muted-foreground">
                            {dateLabel(change.createdAt)}
                          </time>
                          <span className="inline-flex hidden text-muted-foreground md:block"><ChevronRight
                            size={16}

                          /></span>
                        </Link>
                      </li>
                    ))}
              </ul>
            </div>
          )}
          <Pagination
            offset={offset}
            size={current.data.length}
            disabled={current.loading}
            onPage={(next) => changePage(view, next)}
          />
        </>
      )}
      {selectedCopy && (
        <CopySnapshot
          key={selectedCopy.id}
          receipt={selectedCopy}
          directory={directory.data ?? blankDirectory}
          onClose={() => setSelectedCopy(undefined)}
          onRead={(id) =>
            copies.setData((rows) =>
              rows?.map((row) =>
                row.id === id
                  ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
                  : row,
              ),
            )
          }
        />
      )}
    </div>
  );
}

function RunTimeline({ run, directory }: { run: Run; directory: Directory }) {
  const stateLabels: Record<string, string> = {
    ACTIVE: "当前处理中",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };
  const nodeNames = new Map(
    run.visits.map((visit) => [visit.nodeId, visit.nodeName]),
  );
  const nodeTypes = new Map(run.visits.map((visit) => [visit.nodeId, visit.nodeType]));
  return (
    <div className="space-y-6">
      <WorkflowApprovalProgress progress={run.approvalProgress} />
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-body font-medium">
          <Clock3 size={15} />
          流转进度
        </h3>
        <ol className="space-y-0">
          {run.visits.map((visit, index) => {
            const active = visit.valid && visit.state === "ACTIVE";
            return (
              <li key={visit.id} className="relative flex gap-3 pb-5 last:pb-0">
                {index < run.visits.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-2.5 top-6 border-l border-border"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex size-5.25 shrink-0 items-center justify-center rounded-full border",
                    !visit.valid
                      ? "border-border bg-muted text-muted-foreground"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/25 bg-primary/10 text-primary",
                  )}
                >
                  {active ? (
                    <Clock3 size={11} />
                  ) : !visit.valid || visit.state === "CANCELLED" ? (
                    <X size={11} />
                  ) : (
                    <Check size={11} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <strong
                      className={cn(
                        "text-caption font-medium",
                        !visit.valid && "text-muted-foreground",
                      )}
                    >
                      {visit.nodeName}
                      {visit.stageName && <span className="ml-2 rounded-control bg-muted px-1.5 py-0.5 text-caption font-normal text-muted-foreground">{visit.keyStage ? "关键阶段 · " : "阶段 · "}{visit.stageName}</span>}
                      {visit.nodeType === "HANDLING" && (
                        <span className="ml-2 text-caption font-normal text-muted-foreground">办理</span>
                      )}
                    </strong>
                    <span
                      className={cn(
                        "text-caption",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {visit.valid
                        ? visit.automatic ? "系统自动通过" : visit.nodeType === "HANDLING" && visit.state === "ACTIVE"
                          ? "当前办理中"
                          : visit.nodeType === "HANDLING" && visit.state === "COMPLETED"
                            ? "已完成办理"
                            : (stateLabels[visit.state] ?? visit.state)
                        : "退回后已失效"}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-caption leading-5 text-muted-foreground">
                    {visit.automatic ? "系统自动审批（未代签或填写意见）" : visit.actorName ||
                      visit.assigneeIds
                        .map(
                          (id) =>
                            directory.people.find((person) => person.id === id)
                              ?.displayName ?? "公司成员",
                        )
                        .join("、") ||
                      (visit.nodeType === "CC" ? "系统抄送" : "系统处理")}
                  </p>
                  <time className="mt-0.5 block text-caption text-muted-foreground">
                    {dateLabel(visit.completedAt ?? visit.enteredAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
        {!run.visits.length && (
          <p className="text-caption text-muted-foreground">
            流程尚未进入处理节点。
          </p>
        )}
      </section>
      <section className="border-t border-border pt-5">
        <h3 className="mb-4 flex items-center gap-2 text-body font-medium">
          <History size={15} />
          操作记录
        </h3>
        <ol className="space-y-4">
          {run.events.map((event, index) => (
            <li
              key={`${event.createdAt}-${index}`}
              className="rounded-card bg-muted/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                <strong className="font-medium">{event.actorName}</strong>
                <span className="text-muted-foreground">
                  {event.action === "AUTO_APPROVE" ? "自动通过" : event.action === "RESOLVE_RECIPIENTS" ? "确定节点人员"
                    : event.action === "REJECT" ? "提交拒绝意见"
                    : event.action === "APPROVE" && nodeTypes.get(event.nodeId ?? "") === "HANDLING"
                    ? "完成办理"
                    : (actions[event.action] ?? event.action)}
                </span>
              </div>
              {event.action === "RESOLVE_RECIPIENTS" && event.metadata?.config && (
                <div className="mt-2 space-y-1 text-caption leading-5 text-muted-foreground">
                  <p>{nodeNames.get(event.nodeId ?? "") ?? "流程节点"} · {recipientSourceLabels[event.metadata.config.source] ?? "动态人员来源"}</p>
                  {event.metadata.fallbackReason && event.metadata.fallbackReason !== "NONE" && <p>{event.metadata.fallbackReason === "INITIATOR_REMOVED" ? "排除发起人后名单为空" : "来源未找到候选人"}，已按配置交给{event.metadata.actualSource === "INITIATOR" ? "发起人" : "指定回退成员"}正常处理。</p>}
                  {event.metadata.removedInitiator && event.metadata.fallbackReason === "NONE" && <p>已从候选名单排除发起人。</p>}
                  <p className="break-words">本次进入节点的人员：{event.metadata.names?.join("、")}</p>
                </div>
              )}
              {event.metadata?.targetUserId && <p className="mt-2 text-caption text-muted-foreground">交给：{directory.people.find(person => person.id === event.metadata?.targetUserId)?.displayName ?? "公司成员"}</p>}
              {event.action === "AUTO_APPROVE" && <div className="mt-2 space-y-1 text-caption leading-5 text-muted-foreground">
                <p>{nodeNames.get(event.nodeId??"")??"审批节点"} · {workflowAutoApprovalReason(event.metadata?.reason)}</p>
                <p>{event.metadata?.sharedTask?"共享待办候选人":"对应审批席位"}：{event.metadata?.seatIds?.map(id=>directory.people.find(person=>person.id===id)?.displayName??"公司成员").join("、")}</p>
                {event.metadata?.total!=null&&<p>原名单 {event.metadata.total} 人，累计同意 {event.metadata.approved} / 所需 {event.metadata.requiredApprovals}，待处理 {event.metadata.pending} 人{event.metadata.cancelled?`，通过后取消其余 ${event.metadata.cancelled} 个席位`:""}。</p>}
              </div>}
              {event.metadata?.signature && <div className="mt-3 space-y-1"><SignatureImage value={event.metadata.signature.drawing} label={event.metadata.signature.signedName} height={95} /><p className="text-caption text-muted-foreground">由 {event.metadata.signature.signedName} 签名</p></div>}
              {event.targetNodeId && (
                <p className="mt-1.5 text-caption text-muted-foreground">
                  退回至{" "}
                  {run.returnTargets.find(
                    (target) => target.nodeId === event.targetNodeId,
                  )?.nodeName ??
                    nodeNames.get(event.targetNodeId) ??
                    "上游节点"}
                </p>
              )}
              {event.comment && (
                <p className="mt-2 whitespace-pre-wrap break-words text-caption leading-5">
                  {event.comment}
                </p>
              )}
              <time className="mt-2 block text-caption text-muted-foreground">
                {dateLabel(event.createdAt)}
              </time>
            </li>
          ))}
        </ol>
        {!run.events.length && (
          <p className="text-caption text-muted-foreground">暂无流程操作记录。</p>
        )}
      </section>
    </div>
  );
}

type Decision = "APPROVE" | "REJECT" | "RETURN" | "TRANSFER" | "ADD_SIGN" | "REMIND";
function ChangeContent({
  change,
  meId,
  directory,
  onReplace,
  onRefresh,
  onSuccess,
  onFailure,
}: {
  change: Change;
  meId?: string;
  directory: Directory;
  onReplace: (next: Change) => void;
  onRefresh: () => void;
  onSuccess: (message: string) => void;
  onFailure: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(change.title),
    [data, setData] = useState(change.data);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [resolving, setResolving] = useState(false),
    [stale, setStale] = useState(false);
  const [decision, setDecision] = useState<Decision>(),
    [comment, setComment] = useState(""),
    [target, setTarget] = useState("");
  const [targetUser, setTargetUser] = useState(""), [remindTask, setRemindTask] = useState("");
  const [signature, setSignature] = useState<SignatureValue>();
  const attempt = useRef<{ payload: string; key: string } | undefined>(undefined);
  const [withdraw, setWithdraw] = useState(false);
  const flight = useRef(false);
  const uploadFlight = useRef(false);
  const resolveFlight = useRef(false);
  const owner = !!meId && change.createdBy === meId,
    run = change.run;
  const task: Task | undefined = workflowActorTask(run, meId);
  const taskActions = task ? run?.taskActions?.[task.taskId] : undefined;
  const actionPolicy = workflowActionPolicy(task?.type, taskActions);
  const assignment = decision === "TRANSFER" || decision === "ADD_SIGN";
  const commentRequired = decision !== "REMIND" && (decision !== "APPROVE" || taskActions?.requireComment === true);
  const signatureRequired = actionPolicy.signatureRequired(decision);
  const reminderTasks = run?.tasks.filter(entry => ["APPROVAL", "HANDLING"].includes(entry.type)) ?? [];
  const targetPeople = directory.people.filter(person => person.enabled && person.loginBound && person.id !== meId && person.id !== taskActions?.returnToId
    && !run?.tasks.some(peer => peer.taskId !== task?.taskId && (peer.assigneeId === person.id || peer.candidateIds.includes(person.id))));
  const initiatorTask = owner && task?.type === "START";
  const editable = owner && (change.status === "DRAFT" || initiatorTask);
  const canApprove =
    run?.canAct &&
    task?.type === "APPROVAL" &&
    ["PENDING", "RETURNED"].includes(change.status);
  const canHandle =
    run?.canAct &&
    task?.type === "HANDLING" &&
    ["PENDING", "RETURNED"].includes(change.status);
  const canDecide = canApprove || canHandle;
  const taskSchemas = useMemo(() => change.fieldAccess ? workflowTaskSchemas(change.schema, change.fieldAccess) : undefined, [change.schema, change.fieldAccess]);
  const taskEditable = !!canDecide && change.editable === true && !!taskSchemas?.editSchema.fields.length;
  const editData = useMemo(() => taskSchemas ? workflowFieldValues(taskSchemas.editSchema, data) : {}, [taskSchemas, data]);
  const editOriginal = useMemo(() => taskSchemas ? workflowFieldValues(taskSchemas.editSchema, change.data) : {}, [taskSchemas, change.data]);
  const taskContextValues=useMemo(()=>taskSchemas?workflowReferenceValues(taskSchemas.contextFields,change.data):{},[taskSchemas,change.data]);
  const disabled = busy || stale || uploading || resolving;
  function onUploadingChange(active: boolean) {
    uploadFlight.current = active;
    setUploading(active);
  }
  function onResolvingChange(active: boolean) {
    resolveFlight.current = active;
    setResolving(active);
  }
  function validate(complete = true) {
    const next = validateValues(change.schema, data, complete, {
      mode: change.operation === "UPDATE" ? "edit" : "create", existing: change.data,
    });
    if (!title.trim()) next._title = "请填写申请标题";
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function validateTaskEdits() {
    if (!taskEditable || !taskSchemas) return true;
    const next = validateValues(taskSchemas.editSchema, editData, true, {
      mode: change.operation === "UPDATE" ? "edit" : "create", existing: editOriginal, referenceFields:taskSchemas.contextFields, referenceValues:taskContextValues,
    });
    setErrors(next);
    if (Object.keys(next).length) {
      setError("请先完善本节点可编辑字段，再提交处理结果。");
      return false;
    }
    setError("");
    return true;
  }
  function beginApproval() {
    if (!validateTaskEdits()) return;
    setComment("");
    setSignature(undefined);
    setDecision("APPROVE");
  }
  function keyed(body: Record<string, unknown>) {
    const payload = JSON.stringify(body);
    if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    return { ...body, requestKey: attempt.current.key };
  }
  async function perform(
    action: () => Promise<Change | undefined>,
    success: string | ((next: Change | undefined) => string),
  ) {
    if (flight.current || uploadFlight.current || resolveFlight.current || stale) return;
    flight.current = true;
    setBusy(true);
    setError("");
    onFailure("");
    try {
      const next = await action();
      if (next) onReplace(next);
      setDecision(undefined);
      onSuccess(typeof success === "function" ? success(next) : success);
    } catch (cause) {
      setError(message(cause));
      onFailure(message(cause));
      if (
        cause instanceof ApiError &&
        (cause.status === 409 || cause.status === 403)
      )
        setStale(true);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function save(submit: boolean) {
    if (!editable || !validate(submit)) return;
    await perform(
      async () => {
        const saved = await api<Change>(`${base}/changes/${change.id}`, "PUT", {
          revision: change.revision,
          title: title.trim(),
          data,
        });
        if (!submit) return saved;
        // Keep the saved revision even when the subsequent submit is rejected.
        try {
          return await api<Change>(
            `${base}/changes/${change.id}/submit`,
            "POST",
            { revision: saved.revision },
          );
        } catch (cause) {
          onReplace(saved);
          throw cause;
        }
      },
      submit ? "申请已提交" : "草稿已保存",
    );
  }
  function resubmit() {
    if (!initiatorTask || !run || !task || !validate()) return;
    void perform(
      () =>
        api<Change>(`${base}/flow-runs/${run!.id}/decisions`, "POST", keyed({
          action: "RESUBMIT",
          taskId: task.taskId,
          revision: run.revision,
          data,
          title: title.trim(),
          comment: "",
        })),
      "修改已重新提交",
    );
  }
  function decide() {
    if (
      !decision ||
      !run ||
      (decision === "REMIND" ? !run.canRemind || !reminderTasks.some(entry => entry.taskId === remindTask) : !task || !canDecide) ||
      (!canApprove && ["REJECT", "RETURN"].includes(decision)) ||
      (decision === "REJECT" && !actionPolicy.allowReject) ||
      (decision === "RETURN" && !actionPolicy.allowReturn) ||
      (commentRequired && !comment.trim()) ||
      (signatureRequired && !validSignature(signature)) ||
      (assignment && !targetPeople.some(person => person.id === targetUser)) ||
      (decision === "RETURN" &&
        !run.returnTargets.some((entry) => entry.nodeId === target))
    )
      return;
    if (decision === "APPROVE" && !validateTaskEdits()) {
      setDecision(undefined);
      return;
    }
    void perform(
      async () => {
        const body = keyed({
          action: decision,
          taskId: decision === "REMIND" ? remindTask : task!.taskId,
          revision: run.revision,
          comment: comment.trim(),
          ...(decision === "RETURN" ? { targetNodeId: target } : {}),
          ...(assignment ? { targetUserId: targetUser } : {}),
          ...(signatureRequired ? { signature } : {}),
          ...(decision === "APPROVE" && taskEditable && change.fieldAccess ? { data: workflowDecisionData(change.schema, change.fieldAccess, data) } : {}),
        });
        if (decision === "RETURN") {
          await api<Pick<Change, "id" | "status" | "revision">>(
            `${base}/flow-runs/${run!.id}/decisions`,
            "POST",
            body,
          );
          navigate("/workflows?view=handled&returned=1", { replace: true });
          return undefined;
        }
        return api<Change>(
          `${base}/flow-runs/${run!.id}/decisions`,
          "POST",
          body,
        );
      },
      (next) => decision === "TRANSFER" ? "任务已转交" : decision === "ADD_SIGN" ? "已交给加签人，完成后会回到你这里" : decision === "REMIND" ? "站内催办提醒已发送" : taskActions?.delegationDepth && decision === "APPROVE" ? "加签已完成，任务已交回原处理人" : workflowDecisionNotice(decision, next?.status, !!canHandle),
    );
  }
  const creator =
    change.creatorName ??
    directory.people.find((person) => person.id === change.createdBy)
      ?.displayName ??
    "公司成员";
  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Status value={change.status} />
            <span className="rounded-full bg-muted px-2.5 py-1 text-caption text-muted-foreground">
              {run?.triggerType && ({BUTTON:"手动发起",WEBHOOK:"Webhook 触发",SCHEDULE:"定时触发",DATE_FIELD:"日期字段触发"} as Record<string,string>)[run.triggerType] || (change.operation === "UPDATE" ? "修改记录" : "新增记录")}
            </span>
          </div>
          <h1 className="break-words text-heading font-semibold tracking-tight">
            {change.title}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserRound size={13} />
              {creator}
            </span>
            <span>{change.tableName}</span>
            {run && <span>{run.flowName ?? change.flowName ?? "当前流程"} · 记录 V{run.recordRevision ?? change.persistedRevision ?? "—"}</span>}
            <time>{dateLabel(change.createdAt)}</time>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{run?.canRemind && !!reminderTasks.length && <Button variant="secondary" size="sm" disabled={disabled} onClick={() => { setError(""); setComment(""); setRemindTask(reminderTasks[0].taskId); setDecision("REMIND"); }}><BellAction size={13} />催办</Button>}<Button
          variant="secondary"
          size="sm"
          disabled={busy || uploading || resolving}
          onClick={onRefresh}
        >
          <RefreshAction running={busy || uploading || resolving} size={13} />
          刷新
        </Button></div>
      </header>
      <div className="mb-5">
        <InlineError error={error} onRefresh={stale ? onRefresh : undefined} />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-workflow-inspector">
        <section className="min-w-0 overflow-hidden rounded-control border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 text-body font-medium">
              <FileText size={16} />
              申请内容
            </h2>
            <span className="text-caption text-muted-foreground">
              {editable ? "可编辑" : taskEditable ? "部分字段可编辑" : "只读"}
            </span>
          </div>
          <div className="space-y-6 p-5 sm:p-7">
            {initiatorTask && (
              <p className="rounded-card bg-status-warning/10 p-4 text-caption leading-6 text-status-warning dark:bg-status-warning/10 dark:text-status-warning">
                申请已退回，请根据审批意见修改内容后重新提交。
              </p>
            )}
            {change.status === "PENDING" && change.operation === "UPDATE" && (
              <p className="rounded-card bg-primary/5 p-3 text-caption leading-5 text-muted-foreground">
                下方展示本流程关联的数据版本。记录已保存，审批结果仅适用于该版本，不会自动覆盖后续修改。
              </p>
            )}
            {canHandle && (
              <p className="rounded-card bg-primary/5 p-3 text-caption leading-5 text-muted-foreground">
                当前由你办理「{task?.name}」。完成相关工作后，点击“{actionPolicy.approveLabel}”继续流转。
              </p>
            )}
            {taskActions?.dueAt && <p className={`rounded-card p-3 text-caption leading-5 ${Date.parse(taskActions.dueAt) < Date.now() ? "bg-status-warning/10 text-status-warning dark:bg-status-warning/10 dark:text-status-warning" : "bg-muted text-muted-foreground"}`}>处理截止：{dateLabel(taskActions.dueAt)}{Date.parse(taskActions.dueAt) < Date.now() ? " · 已逾期" : ""}</p>}
            {!!taskActions?.delegationDepth && <p className="rounded-card bg-primary/5 p-3 text-caption leading-5 text-muted-foreground">当前为前加签（第 {taskActions.delegationDepth} 层）。同意后交回 {directory.people.find(person => person.id === taskActions.returnToId)?.displayName ?? "原处理人"}，本次同意不会增加并行审批票数。</p>}
            {taskEditable && <p className="rounded-card border border-primary/15 bg-primary/5 p-3 text-caption leading-5 text-muted-foreground">
              你可以修改本节点授权的字段。点击“{actionPolicy.approveLabel}”后，修改保存在当前流程中；整个流程通过后才回填记录，冲突字段保留记录现值。拒绝或退回时不保存本次编辑。
            </p>}
            {taskActions?.stageName && <p className="rounded-card border border-border bg-muted/30 p-3 text-caption leading-5 text-muted-foreground">{taskActions.keyStage ? "关键阶段" : "当前阶段"}：{taskActions.stageName}</p>}
            {editable && (
              <label className="block space-y-2 text-body">
                <span className="font-medium">
                  申请标题 <span className="text-destructive">*</span>
                </span>
                <TextEntry
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={disabled}
                  maxLength={200}
                  className={""}
                  aria-invalid={!!errors._title}
                />
                {errors._title && (
                  <small className="block text-caption text-destructive">
                    {errors._title}
                  </small>
                )}
              </label>
            )}
            {taskEditable && taskSchemas ? <>
              {!!taskSchemas.readSchema.fields.length && <FieldRenderer schema={taskSchemas.readSchema} contextFields={taskSchemas.contextFields} contextValues={taskContextValues} value={change.data} onChange={() => {}} directory={directory} mode={change.operation === "UPDATE" ? "edit" : "create"} fileContext={{ tableId: change.tableId, changeId: change.id, runId: run?.id, recordId: change.recordId }} readOnly />}
              <div className="space-y-4 border-t border-border pt-5">
                <h3 className="text-body font-medium">本节点可编辑</h3>
                <LookupContext.Provider value={{ resolve: (field, values) => values[field.id], pending: () => false, retry: () => {} }}>
                <FieldRenderer
                  schema={taskSchemas.editSchema}
                  contextFields={taskSchemas.contextFields}
                  contextValues={taskContextValues}
                  value={editData}
                  originalValue={editOriginal}
                  onChange={(next) => setData((current) => mergeWorkflowFieldValues(taskSchemas.editSchema, current, next))}
                  directory={directory}
                  mode={change.operation === "UPDATE" ? "edit" : "create"}
                  fileContext={{ tableId: change.tableId, changeId: change.id, runId: run?.id, recordId: change.recordId }}
                  disabled={busy || stale}
                  onUploadingChange={onUploadingChange}
                  onResolvingChange={onResolvingChange}
                  errors={errors}
                />
                </LookupContext.Provider>
              </div>
            </> : <FieldRenderer
              schema={change.schema}
              value={editable ? data : change.data}
              originalValue={change.data}
              onChange={setData}
              directory={directory}
              mode={change.operation === "UPDATE" ? "edit" : "create"}
              fileContext={{ tableId: change.tableId, changeId: change.id, runId: run?.id, recordId: change.recordId }}
              readOnly={!editable}
              disabled={busy || stale}
              onUploadingChange={onUploadingChange}
              onResolvingChange={onResolvingChange}
              errors={errors}
            />}
          </div>
          {(editable ||
            canDecide ||
            (owner &&
              ["DRAFT", "PENDING", "RETURNED"].includes(change.status))) && (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:px-7">
              {owner &&
              ["DRAFT", "PENDING", "RETURNED"].includes(change.status) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => setWithdraw(true)}
                >
                  <RotateCcw size={13} />
                  {change.status === "DRAFT" ? "撤销草稿" : "撤回申请"}
                </Button>
              ) : (
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  {canHandle ? <ClipboardCheck size={14} /> : <ShieldCheck size={14} />}
                  {task?.name}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                {canDecide && taskActions?.allowTransfer && <Button variant="secondary" disabled={disabled} onClick={() => { setError(""); setComment(""); setTargetUser(""); setDecision("TRANSFER"); }}><Forward size={14} />转交</Button>}
                {canDecide && taskActions?.allowAddSign && <Button variant="secondary" disabled={disabled} onClick={() => { setError(""); setComment(""); setTargetUser(""); setDecision("ADD_SIGN"); }}><UserPlus size={14} />前加签</Button>}
                {editable && change.status === "DRAFT" && (
                  <>
                    <Button
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => void save(false)}
                    >
                      <SaveAction running={busy} size={14} />
                      保存草稿
                    </Button>
                    <Button disabled={disabled} onClick={() => void save(true)}>
                      <SendAction running={busy} size={14} />
                      {busy ? "正在提交…" : "提交申请"}
                    </Button>
                  </>
                )}
                {initiatorTask && (
                  <Button disabled={disabled} onClick={resubmit}>
                    <SendAction running={busy} size={14} />
                    {busy ? "正在提交…" : "重新提交"}
                  </Button>
                )}
                {canApprove && (
                  <>
                    {actionPolicy.allowReject && <Button
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => {
                        setError("");
                        setComment("");
                        setSignature(undefined);
                        setDecision("REJECT");
                      }}
                    >
                      {actionPolicy.rejectLabel}
                    </Button>}
                    {actionPolicy.allowReturn && <Button
                      variant="secondary"
                      disabled={disabled || !run?.returnTargets.length}
                      onClick={() => {
                        setError("");
                        setComment("");
                        setTarget(run?.returnTargets[0]?.nodeId ?? "");
                        setDecision("RETURN");
                      }}
                    >
                      <RotateCcw size={14} />
                      {actionPolicy.returnLabel}
                    </Button>}
                    <Button
                      disabled={disabled}
                      onClick={beginApproval}
                    >
                      <Check size={14} />
                      {actionPolicy.approveLabel}
                    </Button>
                  </>
                )}
                {canHandle && (
                  <Button
                    disabled={disabled}
                    onClick={beginApproval}
                  >
                    <ClipboardCheck size={14} />
                    {actionPolicy.approveLabel}
                  </Button>
                )}
              </div>
            </footer>
          )}
        </section>
        <aside className="rounded-control border border-border bg-card p-5">
          {run && change.status !== "SAVED" ? (
            <>{!!run.conflictCount && <p role="status" className="mb-3 rounded-control bg-status-warning/10 p-3 text-caption text-status-warning">{run.conflictCount} 项字段回填发生冲突，当前记录保留已有值。请核对最新记录后处理。</p>}<RunTimeline run={run} directory={directory} /></>
          ) : (
            <>
              <h2 className="mb-3 flex items-center gap-2 text-body font-medium">
                <Clock3 size={15} />
                流转进度
              </h2>
              <p className="text-caption leading-6 text-muted-foreground">
                {["SAVED", "APPROVED"].includes(change.status)
                  ? "记录已保存；各流程的处理结果分别显示。"
                  : change.status === "DRAFT"
                    ? "草稿提交后保存记录，并分别启动匹配的流程。"
                    : "本申请未进入审批流程。"}
              </p>
              {change.runs && <RecordWorkflows runs={change.runs} onRefresh={onRefresh}/>}
            </>
          )}
        </aside>
      </div>
      <AppModal
        open={!!decision}
        onOpenChange={(open) => !busy && !open && setDecision(undefined)}
        dismissible={!busy}
        title={
          decision === "TRANSFER" ? "转交任务" : decision === "ADD_SIGN" ? "发起前加签" : decision === "REMIND" ? "发送催办提醒" : decision === "RETURN"
            ? actionPolicy.returnLabel
            : decision === "REJECT"
              ? actionPolicy.rejectLabel
              : actionPolicy.approveLabel
        }
        description={
          decision === "TRANSFER" ? "将当前任务交给另一位可登录成员，转交后由对方继续处理。" : decision === "ADD_SIGN" ? "加签人先处理，同意后交回你继续审批；并行节点的计票人数不变。" : decision === "REMIND" ? "向当前处理人发送站内提醒。同一申请对同一处理人每小时最多提醒一次。" : decision === "RETURN"
            ? "选择已完成的上游节点，并说明需要调整的内容。"
            : decision === "REJECT"
              ? run?.approvalProgress?.mode === "RACE"
                ? "请说明拒绝原因。抢签在全部成员拒绝后才终止，其他成员仍可继续处理。"
                : run?.approvalProgress?.mode === "VOTE"
                  ? "请说明拒绝原因。投票按所需同意人数判断结果，仍有可能达到比例时会继续等待。"
                  : "请说明拒绝原因，发起人可在操作记录中查看。"
              : canHandle
                ? "确认已完成当前办理工作。提交后流程将交给下一位处理人或结束。"
                : "确认本次申请内容，并提交审批意见。"
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDecision(undefined)}
            >
              取消
            </Button>
            <Button
              disabled={
                disabled ||
                (decision === "REMIND" ? !run?.canRemind || !remindTask : !canDecide) ||
                (!canApprove && !!decision && ["REJECT", "RETURN"].includes(decision)) ||
                (decision === "REJECT" && !actionPolicy.allowReject) ||
                (decision === "RETURN" && !actionPolicy.allowReturn) ||
                (commentRequired && !comment.trim()) ||
                (signatureRequired && !validSignature(signature)) ||
                (assignment && !targetUser) ||
                (decision === "RETURN" && !target)
              }
              onClick={decide}
            >
              {busy ? "正在处理…" : decision === "REMIND" ? "发送提醒" : "确认"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <InlineError
            error={error}
            onRefresh={stale ? onRefresh : undefined}
          />
          {decision === "RETURN" && (
            <FieldSelect
              label="退回到"
              disabled={disabled}
              value={target}
              options={(run?.returnTargets ?? []).map((entry) => ({
                value: entry.nodeId,
                label: entry.nodeName,
              }))}
              onChange={setTarget}
            />
          )}
          {assignment && <FieldSelect label={decision === "TRANSFER" ? "转交给" : "加签人"} disabled={disabled} value={targetUser} options={[{ value: "", label: "请选择一位成员" }, ...targetPeople.map(person => ({ value: person.id, label: person.displayName }))]} onChange={setTargetUser} />}
          {decision === "REMIND" && <FieldSelect label="提醒任务" disabled={disabled} value={remindTask} options={reminderTasks.map(entry => ({ value: entry.taskId, label: `${entry.name} · ${directory.people.filter(person => entry.assigneeId === person.id || !entry.assigneeId && entry.candidateIds.includes(person.id)).map(person => person.displayName).join("、") || "处理人"}` }))} onChange={setRemindTask} />}
          {decision !== "REMIND" && <label className="block space-y-2 text-body">
            <span>
              {decision === "APPROVE" ? `${canHandle ? "办理说明" : "审批意见"}（${commentRequired ? "必填" : "选填"}）` : "原因（必填）"}
            </span>
            <MultilineEntry
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={disabled}
              className={""}
              placeholder={
                decision === "APPROVE"
                  ? canHandle ? "填写办理结果或说明" : "填写审批意见"
                  : "请填写具体原因"
              }
            />
          </label>}
          {signatureRequired && <div className="space-y-2"><p className="text-body">手写签名（必填）</p><SignatureField id="workflow-decision-signature" label="处理意见" value={signature} onChange={setSignature} disabled={disabled} required height={160} /></div>}
        </div>
      </AppModal>
      <AppModal
        open={withdraw}
        onOpenChange={(open) => !busy && setWithdraw(open)}
        dismissible={!busy}
        title={change.status === "DRAFT" ? "撤销草稿？" : "撤回申请？"}
        description={change.status === "DRAFT" ? "撤销尚未提交的草稿。" : "撤回当前流程后，该流程停止流转；已保存的记录和其他流程保持各自状态。"}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setWithdraw(false)}
            >
              取消
            </Button>
            <Button
              disabled={disabled}
              onClick={() =>
                void perform(
                  () =>
                    api<Change>(
                      run ? `${base}/flow-runs/${run.id}/withdraw` : `${base}/changes/${change.id}/withdraw`,
                      "POST",
                      { revision: run?.revision ?? change.revision },
                    ),
                  run ? "当前流程已撤回" : "草稿已撤销",
                )
              }
            >
              {busy ? "正在撤回…" : "确认撤回"}
            </Button>
          </div>
        }
      >
        <InlineError error={error} onRefresh={stale ? onRefresh : undefined} />
        <p className="text-body">{change.title}</p>
      </AppModal>
    </>
  );
}

export function ChangePage() {
  const { changeId } = useParams<{ changeId: string }>();
  const [params] = useSearchParams();
  const runId = params.get("run");
  const loaded = useLoad<Change>(
    changeId ? runId ? `${base}/flow-runs/${encodeURIComponent(runId)}` : `${base}/changes/${encodeURIComponent(changeId)}` : undefined,
  );
  const me = useLoad<{ id: string }>("/api/v1/me");
  const directory = useLoad<Directory>("/api/v1/organization");
  const [success, setSuccess] = useState(""),
    [failure, setFailure] = useState("");
  useEffect(() => {
    setSuccess("");
    setFailure("");
  }, [changeId, runId]);
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mb-6">
        <BackLink to="/workflows">审批中心</BackLink>
      </div>
      {success && (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-card border border-primary/15 bg-primary/5 p-4 text-body"
        >
          <span className="inline-flex text-primary"><Check size={16}  /></span>
          {success}
        </p>
      )}
      {failure && (
        <div className="mb-5">
          <InlineError
            error={failure}
            onRefresh={() => {
              setFailure("");
              loaded.refresh();
            }}
          />
        </div>
      )}
      {loaded.error || !loaded.data || loaded.data.id !== changeId ? (
        <LoadState
          error={loaded.error || (!changeId || loaded.data && loaded.data.id !== changeId ? "申请与流程地址不匹配" : "")}
          retry={loaded.refresh}
        />
      ) : loaded.data.canOpen === false ? (
        <div className="space-y-3 rounded-card border border-border p-5 text-body">
          <p>本次处理已完成。你的节点访问权限已结束，后续内容由当前处理人查看。</p>
          <Link to="/workflows" className="text-primary underline underline-offset-4">返回审批中心</Link>
        </div>
      ) : (
        <>
          {me.error && (
            <div className="mb-5">
              <InlineError
                error="暂时无法确认当前账号，发起人操作可能不可用。"
                onRefresh={me.refresh}
              />
            </div>
          )}
          {directory.error && (
            <p className="mb-4 text-caption text-muted-foreground">
              通讯录暂时不可用，成员信息可能无法完整显示。
              <ActionSurface
                type="button"
                onClick={directory.refresh}
                className="ml-2"
              >
                重试
              </ActionSurface>
            </p>
          )}
          <ChangeContent
            key={`${loaded.data.id}:${loaded.data.run?.id ?? "receipt"}:${loaded.data.revision}:${loaded.data.run?.revision ?? 0}`}
            change={loaded.data}
            meId={me.data?.id}
            directory={directory.data ?? blankDirectory}
            onReplace={loaded.setData}
            onRefresh={loaded.refresh}
            onSuccess={setSuccess}
            onFailure={setFailure}
          />
        </>
      )}
    </div>
  );
}

