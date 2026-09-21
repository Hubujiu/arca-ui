import { MotionRegion } from "@/shared/design-system/motion/PageMotion";
import { FieldEventSettings } from "./FieldEventSettings";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, FilePenLine, GitBranch, Zap } from "@/shared/icons/catalog";
import { SaveAction, SendAction } from "@/shared/icons/motion";
import { api, ApiError } from "@/shared/api/client";
import { Button } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { cn } from "@/lib/utils";
import type { Directory } from "../organization/model";
import { clarifySchemaRejection, upgradeIdentityFields, validateFieldConfigs } from "./field-model";
import { FieldDesigner } from "./FieldDesigner";
import { RecordPresentationSettings } from "./RecordPresentationSettings";
import { FormLayoutSettings } from "./FormLayoutSettings";
const WorkflowDesigner = lazy(() =>
  import("./WorkflowDesigner").then((m) => ({ default: m.WorkflowDesigner })),
);
const AutomationWorkspace=lazy(()=>import("./AutomationWorkspace").then(module=>({default:module.AutomationWorkspace})));
const ApprovalWorkspace=lazy(()=>import("./ApprovalWorkspace").then(module=>({default:module.ApprovalWorkspace})));
import { validateWorkflow } from "./workflow-model";
import { BackLink, LoadState } from "./common";
import { base, message, useLoad, type Flow, type Table } from "./model";

export function TableDesignerPage({
  workflow = false,
}: {
  workflow?: boolean;
}) {
  const { appId, tableId } = useParams();
  const [search]=useSearchParams();
  const table = useLoad<Table>(`${base}/tables/${tableId}?manage=true`);
  const directory = useLoad<Directory>("/api/v1/organization");
  if (
    table.loading ||
    directory.loading ||
    !table.data ||
    !directory.data
  )
    return (
      <LoadState
        error={table.error || directory.error}
        retry={() => {
          table.refresh();
          directory.refresh();
        }}
      />
    );
  if (table.data.appId !== appId)
    return <LoadState error="数据表不属于当前应用" retry={table.refresh} />;
  if (workflow) return <Suspense fallback={<LoadState title="正在打开审批流程…" retry={table.refresh}/>}><ApprovalWorkspace table={table.data} directory={directory.data}/></Suspense>;
  if(!workflow&&search.get("panel")==="automation")return <Suspense fallback={<LoadState title="正在打开自动化…" retry={table.refresh}/>}><AutomationWorkspace table={table.data} directory={directory.data}/></Suspense>;
  return (
    <MotionRegion><Designer
      key={`${tableId}-${workflow}`}
      table={table.data}
      directory={directory.data}
      workflow={false}
    /></MotionRegion>
  );
}
function Designer({
  table: initial,
  flow: initialFlow,
  directory,
  workflow,
}: {
  table: Table;
  flow?: Flow;
  directory: Directory;
  workflow: boolean;
}) {
  const [table, setTable] = useState(initial);
  const [flow, setFlow] = useState(initialFlow);
  const [draft, setDraft] = useState(() => upgradeIdentityFields(initial.draft!));
  const [flowDraft, setFlowDraft] = useState(initialFlow?.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const dirty = workflow
    ? JSON.stringify(flowDraft) !== JSON.stringify(flow?.draft)
    : JSON.stringify(draft) !== JSON.stringify(table.draft);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  async function save(publish: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      if (workflow) {
        if (!flowDraft || !flow) return;
        if (publish && !table.publishedVersion)
          throw new Error("请先发布表单，再发布流程");
        if (publish) {
          const issues = validateWorkflow(
            flowDraft.tree,
            table.publishedVersion!.schema,
            directory,
          );
          if (issues.length) throw new Error(issues[0].message);
        }
        let saved =
          dirty || flow.revision === 0
            ? await api<Flow>(`${base}/tables/${table.id}/flow`, "PUT", {
                revision: flow.revision,
                draft: flowDraft,
              })
            : flow;
        setFlow(saved);
        setFlowDraft(saved.draft);
        if (publish) {
          saved = await api<Flow>(
            `${base}/tables/${table.id}/flow/publish`,
            "POST",
            { revision: saved.revision },
          );
          setFlow(saved);
          setFlowDraft(saved.draft);
        }
      } else {
        const configError = Object.values(validateFieldConfigs(draft))[0];
        if (configError) throw new Error(configError);
        let saved = dirty
          ? await api<Table>(`${base}/tables/${table.id}`, "PUT", {
              revision: table.revision,
              draft,
            })
          : table;
        setTable(saved);
        setDraft(upgradeIdentityFields(saved.draft!));
        if (publish) {
          saved = await api<Table>(
            `${base}/tables/${table.id}/publish`,
            "POST",
            { revision: saved.revision },
          );
          setTable(saved);
          setDraft(upgradeIdentityFields(saved.draft!));
        }
      }
      toast.success(publish ? "已发布，新提交将使用此版本" : "草稿已保存");
    } catch (e) {
      const raw = message(e);
      setError(workflow || !draft ? raw : clarifySchemaRejection(draft, raw));
      setConflict(e instanceof ApiError && e.status === 409);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full min-w-0 px-4 py-5 sm:px-7" onClickCapture={(event) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (dirty && link && link.target !== "_blank" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setError("请先保存草稿，再离开编辑器。");
      }
    }}>
      <BackLink to={`/apps/${table.appId}?table=${table.id}`}>
        返回 {table.name}
      </BackLink>
      <header data-dw-enter="header" className="my-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-title font-medium">
            {workflow ? <GitBranch size={21} /> : <FilePenLine size={21} />}
            {workflow ? "审批流程" : "表单设计"}
            <span className="ml-2 text-body font-normal text-muted-foreground">
              {table.name}
            </span>
          </h1>
          <p className="mt-2 text-caption text-muted-foreground">
            {workflow
              ? "配置触发时机、条件分支与节点处理人。"
              : "添加字段，调整布局，预览填写体验。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className="mr-2 flex items-center gap-1.5 text-caption text-muted-foreground"
          >
            {dirty ? (
              <>
                <span className="size-1.5 rounded-full bg-warning" />
                有未保存修改
              </>
            ) : (
              <>
                <Check size={13} />
                {workflow
                  ? flow?.publishedVersionId
                    ? "已有发布版本"
                    : "未发布"
                  : table.publishedVersion
                    ? `已发布 V${table.publishedVersion.version}`
                    : "未发布"}
              </>
            )}
          </span>
          <Button
            variant="secondary"
            disabled={busy || (!dirty && (!workflow || flow?.revision !== 0))}
            onClick={() => void save(false)}
          >
            <SaveAction running={busy} size={15} />
            保存草稿
          </Button>
          <Button disabled={busy} onClick={() => void save(true)}>
            <SendAction running={busy} size={15} />
            {busy ? "处理中…" : "发布"}
          </Button>
        </div>
      </header>
      <nav
        className="mb-5 flex gap-5 border-b border-border text-body"
        aria-label="设计器切换"
      >
        {[
          { type: "design", label: "表单设计", active: !workflow, icon: FilePenLine },
          { type: "workflow", label: "审批流程", active: workflow, icon: GitBranch },
          { type: "design?panel=automation", label: "自动化", active: false, icon: Zap },
        ].map((item) => (
          <Link
            key={item.type}
            to={`/apps/${table.appId}/tables/${table.id}/${item.type}`}
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setError("请先保存草稿，再切换设计器");
              }
            }}
            className={cn(
              "flex items-center gap-2 border-b-2 px-1 pb-3",
              item.active ? "border-primary text-primary" : "border-transparent text-muted-foreground",
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-destructive/20 bg-destructive/5 px-4 py-3 text-body text-destructive">
          <span>{error}</span>
          {conflict && <Button variant="secondary" size="sm" onClick={() => location.reload()}>重新载入最新版本</Button>}
        </div>
      )}
      {workflow && flowDraft ? (
        <>
          <Suspense fallback={<LoadState title="正在打开流程画布…" retry={() => location.reload()} />}>
            <WorkflowDesigner value={flowDraft} onChange={setFlowDraft} schema={table.publishedVersion?.schema || draft} directory={directory} disabled={busy} />
          </Suspense>
          <p className="mt-4 text-caption leading-6 text-muted-foreground">发布后仅影响新提交的审批。审批人可以退回到当前有效路径上已完成的上游节点；退回发起人后可修改内容并重新选择条件分支。</p>
        </>
      ) : (
        <>
          <RecordPresentationSettings schema={draft} onChange={setDraft} disabled={busy}/>
          <FormLayoutSettings schema={draft} onChange={setDraft} disabled={busy}/>
          <FieldEventSettings schema={draft} onChange={setDraft} appId={table.appId} disabled={busy}/>
          <FieldDesigner fileContext={{ tableId: table.id, design: true }} value={draft} onChange={setDraft} directory={directory} disabled={busy} />
        </>
      )}
    </div>
  );
}
