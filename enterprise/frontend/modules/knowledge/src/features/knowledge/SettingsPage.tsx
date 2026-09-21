import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/motion/switch";
import { api, ApiError } from "@/shared/api/client";
import type { Term } from "@/shared/api/types";
import { AppModal, Button, EmptyState, Input, StatefulButton } from "@/shared/ui";
import { toast } from "@/shared/toast";
import { useCatalog } from "./AppShell";

function TermPanel({
  title,
  items,
  path,
}: {
  title: string;
  items: Term[];
  path: "categories" | "tags";
}) {
  const { reload } = useCatalog();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState<Term>();
  const active = items.filter((item) => item.status === "ACTIVE");

  async function archiveTerm(item: Term) {
    setBusy(true);
    try {
      await api(`/api/v1/${path}/${item.id}/archive`, "POST");
      toast.success("已归档");
      setArchive(undefined);
      await reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "无法归档");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id={path} tabIndex={-1} className="scroll-mt-6 rounded-control border border-border bg-card p-6 outline-none target:ring-2 target:ring-primary/40">
      <h2 className="mb-4 text-body font-medium text-foreground">{title}</h2>
      <form
        className="mb-4 flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await api(`/api/v1/${path}`, "POST", { name });
            setName("");
            toast.success("已创建");
            await reload();
          } catch (caught) {
            toast.error(caught instanceof ApiError ? caught.message : "无法创建");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input id={`new-${path}`} label={`新建${title}`} value={name} onChange={setName} required maxLength={128} />
        <StatefulButton className="self-start" type="submit" state={busy ? "loading" : "idle"} loadingText="创建中…">
          创建
        </StatefulButton>
      </form>
      {active.length === 0 ? (
        <EmptyState className="border-0 bg-muted/40 py-10" title={`还没有${title}`} />
      ) : (
        <div className="divide-y divide-border">
          {active.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-body text-foreground">{item.name}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setArchive(item)}>
                归档
              </Button>
            </div>
          ))}
        </div>
      )}
      <AppModal
        open={Boolean(archive)}
        onOpenChange={(open) => {
          if (!open) setArchive(undefined);
        }}
        title={`归档这个${title}？`}
        description="归档后不会再出现在筛选里，已有文档上的引用会保留。"
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setArchive(undefined)}>
            取消
          </Button>
          <Button type="button" variant="primary" disabled={busy || !archive} onClick={() => archive && archiveTerm(archive)}>
            确认归档
          </Button>
        </div>
      </AppModal>
    </section>
  );
}

export function SettingsPage() {
  const { categories, tags, system } = useCatalog();
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) return;
    // Run after the palette restores focus; this also handles a same-page field jump.
    const timer = window.setTimeout(() => {
      const field = document.getElementById(location.hash.slice(1));
      field?.scrollIntoView({ block: "center", behavior: "instant" });
      field?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [location.key, location.hash]);
  return (
    <>
      <header data-dw-enter="header" className="flex flex-col gap-2">
        <h1 className="text-heading font-medium tracking-tight text-foreground">分类与标签</h1>
        <p className="text-body leading-6 text-muted-foreground">维护知识库分类、标签和内容能力。外观偏好统一在顶部全局设置中管理。</p>
      </header>
      <section id="ai-enabled" tabIndex={-1} className="scroll-mt-6 rounded-control border border-border bg-card p-6 outline-none target:ring-2 target:ring-primary/40">
        <h2 className="mb-4 text-body font-medium text-foreground">AI 能力状态</h2>
        <Switch
          checked={Boolean(system?.aiEnabled)}
          onCheckedChange={() => undefined}
          disabled
          label={system?.aiEnabled ? "系统已启用 AI 能力。具体文档仍受模型策略约束。" : "当前未启用模型能力。入口已隐藏，知识库主链路不受影响。"}
        />
        <div className="mt-4 flex flex-wrap gap-3 text-caption text-muted-foreground">
          <p id="object-storage" tabIndex={-1} className="scroll-mt-6 rounded-control p-2 outline-none target:bg-primary/10 target:ring-2 target:ring-primary/40">对象存储：{system?.objectStorageConfigured ? "已配置" : "未配置"}</p>
          <p id="instance-name" tabIndex={-1} className="scroll-mt-6 rounded-control p-2 outline-none target:bg-primary/10 target:ring-2 target:ring-primary/40">实例名称：{system?.instanceName || "DocWeave"}</p>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <TermPanel title="分类" items={categories} path="categories" />
        <TermPanel title="标签" items={tags} path="tags" />
      </div>
    </>
  );
}
