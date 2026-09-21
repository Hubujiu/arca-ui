import { ActionSurface } from "@/components/controls";
import { MotionRegion } from "@/shared/design-system/motion/PageMotion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch } from "@/shared/icons/catalog";
import { SaveAction, SendAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { AppModal, Button, FieldSelect, Input } from "@/shared/ui";
import type { Directory } from "../organization/model";
import { BackLink } from "./common";
import { type Table, base, message, useLoad } from "./model";
import { validateWorkflow, initialWorkflow } from "./workflow-model";
import { WorkflowDesigner } from "./WorkflowDesigner";
import {
  approvalTriggerLabels,
  approvalTriggerSummary,
  defaultApprovalTrigger,
  normalizeApprovalDefinition,
  type ApprovalDefinition,
  type ApprovalTrigger,
  type ApprovalTriggerType,
  type ApprovalWorkflowDraft,
} from "./approval-definitions";

export function ApprovalWorkspace({ table, directory }: { table: Table; directory: Directory }) {
  const definitions = useLoad<ApprovalDefinition[]>(`${base}/tables/${table.id}/flows`);
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selected && definitions.data?.length) setSelected(definitions.data[0].id);
  }, [definitions.data, selected]);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const draft: ApprovalWorkflowDraft = { ...initialWorkflow(), trigger: defaultApprovalTrigger() };
      const result = await api<ApprovalDefinition>(`${base}/tables/${table.id}/flows`, "POST", { name: name.trim(), draft });
      setSelected(result.id);
      setName("");
      setCreating(false);
      definitions.refresh();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return <div className="w-full min-w-0 px-4 py-5 sm:px-7" onClickCapture={event => {
    if (dirty && (event.target as Element).closest("a")) {
      event.preventDefault();
      setError("请先保存或撤销当前草稿再离开。");
    }
  }}>
    <BackLink to={`/apps/${table.appId}?table=${table.id}`}>返回 {table.name}</BackLink>
    <header data-dw-enter="header" className="my-5 flex flex-wrap items-center gap-3">
      <div className="min-w-0 w-full flex-none sm:w-auto sm:flex-1">
        <h1 className="flex items-center gap-2 text-title font-medium"><GitBranch size={21} />审批流程 <span className="text-body font-normal text-muted-foreground">{table.name}</span></h1>
        <p className="mt-2 text-caption text-muted-foreground">同一记录事件可匹配多条已启用流程；每条流程独立保存审批结果。</p>
      </div>
      <Button onClick={() => { if (dirty) { setError("请先保存或撤销当前草稿再新建。"); return; } setCreating(true); setError(""); }}>新建审批流程</Button>
    </header>
    <nav aria-label="设计器切换" className="mb-5 flex gap-5 border-b border-border pb-3 text-body">
      <Link to={`/apps/${table.appId}/tables/${table.id}/design`} className="text-muted-foreground">表单设计</Link>
      <span aria-current="page" className="font-medium text-primary">审批流程</span>
      <Link to={`/apps/${table.appId}/tables/${table.id}/design?panel=automation`} className="text-muted-foreground">自动化</Link>
    </nav>
    {error && !creating && <p role="alert" className="mb-4 rounded-card border border-destructive/20 bg-destructive/5 px-4 py-3 text-body text-destructive">{error}</p>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-application-navigation">
      <aside data-dw-enter="rail" className="space-y-2" aria-label="审批流程列表">
        {definitions.loading ? <p className="text-body text-muted-foreground">正在读取审批流程…</p> : definitions.error ? <p role="alert" className="text-body text-destructive">{definitions.error}</p> : !definitions.data?.length ? <p className="rounded-card border border-dashed border-border p-4 text-body text-muted-foreground">尚无审批流程。新建后可分别配置触发方式和审批节点。</p> : definitions.data.map(item => {
          const definition = normalizeApprovalDefinition(item);
          return <ActionSurface active={selected === definition.id} key={definition.id} type="button" onClick={() => {
            if (dirty && selected !== definition.id) { setError("请先保存或撤销当前草稿再切换。"); return; }
            setSelected(definition.id); setError("");
          }} className="block w-full text-left">
            <span className="block break-words text-body font-medium">{definition.name}</span>
            <small className="mt-1 block text-caption text-muted-foreground">{definition.enabled ? "已启用" : "已停用"} · {approvalTriggerSummary(definition.trigger)}</small>
            <small className="mt-1 block text-caption text-muted-foreground">{definition.publishedVersionId ? `已发布 V${definition.publishedVersion?.version ?? ""}` : "仅草稿"}</small>
          </ActionSurface>;
        })}
        <Button size="sm" variant="ghost" onClick={definitions.refresh}>刷新列表</Button>
      </aside>
      <MotionRegion motionKey={selected} kind="inspector">{selected ? <ApprovalEditor key={selected} id={selected} table={table} directory={directory} onDirty={setDirty} onSaved={definitions.refresh} /> : <div className="rounded-card border border-dashed border-border p-8 text-body text-muted-foreground">选择一条审批流程查看画布。</div>}</MotionRegion>
    </div>
    <AppModal open={creating} onOpenChange={open => { if (!busy) setCreating(open); }} title="新建审批流程" description="新流程默认在新增记录时触发，发布后仍需手动启用。" footer={<Button disabled={busy || !name.trim()} onClick={() => void create()}>{busy ? "正在创建…" : "创建草稿"}</Button>}>
      <Input label="流程名称" value={name} maxLength={128} onChange={setName} />
      {error && <p role="alert" className="mt-3 text-body text-destructive">{error}</p>}
    </AppModal>
  </div>;
}

function ApprovalEditor({ id, table, directory, onDirty, onSaved }: { id: string; table: Table; directory: Directory; onDirty: (dirty: boolean) => void; onSaved: () => void }) {
  const detail = useLoad<ApprovalDefinition>(`${base}/flows/${id}`);
  if (!detail.data) return <div><p className="text-body text-muted-foreground">{detail.error || "正在读取流程定义…"}</p><Button size="sm" variant="ghost" onClick={detail.refresh}>重新读取</Button></div>;
  return <ApprovalEditorBody initial={normalizeApprovalDefinition(detail.data)} table={table} directory={directory} onDirty={onDirty} onSaved={onSaved} />;
}

function ApprovalEditorBody({ initial, table, directory, onDirty, onSaved }: { initial: ApprovalDefinition; table: Table; directory: Directory; onDirty: (dirty: boolean) => void; onSaved: () => void }) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [draft, setDraft] = useState<ApprovalWorkflowDraft>(initial.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [webhookToken, setWebhookToken] = useState<string>();
  const dirty = name !== saved.name || JSON.stringify(draft) !== JSON.stringify(saved.draft);
  const schema = table.publishedVersion?.schema ?? table.draft;
  const dateFields = useMemo(() => (schema?.fields ?? []).filter(field => field.type === "date" || field.type === "datetime"), [schema]);
  const issues = schema ? validateWorkflow(draft.tree, schema, directory) : [];

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function reload() {
    const next = normalizeApprovalDefinition(await api<ApprovalDefinition>(`${base}/flows/${saved.id}`));
    setSaved(next); setName(next.name); setDraft(next.draft); onSaved(); return next;
  }
  async function save(publish = false) {
    if (!name.trim()) { setError("请填写流程名称"); return; }
    if (publish && !table.publishedVersion) { setError("请先发布表单，再发布流程"); return; }
    if (publish && issues.length) { setError(issues[0].message); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      let current = saved;
      if (dirty) {
        await api(`${base}/flows/${saved.id}`, "PUT", { revision: saved.revision, name: name.trim(), draft });
        current = await reload();
      }
      if (publish) {
        await api(`${base}/flows/${saved.id}/publish`, "POST", { revision: current.revision });
        await reload();
      }
      setNotice(publish ? "已发布。启用后，符合触发方式的新事件会独立启动此流程。" : "草稿已保存");
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  async function toggle() {
    if (dirty) { setError("请先保存草稿再更改启用状态。"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`${base}/flows/${saved.id}/enabled`, "POST", { revision: saved.revision, enabled: !saved.enabled });
      await reload();
      setNotice(saved.enabled ? "流程已停用" : "流程已启用");
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  async function rotateWebhookToken() {
    if (dirty) { setError("请先保存草稿再生成 Webhook 凭据。"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<{ token: string; revision: number; webhookConfigured: boolean }>(`${base}/flows/${saved.id}/webhook-token`, "POST", { revision: saved.revision });
      setWebhookToken(result.token);
      await reload();
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  function setTrigger(type: ApprovalTriggerType) {
    if (type === "RECORD") return;
    const next: ApprovalTrigger = type === "SCHEDULE" ? { type, intervalMinutes: 60, scope: "ALL_READABLE", maxRecords: 50 } : type === "DATE_FIELD" ? { type, dateFieldId: dateFields[0]?.id ?? "", offsetMinutes: 0, scope: "ALL_READABLE", maxRecords: 50 } : { type };
    setDraft(value => ({ ...value, trigger: next, onCreate: type === "CREATE", onUpdate: type === "UPDATE" }));
  }
  const liveTrigger = saved.publishedVersion?.trigger ?? saved.trigger;
  return <section className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-center gap-2">
      <h2 className="min-w-0 w-full flex-none break-words text-title font-medium sm:w-auto sm:flex-1">{saved.name}</h2>
      <span role="status" className="text-caption text-muted-foreground">{dirty ? "有未保存修改" : saved.publishedVersionId ? "已有发布版本" : "未发布"}</span>
      <Button size="sm" variant="secondary" disabled={busy || !dirty} onClick={() => void save()}><SaveAction running={busy} size={14} />保存草稿</Button>
      <Button size="sm" variant="ghost" disabled={busy || !dirty} onClick={() => { setName(saved.name); setDraft(saved.draft); setError(""); }}>撤销修改</Button>
      <Button size="sm" disabled={busy} onClick={() => void save(true)}><SendAction running={busy} size={14} />发布</Button>
      <Button size="sm" variant="outline" disabled={busy || dirty || !saved.publishedVersionId} onClick={() => void toggle()}>{saved.enabled ? "停用" : "启用"}</Button>
    </header>
    {error && <p role="alert" className="rounded-card border border-destructive/20 bg-destructive/5 px-4 py-3 text-body text-destructive">{error}</p>}
    {notice && <p role="status" className="text-caption text-muted-foreground">{notice}</p>}
    <div className="grid gap-4 rounded-card border border-border p-4 md:grid-cols-2">
      <Input label="流程名称" value={name} maxLength={128} disabled={busy} onChange={setName} />
      <FieldSelect label="草稿触发方式" value={draft.trigger.type} disabled={busy} options={(Object.keys(approvalTriggerLabels) as ApprovalTriggerType[]).map(value => ({ value, label: approvalTriggerLabels[value], disabled: value === "RECORD" }))} onChange={value => setTrigger(value as ApprovalTriggerType)} />
      {draft.trigger.type === "SCHEDULE" && <><Input label="执行间隔（分钟）" type="number" min={1} max={525600} disabled={busy} value={String(draft.trigger.intervalMinutes)} onChange={value => setDraft(current => ({ ...current, trigger: { ...current.trigger, intervalMinutes: Math.max(1, Math.min(525600, Number(value) || 1)) } as ApprovalTrigger }))} /><Input label="每次最多处理记录数" type="number" min={1} max={50} disabled={busy} value={String(draft.trigger.maxRecords)} onChange={value => setDraft(current => ({ ...current, trigger: { ...current.trigger, maxRecords: Math.max(1, Math.min(50, Number(value) || 1)) } as ApprovalTrigger }))} /></>}
      {draft.trigger.type === "DATE_FIELD" && <><FieldSelect label="日期字段" value={draft.trigger.dateFieldId} disabled={busy} options={dateFields.map(field => ({ value: field.id, label: field.label }))} onChange={dateFieldId => setDraft(current => ({ ...current, trigger: { ...current.trigger, dateFieldId } as ApprovalTrigger }))} /><Input label="时间偏移（分钟，负数提前）" type="number" min={-525600} max={525600} disabled={busy} value={String(draft.trigger.offsetMinutes ?? 0)} onChange={value => setDraft(current => ({ ...current, trigger: { ...current.trigger, offsetMinutes: Math.max(-525600, Math.min(525600, Number(value) || 0)) } as ApprovalTrigger }))} /><Input label="每次最多处理记录数" type="number" min={1} max={50} disabled={busy} value={String(draft.trigger.maxRecords)} onChange={value => setDraft(current => ({ ...current, trigger: { ...current.trigger, maxRecords: Math.max(1, Math.min(50, Number(value) || 1)) } as ApprovalTrigger }))} /></>}
      {draft.trigger.type === "WEBHOOK" && <div className="space-y-2 md:col-span-2"><Button size="sm" variant="outline" disabled={busy || dirty || liveTrigger?.type !== "WEBHOOK"} onClick={() => void rotateWebhookToken()}>{saved.webhookConfigured ? "轮换 Webhook 凭据" : "生成 Webhook 凭据"}</Button><p className="text-caption leading-5 text-muted-foreground">仅已发布的 Webhook 触发方式可生成凭据。凭据只显示一次；轮换后旧凭据立即失效。</p>{liveTrigger?.type !== "WEBHOOK" && <p className="text-caption text-muted-foreground">请保存并发布此触发方式后再生成凭据。</p>}</div>}
      {draft.trigger.type === "RECORD" && <p className="md:col-span-2 rounded-control bg-status-warning/5 px-3 py-2 text-caption leading-5 text-status-warning">这是旧版“新增和修改均触发”的兼容配置。请选择“新增记录时”或“修改记录时”后保存，才能转换为单一命名流程触发方式。</p>}
      <p className="md:col-span-2 text-caption leading-5 text-muted-foreground">已发布触发方式：{saved.publishedVersionId ? approvalTriggerSummary(liveTrigger) : "尚未发布"}。草稿修改不会影响正在运行或已启动的审批。</p>
    </div>
    {!schema && <p role="alert" className="rounded-card border border-status-warning/25 bg-status-warning/5 p-3 text-body text-status-warning">请先保存并发布表单字段，才能配置和发布审批节点。</p>}
    {schema && <WorkflowDesigner value={draft} onChange={value => setDraft(current => ({ ...value, trigger: current.trigger }))} schema={schema} directory={directory} disabled={busy} showLegacyTriggers={false} />}
    <p className="text-caption leading-6 text-muted-foreground">发布版本固定审批路径和触发方式。流程启用后会与其他符合条件的流程分别运行；停用不会删除既有审批记录。</p>
    <AppModal open={Boolean(webhookToken)} onOpenChange={open => { if (!open) setWebhookToken(undefined); }} title="保存 Webhook 凭据" description="凭据只在此处显示一次。关闭后需重新轮换才能取得新凭据。"><Input label="Webhook 地址" readOnly value={`${window.location.origin}${base}/approval-webhook?flowId=${saved.id}`} /><Input label="Bearer 凭据" readOnly value={webhookToken ?? ""} /><p className="text-caption leading-5 text-muted-foreground">请求需带 Authorization: Bearer 凭据和 UUID 格式的 Idempotency-Key。不要把凭据放入地址或日志。</p><div className="space-y-2"><p className="text-body font-medium">JSON 请求体</p><pre className="overflow-x-auto rounded-control bg-muted p-3 text-caption">{`{\n  "recordId": "记录ID",\n  "revision": 记录修订号\n}`}</pre><p className="text-caption leading-5 text-muted-foreground">服务端会锁定此记录修订号；它不是流程定义修订号。记录更新后，请读取并提交新的记录修订号。</p></div></AppModal>
  </section>;
}
