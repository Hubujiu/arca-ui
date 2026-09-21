import { MultilineEntry } from "@/components/controls";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { Check, ChevronDown, X } from "@/shared/icons/catalog";
import { SaveAction, SendAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { AppModal, Button, EmptyState, Input } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { FormRenderer } from "./FormRenderer";
import { StatusBadge } from "./ApprovalsPage";
import {
  dateLabel,
  type Definition,
  type FormVersion,
  type Submission,
  type Values,
} from "./model";

const validator = new Ajv2020({ allErrors: true });
addFormats(validator);
const actionNames = {
  SUBMIT: "提交申请",
  APPROVE: "通过",
  REJECT: "驳回",
  WITHDRAW: "撤回申请",
};
export function SubmissionPage() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState<FormVersion>(),
    [submission, setSubmission] = useState<Submission>(),
    [values, setValues] = useState<Values>({}),
    [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [attempt, setAttempt] = useState(0);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | "WITHDRAW">(),
    [comment, setComment] = useState(""),
    [decisionError, setDecisionError] = useState("");
  const requestKey = useRef(crypto.randomUUID()),
    saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setFieldErrors({});
    setSubmission(undefined);
    setVersion(undefined);
    requestKey.current = crypto.randomUUID();
    const promise = submissionId
      ? api<Submission>(
          `/api/v1/form-submissions/${submissionId}`,
          "GET",
          undefined,
          controller.signal,
        )
      : api<Definition>(
          `/api/v1/forms/${formId}`,
          "GET",
          undefined,
          controller.signal,
        );
    promise
      .then((result) => {
        if (controller.signal.aborted) return;
        if ("formVersion" in result) {
          setSubmission(result);
          setVersion(result.formVersion);
          setValues(result.data);
          setTitle(result.title);
        } else {
          setVersion(result.publishedVersion);
          setValues({});
          setTitle(result.publishedVersion?.name || result.name);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [formId, submissionId, attempt]);
  const editable = !submission || submission.canEdit;
  function validate() {
    if (!version) return false;
    const check = validator.compile(version.dataSchema);
    if (check(values)) {
      setFieldErrors({});
      return true;
    }
    const errors: Record<string, string> = {};
    for (const e of check.errors ?? []) {
      const id =
        e.keyword === "required"
          ? String(e.params.missingProperty)
          : e.instancePath.slice(1);
      errors[id] =
        e.keyword === "required" ||
        e.keyword === "minLength" ||
        e.keyword === "pattern"
          ? "请填写此项"
          : e.keyword === "minimum" || e.keyword === "maximum"
            ? "数值超出允许范围"
            : "请检查填写格式或选项";
    }
    setFieldErrors(errors);
    setError("请检查标记的字段后再提交");
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
    return false;
  }
  async function save(send: boolean) {
    if (!version || saving.current) return;
    setError("");
    if (!title.trim()) {
      setError("请填写申请标题");
      return;
    }
    if (send && !validate()) return;
    saving.current = true;
    setBusy(true);
    try {
      let result = submission
        ? await api<Submission>(
            `/api/v1/form-submissions/${submission.id}`,
            "PUT",
            { revision: submission.revision, title, data: values },
          )
        : await api<Submission>(`/api/v1/forms/${formId}/submissions`, "POST", {
            formVersionId: version.id,
            requestKey: requestKey.current,
            title,
            data: values,
          });
      setSubmission(result);
      if (send) {
        result = await api<Submission>(
          `/api/v1/form-submissions/${result.id}/submit`,
          "POST",
          { revision: result.revision },
        );
        setSubmission(result);
      }
      toast.success(send ? "申请已提交" : "草稿已保存");
      if (!submissionId) navigate(`/approvals/${result.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function decide() {
    if (!submission || !decision || saving.current) return;
    if (decision === "REJECT" && !comment.trim()) {
      setDecisionError("请填写驳回原因");
      return;
    }
    saving.current = true;
    setBusy(true);
    setDecisionError("");
    try {
      const path =
        decision === "WITHDRAW"
          ? `/api/v1/form-submissions/${submission.id}/withdraw`
          : `/api/v1/form-submissions/${submission.id}/tasks/${submission.myTaskId}`;
      const result = await api<Submission>(
        path,
        "POST",
        decision === "WITHDRAW" ? undefined : { action: decision, comment },
      );
      setSubmission(result);
      setDecision(undefined);
      setComment("");
      toast.success(decision === "WITHDRAW" ? "申请已撤回" : "审批已处理");
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : "处理失败");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (loading) return <EmptyState loading title="正在加载申请…" />;
  if (!version)
    return (
      <EmptyState title={error || "表单尚未发布"}>
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          重新加载
        </Button>
        <Link to="/forms">返回申请中心</Link>
      </EmptyState>
    );
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={submission ? "/approvals/mine" : "/forms"}
            className="text-caption text-muted-foreground"
          >
            ← {submission ? "我的申请" : "选择表单"}
          </Link>
          <h2 className="mt-2 text-title font-medium">
            {submission?.title || version.name}
          </h2>
          <p className="mt-2 text-body text-muted-foreground">
            {version.name} · v{version.version}
            {submission
              ? ` · ${submission.creatorName} · ${dateLabel(submission.createdAt)}`
              : ""}
          </p>
        </div>
        {submission && <StatusBadge status={submission.status} />}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-card border border-destructive/30 bg-destructive/5 p-3 text-body text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-form-inspector">
        <div className="rounded-control border border-border bg-card p-5 sm:p-7">
          {version.description && (
            <p className="mb-6 whitespace-pre-wrap text-body leading-6 text-muted-foreground">
              {version.description}
            </p>
          )}
          <fieldset disabled={busy} className="flex flex-col gap-6">
            {editable && (
              <Input
                label="申请标题"
                maxLength={200}
                value={title}
                onChange={setTitle}
              />
            )}
            <FormRenderer
              fields={version.uiSchema.fields}
              value={values}
              onChange={setValues}
              errors={fieldErrors}
              readOnly={!editable}
            />
          </fieldset>
          <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5">
            {editable ? (
              <>
                <Button disabled={busy} onClick={() => void save(true)}>
                  <SendAction running={busy} size={15} />
                  {busy ? "处理中…" : "提交申请"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void save(false)}
                >
                  <SaveAction running={busy} size={15} />
                  保存草稿
                </Button>
              </>
            ) : (
              <>
                {submission?.myTaskId && (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setDecision("APPROVE");
                        setDecisionError("");
                      }}
                    >
                      <Check size={16} />
                      同意
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setDecision("REJECT");
                        setDecisionError("");
                      }}
                    >
                      <X size={16} />
                      驳回
                    </Button>
                  </>
                )}
                {submission?.canWithdraw && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setDecision("WITHDRAW");
                      setDecisionError("");
                    }}
                  >
                    撤回申请
                  </Button>
                )}
                {!submission?.myTaskId && !submission?.canWithdraw && (
                  <p className="text-caption text-muted-foreground">
                    {submission?.status === "PENDING"
                      ? "等待当前审批人处理。"
                      : "申请已结束，填写内容和处理记录已归档。"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-control border border-border bg-card p-5">
            <h3 className="mb-4 text-body font-medium">审批流程</h3>
            <p className="mb-3 text-caption text-muted-foreground">申请人提交</p>
            {version.workflowSchema.steps.map((step, i) => {
              const active = submission?.tasks.some(
                (t) => t.stepId === `step${step.id}`,
              );
              return (
                <div key={step.id}>
                  <span className="inline-flex mb-2 text-muted-foreground"><ChevronDown
                    size={14}

                  /></span>
                  <div
                    className={`mb-3 rounded-card border px-3 py-3 ${active ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="text-body">
                      {i + 1}. {step.name}
                      {active && (
                        <span className="ml-2 text-caption text-muted-foreground">
                          待处理
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {step.approverName || "指定审批人"}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="text-caption text-muted-foreground">全部通过后完成</p>
          </div>
          {submission && (
            <div className="rounded-control border border-border bg-card p-5">
              <h3 className="mb-4 text-body font-medium">处理记录</h3>
              {submission.history.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  保存草稿后，提交即可开始审批。
                </p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {submission.history.map((item) => (
                    <li key={item.id} className="border-l-2 border-border pl-3">
                      <p className="text-body">
                        {item.actorName} · {actionNames[item.action]}
                      </p>
                      <p className="mt-1 text-caption text-muted-foreground">
                        {item.stepName} · {dateLabel(item.createdAt)}
                      </p>
                      {item.comment && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-body leading-6">
                          {item.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </aside>
      </div>
      <AppModal
        open={!!decision}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDecision(undefined);
            setComment("");
          }
        }}
        dismissible={!busy}
        title={
          decision === "APPROVE"
            ? "同意这份申请"
            : decision === "REJECT"
              ? "驳回这份申请"
              : "撤回这份申请"
        }
        description={
          decision === "WITHDRAW"
            ? "撤回后流程结束，已有处理记录会保留。"
            : "处理结果和意见将保存在申请记录中。"
        }
        footer={
          <Button disabled={busy} onClick={() => void decide()}>
            {busy ? "处理中…" : "确认"}
          </Button>
        }
      >
        {decision !== "WITHDRAW" && (
          <label className="text-body">
            {decision === "REJECT" ? "驳回原因（必填）" : "审批意见（可选）"}
            <MultilineEntry
              autoFocus
              rows={4}
              maxLength={2000}
              className={`${""} mt-2`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
        )}
        {decisionError && (
          <p role="alert" className="mt-2 text-body text-destructive">
            {decisionError}
          </p>
        )}
      </AppModal>
    </section>
  );
}
