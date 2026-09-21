import { Link, useSearchParams } from "react-router-dom";
import { AnimatedBadge, type AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import { RefreshAction, ArrowRightAction } from "@/shared/icons/motion";
import { Button, EmptyState } from "@/shared/ui";
import {
  dateLabel,
  statusNames,
  useResource,
  type SubmissionRow,
} from "./model";

const STATUS_TONE: Record<keyof typeof statusNames, AnimatedBadgeStatus> = {
  DRAFT: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
  PUBLISHED: "info",
  ARCHIVED: "neutral",
};

export function StatusBadge({ status }: { status: keyof typeof statusNames }) {
  return (
    <AnimatedBadge status={STATUS_TONE[status] || "neutral"} size="sm">
      {statusNames[status]}
    </AnimatedBadge>
  );
}
export function ApprovalsPage({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams();
  const view = mine
    ? "mine"
    : params.get("view") === "handled"
      ? "handled"
      : "pending";
  const rawOffset = Number(params.get("offset") || 0),
    offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const { data, error, reload } = useResource<SubmissionRow[]>(
    `/api/v1/form-submissions?view=${view}&offset=${offset}`,
  );
  const rows = data?.slice(0, 50);
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title font-medium">
            {mine ? "我的申请" : "审批工作台"}
          </h2>
          <p className="mt-1 text-body text-ui-muted">
            {mine
              ? "继续填写草稿，或跟进已提交的申请。"
              : "查看分配给你的审批，保留每一次处理记录。"}
          </p>
        </div>
        <Button variant="secondary" onClick={reload}>
          <RefreshAction running={!data && !error} size={15} />
          刷新
        </Button>
      </div>
      {!mine && (
        <div className="flex gap-2">
          <Button
            variant={view === "pending" ? "primary" : "secondary"}
            onClick={() => setParams({ view: "pending" })}
          >
            待我审批
          </Button>
          <Button
            variant={view === "handled" ? "primary" : "secondary"}
            onClick={() => setParams({ view: "handled" })}
          >
            我已处理
          </Button>
        </div>
      )}
      {error ? (
        <EmptyState title={error}>
          <Button onClick={reload}>重试</Button>
        </EmptyState>
      ) : !rows ? (
        <EmptyState loading title="正在加载申请…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            mine
              ? "还没有申请"
              : view === "pending"
                ? "当前没有待办审批"
                : "还没有处理记录"
          }
        >
          {mine ? (
            <Link to="/forms" className="text-body underline underline-offset-4">
              发起第一份申请
            </Link>
          ) : (
            <p className="text-body text-ui-muted">
              新的审批任务会出现在这里。
            </p>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-card border border-ui-border bg-ui-surface shadow-tactile">
          {rows.map((row) => (
            <Link
              to={`/approvals/${row.id}`}
              key={row.id}
              className="flex items-center gap-4 border-b border-ui-border px-5 py-4 last:border-0 hover:bg-ui-ground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-body font-medium">{row.title}</h3>
                <p className="mt-1 truncate text-caption text-ui-muted">
                  {row.formName} · v{row.version} · {row.creatorName} · {dateLabel(row.createdAt)}
                </p>
              </div>
              <StatusBadge status={row.status} />
              <ArrowRightAction size={16} />
            </Link>
          ))}
        </div>
      )}
      {data && (offset > 0 || data.length > 50) && (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() =>
              setParams({ view, offset: String(Math.max(0, offset - 50)) })
            }
          >
            上一页
          </Button>
          <Button
            variant="secondary"
            disabled={data.length <= 50}
            onClick={() => setParams({ view, offset: String(offset + 50) })}
          >
            下一页
          </Button>
        </div>
      )}
    </section>
  );
}
