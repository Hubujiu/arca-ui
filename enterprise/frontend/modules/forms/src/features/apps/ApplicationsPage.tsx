import { ContentStage } from "@/shared/design-system/workspace/ContentStage";
import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ArrowRightAction, PlusAction, SearchAction } from "@/shared/icons/motion";
import { PotlabIcon } from "@/shared/icons";
import { api } from "@/shared/api/client";
import {
  AppModal,
  Button,
  EmptyState,
  Field,
  FieldSelect,
  Input,
} from "@/shared/ui";
import { toast } from "@/shared/toast";
import { AppIcon } from "@/lowcode/common";
import { base, message, useLoad, type Application, type Table } from "@/lowcode/model";
import {
  createField,
  defaultAppearance,
  type TableSchema,
} from "@/lowcode/field-model";

export function ApplicationsPage() {
  const UI = useWorkspaceUI();
  const apps = useLoad<Application[]>(`${base}/applications`);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const color = "slate";
  const [icon, setIcon] = useState("layers");
  const [template, setTemplate] = useState("blank");
  async function create() {
    if (!name.trim()) {
      setError("请填写应用名称");
      return;
    }
    setBusy(true);
    setError("");
    let created: Application | undefined;
    try {
      created = await api<Application>(`${base}/applications`, "POST", {
        name,
        description,
        color,
        icon,
      });
      if (template !== "blank") {
        const grouped = await api<Application>(
          `${base}/applications/${created.id}/groups`,
          "POST",
          { name: "工作报告" },
        );
        const table = await api<Table>(
          `${base}/applications/${created.id}/tables`,
          "POST",
          { name: "日报", groupId: grouped.groups[0].id },
        );
        const draft: TableSchema = {
          name: "日报",
          description: "记录今日进展，让团队协作更清晰。",
          appearance: defaultAppearance,
          fields: [
            { ...createField("member"), label: "报告人", required: true },
            { ...createField("date"), label: "报告日期", required: true },
            { ...createField("textarea"), label: "今日工作", required: true },
            { ...createField("progress"), label: "完成进度" },
            { ...createField("textarea"), label: "明日计划" },
          ],
        };
        const saved = await api<Table>(`${base}/tables/${table.id}`, "PUT", {
          revision: table.revision,
          draft,
        });
        await api(`${base}/tables/${table.id}/publish`, "POST", {
          revision: saved.revision,
        });
      }
      toast.success("应用已创建");
      navigate(`/apps/${created.id}`);
    } catch (e) {
      if (created) {
        toast.error(`应用已创建，模板未能安装：${message(e)}`);
        navigate(`/apps/${created.id}`);
      } else setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const items = apps.data?.filter((app) =>
    `${app.name} ${app.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <UI.PageHeader
        title="全部应用"
        description="把表单、数据和审批，放在同一个工作空间。"
        actions={
          <Button
            onClick={() => {
              setName("");
              setDescription("");
              setError("");
              setOpen(true);
            }}
          >
            <PlusAction size={18} />
            新建应用
          </Button>
        }
      />
      <UI.Panel className="overflow-hidden">
        <UI.Toolbar aria-label="应用筛选">
          <div className="w-full min-w-0 max-w-sm">
            <Input
              aria-label="搜索应用"
              value={query}
              onChange={(e) => setQuery(e)}
              placeholder="搜索应用名称"
              leftIcon={<SearchAction size={16} />}
            />
          </div>
          <span className="ml-auto shrink-0 text-caption text-ui-muted" aria-live="polite">
            {query ? `${items?.length ?? 0} 个结果` : `${apps.data?.length ?? 0} 个应用`}
          </span>
        </UI.Toolbar>
      </UI.Panel>
      <ContentStage ready={!apps.loading && Boolean(apps.data)} error={apps.error ? <EmptyState title={apps.error}><Button onClick={apps.refresh}>重新加载</Button></EmptyState> : undefined}>
      {!items?.length ? (
        <EmptyState
          title={query ? "没有找到匹配的应用" : "从第一个应用开始"}
          action={
            !query ? (
              <Button onClick={() => setOpen(true)}>
                <PlusAction size={16} />
                新建应用
              </Button>
            ) : undefined
          }
        >
          {query ? "换一个名称试试。" : "创建应用，再按业务分组添加数据表。"}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((app) => (
            <div key={app.id} className="min-w-0">
              <Link
                to={`/apps/${app.id}`}
                className="group flex h-full min-h-44 flex-col rounded-card border border-ui-border bg-ui-surface p-6 shadow-tactile hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex items-start justify-between">
                  <AppIcon icon={app.icon} color={app.color} />
                  <ArrowRightAction size={18} />
                </div>
                <h2 className="mt-5 break-words text-title font-medium">{app.name}</h2>
                <p className="mt-2 line-clamp-2 text-body leading-6 text-ui-muted">
                  {app.description || "在这里组织业务数据与审批流程。"}
                </p>
                <div className="mt-auto flex items-center justify-between pt-6 text-caption text-ui-muted">
                  <span>{app.tableCount ?? 0} 张数据表</span>
                  {app.canManage && (
                    <span className="flex items-center gap-1">
                      <PotlabIcon name="Check" size={16} />
                      可管理
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      </ContentStage>
      <AppModal
        open={open}
        onOpenChange={setOpen}
        dismissible={!busy}
        title="新建应用"
        description="一个应用可以容纳多张表单，并独立配置权限与流程。"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button disabled={busy} onClick={() => void create()}>
              {busy ? "正在创建…" : "创建应用"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="应用名称">
            <Input
              autoFocus
              aria-label="应用名称"
              value={name}
              onChange={(e) => setName(e)}
              placeholder="例如：团队协作、项目管理"
              maxLength={128}
            />
          </Field>
          <Field label="说明">
            <Input
              value={description}
              aria-label="说明"
              onChange={(e) => setDescription(e)}
              placeholder="这个应用用来做什么？"
              maxLength={2000}
            />
          </Field>
          <div>
            <FieldSelect
              label="图标"
              value={icon}
              onChange={setIcon}
              options={[
                { value: "layers", label: "应用" },
                { value: "briefcase", label: "工作" },
                { value: "users", label: "团队" },
                { value: "target", label: "目标" },
                { value: "calendar", label: "日程" },
                { value: "box", label: "资产" },
              ]}
            />
          </div>
          <FieldSelect
            label="起点"
            value={template}
            onChange={setTemplate}
            options={[
              { value: "blank", label: "空白应用 · 自由搭建" },
              { value: "daily", label: "团队日报 · 自带报告表单" },
            ]}
          />
          <p className="rounded-control bg-ui-ground p-3 text-caption leading-5 text-ui-muted">
            应用创建后由你管理。添加权限组并分配成员后，团队即可协作。
          </p>
          {error && (
            <p role="alert" className="text-body text-destructive">
              {error}
            </p>
          )}
        </div>
      </AppModal>
    </div>
  );
}

