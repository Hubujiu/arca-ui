import { ActionSurface, MultilineEntry, TextEntry } from "@/components/controls";
import { MotionRegion } from "@/shared/design-system/motion/PageMotion";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
} from "@/shared/icons/catalog";
import { EyeAction, PlusAction, SaveAction, SendAction, TrashAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { Button, EmptyState, Input, AppModal } from "@/shared/ui";
import { toast } from "@/shared/toast";
import type { Directory } from "@/organization/model";
import { PeoplePickerField } from "@/organization/PeoplePicker";
import { FormRenderer } from "./FormRenderer";
import {
  fieldTypes,
  key,
  statusNames,
  type Definition,
  type Draft,
  type FieldType,
  type FormField,
  type Values,
} from "./model";

const initial = (): Draft => ({
  name: "",
  description: "",
  fields: [],
  steps: [{ id: key("s"), name: "负责人审批", approverId: null }],
});
export function FormDesigner() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initial),
    [saved, setSaved] = useState<Definition>(),
    [directory, setDirectory] = useState<Directory>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"fields" | "workflow">("fields"),
    [preview, setPreview] = useState(false),
    [previewValues, setPreviewValues] = useState<Values>({}),
    [archive, setArchive] = useState(false),
    [dirty, setDirty] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api<Directory>(
        "/api/v1/organization",
        "GET",
        undefined,
        controller.signal,
      ),
      formId
        ? api<Definition>(
            `/api/v1/forms/${formId}?manage=true`,
            "GET",
            undefined,
            controller.signal,
          )
        : api<Definition[]>(
            "/api/v1/forms?manage=true",
            "GET",
            undefined,
            controller.signal,
          ),
    ])
      .then(([people, form]) => {
        if (controller.signal.aborted) return;
        setDirectory(people);
        const existing = Array.isArray(form) ? undefined : form;
        setSaved(existing);
        setDraft(existing?.draft ?? initial());
        setSelected(existing?.draft?.fields[0]?.id ?? "");
        setDirty(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [formId]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function update(next: Draft) {
    setDraft(next);
    setDirty(true);
  }
  const current = draft.fields.find((f) => f.id === selected);
  function updateField(next: Partial<FormField>) {
    update({
      ...draft,
      fields: draft.fields.map((f) =>
        f.id === selected ? { ...f, ...next } : f,
      ),
    });
  }
  function add(type: FieldType, index = draft.fields.length) {
    if (draft.fields.length >= 80) return;
    const field: FormField = {
      id: key("f"),
      label: fieldTypes.find((t) => t.value === type)!.label,
      type,
      required: false,
      options: type === "select" ? ["选项一", "选项二"] : undefined,
    };
    const fields = [...draft.fields];
    fields.splice(index, 0, field);
    update({ ...draft, fields });
    setSelected(field.id);
  }
  function move(index: number, delta: number, kind: "fields" | "steps") {
    const values = [...draft[kind]];
    const next = index + delta;
    if (next < 0 || next >= values.length) return;
    [values[index], values[next]] = [values[next], values[index]];
    update({ ...draft, [kind]: values });
  }
  function drop(event: DragEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const type = event.dataTransfer.getData(
      "application/x-docweave-field-type",
    );
    if (fieldTypes.some((t) => t.value === type)) {
      add(type as FieldType, index);
      return;
    }
    const id = event.dataTransfer.getData("application/x-docweave-field");
    const from = draft.fields.findIndex((f) => f.id === id);
    if (from < 0) return;
    const fields = [...draft.fields];
    const [field] = fields.splice(from, 1);
    fields.splice(Math.min(index, fields.length), 0, field);
    update({ ...draft, fields });
    setSelected(id);
  }
  async function persist(publish = false) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      let result = saved
        ? await api<Definition>(`/api/v1/forms/${saved.id}`, "PUT", {
            revision: saved.revision,
            draft,
          })
        : await api<Definition>("/api/v1/forms", "POST", draft);
      setSaved(result);
      setDirty(false);
      if (publish) {
        result = await api<Definition>(
          `/api/v1/forms/${result.id}/publish`,
          "POST",
          { revision: result.revision },
        );
        setSaved(result);
      }
      toast.success(
        publish ? "表单已发布，公司成员可以发起申请" : "草稿已保存",
      );
      if (!formId) navigate(`/forms/${result.id}/edit`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (loading) return <EmptyState loading title="正在加载设计器…" />;
  if (!directory)
    return (
      <EmptyState title={error || "无法加载设计器"}>
        <Link to="/forms/manage">返回表单管理</Link>
      </EmptyState>
    );
  return (
    <section className="flex flex-col gap-5 p-4 sm:p-7" onClickCapture={event => {
      const link = (event.target as Element).closest("a");
      if (dirty && link && link.target !== "_blank") { event.preventDefault(); setError("请先保存草稿，再离开编辑器。"); }
    }}>
      <div data-dw-enter="header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/forms/manage" className="text-caption text-muted-foreground">
            ← 表单管理
          </Link>
          <h2 className="mt-2 text-title font-medium">
            {saved ? draft.name : "新建自定义表单"}
          </h2>
          <p className="mt-1 text-caption text-muted-foreground">
            {saved
              ? `${statusNames[saved.status]}${saved.publishedVersion ? ` · v${saved.publishedVersion.version}` : ""} · `
              : ""}
            {dirty ? "有未保存的修改" : "编辑字段与审批流程"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview(true)}>
            <EyeAction size={15} />
            预览
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void persist()}
          >
            <SaveAction running={busy} size={15} />
            保存草稿
          </Button>
          <Button disabled={busy} onClick={() => void persist(true)}>
            <SendAction running={busy} size={15} />
            {busy ? "正在保存…" : "发布表单"}
          </Button>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-card border border-destructive/30 bg-destructive/5 p-3 text-body text-destructive"
        >
          {error}
        </div>
      )}
      <fieldset disabled={busy} className="contents">
        <div className="grid gap-4 rounded-control border border-border bg-card p-5 md:grid-cols-2">
          <Input
            label="表单名称"
            placeholder="例如：费用报销申请"
            maxLength={128}
            value={draft.name}
            onChange={(name) => update({ ...draft, name })}
          />
          <Input
            label="表单说明"
            placeholder="告诉申请人需要准备哪些信息"
            maxLength={2000}
            value={draft.description}
            onChange={(description) => update({ ...draft, description })}
          />
        </div>
        <div className="flex gap-2" role="group" aria-label="设计内容">
          <Button
            variant={tab === "fields" ? "primary" : "secondary"}
            onClick={() => setTab("fields")}
          >
            表单设计 · {draft.fields.length}
          </Button>
          <Button
            variant={tab === "workflow" ? "primary" : "secondary"}
            onClick={() => setTab("workflow")}
          >
            审批流程 · {draft.steps.length}
          </Button>
        </div>
        <MotionRegion motionKey={tab}>{tab === "fields" ? (
          <div className="grid items-start gap-4 lg:grid-cols-form-designer">
            <aside className="rounded-control border border-border bg-card p-4">
              <h3 className="mb-3 text-body font-medium">添加字段</h3>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {fieldTypes.map((type) => (
                  <div
                    key={type.value}
                    draggable={!busy && draft.fields.length < 80}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/x-docweave-field-type",
                        type.value,
                      )
                    }
                  >
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={draft.fields.length >= 80}
                      onClick={() => add(type.value)}
                    >
                      <PlusAction size={14} />
                      {type.label}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-caption leading-5 text-muted-foreground">
                点击或拖入字段，拖动手柄或使用上下箭头调整顺序。
              </p>
            </aside>
            <div
              className="min-h-96 rounded-control border border-border bg-card p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, draft.fields.length)}
            >
              {draft.fields.length === 0 ? (
                <EmptyState title="从左侧添加第一个字段">
                  <p className="text-body text-muted-foreground">
                    文本、日期、金额和选项，按需组合。
                  </p>
                </EmptyState>
              ) : (
                <div className="flex flex-col gap-3">
                  {draft.fields.map((f, i) => (
                    <div
                      key={f.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, i)}
                      className={`rounded-card border p-3 ${selected === f.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          draggable={!busy}
                          onDragStart={(e) =>
                            e.dataTransfer.setData(
                              "application/x-docweave-field",
                              f.id,
                            )
                          }
                          className="cursor-grab p-1 text-muted-foreground"
                          title={`拖动${f.label}`}
                        >
                          <GripVertical size={14} />
                        </span>
                        <ActionSurface
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => setSelected(f.id)}
                        >
                          {f.label}
                          {f.required && (
                            <span className="text-destructive"> *</span>
                          )}
                          <span className="mt-1 block text-caption font-normal text-muted-foreground">
                            {fieldTypes.find((t) => t.value === f.type)?.label}
                          </span>
                        </ActionSurface>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`上移${f.label}`}
                          disabled={i === 0}
                          onClick={() => move(i, -1, "fields")}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`下移${f.label}`}
                          disabled={i === draft.fields.length - 1}
                          onClick={() => move(i, 1, "fields")}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`删除${f.label}`}
                          onClick={() => {
                            update({
                              ...draft,
                              fields: draft.fields.filter((x) => x.id !== f.id),
                            });
                            if (selected === f.id) setSelected("");
                          }}
                        >
                          <TrashAction size={14} />
                        </Button>
                      </div>
                      <ActionSurface
                        type="button"
                        aria-label={`编辑${f.label}`}
                        onClick={() => setSelected(f.id)}
                        className="mt-3 w-full text-left"
                      >
                        {f.placeholder ||
                          (f.type === "select"
                            ? f.options?.join(" / ")
                            : "点击配置字段")}
                      </ActionSurface>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <aside className="rounded-control border border-border bg-card p-4">
              <h3 className="mb-4 text-body font-medium">字段设置</h3>
              {current ? (
                <div className="flex flex-col gap-4">
                  <Input
                    label="字段名称"
                    maxLength={128}
                    value={current.label}
                    onChange={(label) => updateField({ label })}
                  />
                  <Input
                    label="填写提示"
                    maxLength={200}
                    value={current.placeholder || ""}
                    onChange={(placeholder) => updateField({ placeholder })}
                  />
                  <label className="flex items-center gap-2 text-body">
                    <TextEntry
                      type="checkbox"
                      checked={current.required}
                      onChange={(e) =>
                        updateField({ required: e.target.checked })
                      }
                    />
                    必填字段
                  </label>
                  {current.type === "select" && (
                    <label className="text-body">
                      选项（每行一个）
                      <MultilineEntry
                        className={`${""} mt-2`}
                        rows={6}
                        value={current.options?.join("\n") || ""}
                        onChange={(e) =>
                          updateField({ options: e.target.value.split("\n") })
                        }
                      />
                    </label>
                  )}
                  {current.type === "number" && (
                    <>
                      <Input
                        label="最小值（可选）"
                        type="number"
                        step="any"
                        value={current.minimum?.toString() || ""}
                        onChange={(v) =>
                          updateField({
                            minimum: v === "" ? undefined : Number(v),
                          })
                        }
                      />
                      <Input
                        label="最大值（可选）"
                        type="number"
                        step="any"
                        value={current.maximum?.toString() || ""}
                        onChange={(v) =>
                          updateField({
                            maximum: v === "" ? undefined : Number(v),
                          })
                        }
                      />
                    </>
                  )}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">
                  选择画布中的字段进行配置。
                </p>
              )}
            </aside>
          </div>
        ) : (
          <div className="rounded-control border border-border bg-card p-5 sm:p-8">
            <div className="mx-auto max-w-xl">
              <div className="mb-3 flex items-center gap-3 rounded-card bg-muted px-4 py-3">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-body">申请人提交</span>
              </div>
              {draft.steps.map((step, i) => (
                <div key={step.id}>
                  <div className="mx-auto h-6 w-px bg-border" />
                  <div className="rounded-card border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-caption text-muted-foreground">
                        审批节点 {i + 1}
                      </span>
                      <div className="flex">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`上移节点${i + 1}`}
                          disabled={i === 0}
                          onClick={() => move(i, -1, "steps")}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`下移节点${i + 1}`}
                          disabled={i === draft.steps.length - 1}
                          onClick={() => move(i, 1, "steps")}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`删除节点${i + 1}`}
                          onClick={() =>
                            update({
                              ...draft,
                              steps: draft.steps.filter(
                                (s) => s.id !== step.id,
                              ),
                            })
                          }
                        >
                          <TrashAction size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="节点名称"
                        maxLength={128}
                        value={step.name}
                        onChange={(name) =>
                          update({
                            ...draft,
                            steps: draft.steps.map((s) =>
                              s.id === step.id ? { ...s, name } : s,
                            ),
                          })
                        }
                      />
                      <div>
                        <span className="text-body font-medium">审批人</span>
                        <PeoplePickerField
                          className="mt-1.5"
                          directory={directory}
                          multiple={false}
                          value={step.approverId ? [step.approverId] : []}
                          onChange={(ids) =>
                            update({
                              ...draft,
                              steps: draft.steps.map((s) =>
                                s.id === step.id
                                  ? { ...s, approverId: ids[0] ?? null }
                                  : s,
                              ),
                            })
                          }
                          placeholder="选择审批人"
                          label="审批人"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="my-4 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={draft.steps.length >= 20}
                  onClick={() =>
                    update({
                      ...draft,
                      steps: [
                        ...draft.steps,
                        { id: key("s"), name: "审批", approverId: null },
                      ],
                    })
                  }
                >
                  <PlusAction size={15} />
                  添加审批节点
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-card bg-muted px-4 py-3 text-body">
                <Check size={16} />
                全部通过后完成申请
              </div>
              <p className="mt-5 text-caption leading-6 text-muted-foreground">
                按节点顺序依次审批；任一节点驳回即结束流程。修改审批人后，需要重新发布才能对新申请生效。
              </p>
            </div>
          </div>
        )}</MotionRegion>
      </fieldset>
      {saved?.status === "PUBLISHED" && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setArchive(true)}
          >
            停用表单
          </Button>
        </div>
      )}
      <AppModal
        open={preview}
        onOpenChange={setPreview}
        title={draft.name || "表单预览"}
        description={draft.description || "预览填写效果"}
      >
        <FormRenderer
          fields={draft.fields}
          value={previewValues}
          onChange={setPreviewValues}
        />
      </AppModal>
      <AppModal
        open={archive}
        onOpenChange={setArchive}
        title="停用这张表单？"
        description="停用后无法发起新申请，进行中的审批和历史记录仍然保留。"
        footer={
          <Button
            disabled={busy}
            onClick={async () => {
              if (!saved || saving.current) return;
              saving.current = true;
              setBusy(true);
              try {
                await api(`/api/v1/forms/${saved.id}/archive`, "POST", {
                  revision: saved.revision,
                });
                navigate("/forms/manage");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "停用失败");
              } finally {
                saving.current = false;
                setBusy(false);
              }
            }}
          >
            确认停用
          </Button>
        }
      >
        <p className="text-body">{saved?.name}</p>
      </AppModal>
    </section>
  );
}
