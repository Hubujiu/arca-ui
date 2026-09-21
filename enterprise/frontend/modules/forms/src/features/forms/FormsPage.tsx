import { ContentStage } from "@/shared/design-system/workspace/ContentStage";
import { useState } from "react";
import { DesignerLink as Link } from "@/shared/design-system/designer-navigation";
import { ArrowRightAction, PlusAction, SearchAction } from "@/shared/icons/motion";
import { PotlabIcon } from "@/shared/icons";
import { Button, EmptyState, Input } from "@/shared/ui";
import { dateLabel, statusNames, useResource, type Definition } from "./model";

export function FormsPage({ manage = false }: { manage?: boolean }) {
  const { data, error, reload } = useResource<Definition[]>(
    `/api/v1/forms?manage=${manage}`,
  );
  const [query, setQuery] = useState("");
  const forms = data?.filter((f) =>
    (f.name + f.description).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="flex flex-col gap-5">
      <div data-dw-enter="header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title font-medium">
            {manage ? "自定义表单" : "选择申请表单"}
          </h2>
          <p className="mt-1 text-body text-ui-muted">
            {manage
              ? "设计字段和审批流程，发布后供公司成员使用。"
              : "填写已发布的表单，提交后自动流转到审批人。"}
          </p>
        </div>
        {manage && (
          <Link to="/forms/new">
            <span className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2.5 text-body font-medium text-primary-foreground">
              <PlusAction size={16} />
              新建表单
            </span>
          </Link>
        )}
      </div>
      <div className="max-w-sm">
        <Input
          aria-label="搜索表单"
          placeholder="搜索表单名称或说明"
          value={query}
          onChange={setQuery}
          leftIcon={<SearchAction size={16} />}
        />
      </div>
      <ContentStage ready={Boolean(data)} identity={`forms:${manage}`} error={error ? <EmptyState title={error}><Button onClick={reload}>重新加载</Button></EmptyState> : undefined}>
      {!forms?.length ? (
        <EmptyState
          title={
            query
              ? "没有匹配的表单"
              : manage
                ? "创建第一张表单"
                : "还没有可用的申请表单"
          }
        >
          {manage ? (
            <p className="text-body text-ui-muted">
              从请假、报销或通用申请开始，自由设置字段和审批人。
            </p>
          ) : (
            <p className="text-body text-ui-muted">
              管理员发布表单后，会显示在这里。
            </p>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <Link
              key={form.id}
              to={manage ? `/forms/${form.id}/edit` : `/forms/${form.id}/fill`}
            >
              <div className="flex min-h-52 flex-col rounded-card border border-ui-border bg-ui-surface p-5 shadow-tactile hover:border-ui-accent">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-control bg-ui-ground p-2.5 text-ui-accent">
                  <PotlabIcon name={manage ? "FilePen" : "Article"} size={22} />
                </span>
                <span className="text-caption text-ui-muted">
                  {statusNames[form.status]}
                  {form.version ? ` · v${form.version}` : ""}
                </span>
              </div>
              <h3 className="font-medium">{form.name}</h3>
              <p className="mt-2 line-clamp-2 text-body leading-6 text-ui-muted">
                {form.description || "暂无表单说明"}
              </p>
              <div className="mt-auto flex items-center justify-between pt-5 text-caption text-ui-muted">
                <span>
                  {manage
                    ? `更新于 ${dateLabel(form.updatedAt)}`
                    : "填写并发起审批"}
                </span>
                <ArrowRightAction size={16} />
              </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </ContentStage>
    </section>
  );
}
