import { ActionSurface } from "@/components/controls";
import { useEffect, useState } from "react";
import {
  IconClose,
  IconLink,
  IconLock,
  IconShare,
  IconUser,
  IconUsers,
} from "@/shared/icons";
import { api, ApiError } from "@/shared/api/client";
import {
  AppModal,
  Button,
  EmptyState,
  FieldSelect,
  StatefulButton,
} from "@/shared/ui";
import { toast } from "@/shared/toast";
import { useCatalog } from "./AppShell";
import { PeoplePicker } from "@/organization/PeoplePicker";
import {
  collapsePeopleToRecipients,
  enabledPerson,
  expandRecipientsToPeople,
  mergeRecipients,
  recipientName,
  unitPath,
  type Directory,
  type Recipient,
} from "@/organization/model";

type SharedGrant = Recipient & {
  id: string;
  name: string;
  inherited: boolean;
  resourceType: string;
  resourceId: string;
};
type Sharing = {
  spaceId: string;
  revision: number;
  orgUnitId?: string;
  createdBy?: string;
  createdByName: string;
  canManage: boolean;
  grants: SharedGrant[];
  members: { subjectId: string; name: string; permission: string }[];
};
export function ShareControl({
  kind,
  id,
  name,
  creatorName,
  compact = false,
  triggerOnly = false,
}: {
  kind: "space" | "folder" | "document";
  id: string;
  name: string;
  creatorName?: string;
  compact?: boolean;
  /** Defer sharing metadata until asked, keeping resource rows fixed-height. */
  triggerOnly?: boolean;
}) {
  const { reload } = useCatalog();
  const [sharing, setSharing] = useState<Sharing>();
  const [open, setOpen] = useState(false);
  const [directory, setDirectory] = useState<Directory>();
  const [grants, setGrants] = useState<Recipient[]>([]);
  const [permission, setPermission] = useState("READER");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const changed = () => setRefresh((r) => r + 1);
    window.addEventListener("knowledge-sharing-changed", changed);
    return () =>
      window.removeEventListener("knowledge-sharing-changed", changed);
  }, []);
  const path = `/api/v1/sharing/${kind}/${id}`;
  useEffect(() => {
    const controller = new AbortController();
    setSharing(undefined);
    setRestricted(false);
    setSummaryError(false);
    if (triggerOnly) return () => controller.abort();
    api<Sharing>(path, "GET", undefined, controller.signal)
      .then(setSharing)
      .catch((e) => {
        if (!controller.signal.aborted) {
          if (e instanceof ApiError && e.status === 403) setRestricted(true);
          else setSummaryError(true);
        }
      });
    return () => controller.abort();
  }, [path, refresh, triggerOnly, open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setDirectory(undefined);
    setError("");
    Promise.all([
      api<Directory>(
        "/api/v1/organization",
        "GET",
        undefined,
        controller.signal,
      ),
      api<Sharing>(path, "GET", undefined, controller.signal),
    ])
      .then(([d, s]) => {
        if (controller.signal.aborted) return;
        setDirectory(d);
        setSharing(s);
        setOrg(s.orgUnitId || "");
        setGrants(
          s.grants
            .filter((g) => !g.inherited)
            .map((g) => ({
              subjectId: g.subjectId,
              subjectType: g.subjectType,
              permission: g.permission,
            })),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => controller.abort();
  }, [open, path, attempt]);
  const names = [
    ...new Set([
      ...(sharing?.grants.map((g) => g.name) || []),
      ...(sharing?.members
        .filter((m) => m.subjectId !== sharing.createdBy)
        .map((m) => m.name) || []),
    ]),
  ];
  const creator = sharing?.createdByName || creatorName || "创建者未记录";
  async function save() {
    if (!sharing || !directory) return;
    setBusy(true);
    setError("");
    try {
      const merged = mergeRecipients(directory, grants);
      const updated = await api<Sharing>(path, "PUT", {
        revision: sharing.revision,
        orgUnitId: org || null,
        grants: merged,
      });
      setSharing(updated);
      setOpen(false);
      toast.success("共享设置已保存");
      window.dispatchEvent(new Event("knowledge-sharing-changed"));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`flex ${triggerOnly ? "w-auto" : compact ? "w-full px-5 pb-3 sm:w-auto sm:min-w-48 sm:max-w-64 sm:px-0 sm:pb-0" : "w-full"} flex-wrap items-center gap-2`}
    >
      {!triggerOnly && <span className="min-w-0 flex-1 text-caption text-muted-foreground">
        <span className="block truncate" title={creator}>
          创建者：{creator}
        </span>
        <span className="block truncate" title={names.join("、")}>
          {restricted
            ? "仅用于定位已共享内容"
            : summaryError
              ? "共享信息暂不可用，点击重试"
              : sharing
                ? names.length
                  ? `共享给：${names.join("、")}`
                  : "仅创建者和管理员"
                : "正在读取共享信息…"}
        </span>
      </span>}
      <Button
        size="sm"
        variant="ghost"
        aria-label={`共享${name}`}
        disabled={restricted}
        onClick={() => setOpen(true)}
      >
        <IconShare size={16} />
        {!compact && "共享"}
      </Button>
      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={`共享「${name}」`}
        description="按个人或组织授权；工作空间和文件夹的权限会向下继承。"
        className="max-w-4xl"
        bodyClassName="max-h-sharing-dialog"
        dismissible={!busy}
        footer={
          directory && sharing ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                关闭
              </Button>
              {sharing.canManage && (
                <StatefulButton
                  state={busy ? "loading" : "idle"}
                  loadingText="保存中…"
                  onClick={() => void save()}
                >
                  保存共享设置
                </StatefulButton>
              )}
            </div>
          ) : undefined
        }
      >
        {!directory || !sharing ? (
          error ? (
            <EmptyState
              title="无法加载共享设置"
              action={
                <Button onClick={() => setAttempt((a) => a + 1)}>重试</Button>
              }
            >
              {error}
            </EmptyState>
          ) : (
            <EmptyState loading title="正在加载通讯录…" />
          )
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-card bg-muted/40 p-3">
              <IconLock size={18} />
              <div className="flex-1 text-body">
                <span className="block">仅授权对象可访问</span>
                <small className="text-muted-foreground">
                  由 {sharing.createdByName} 创建
                </small>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const target = new URL(
                    kind === "document"
                      ? `/documents/${id}`
                      : `/knowledge?spaceId=${sharing.spaceId}${kind === "folder" ? `&folderId=${id}` : ""}`,
                    window.location.origin,
                  );
                  try {
                    await navigator.clipboard.writeText(target.href);
                    toast.success("链接已复制，访问仍需授权");
                  } catch {
                    toast.error("无法访问剪贴板");
                  }
                }}
              >
                <IconLink size={16} />
                复制链接
              </Button>
            </div>
            {sharing.canManage ? (
              <>
                <FieldSelect
                  label="所属组织（用于归类，不自动授权）"
                  value={org}
                  onChange={setOrg}
                  options={[
                    { value: "", label: "未分配组织" },
                    ...directory.units.map((u) => ({
                      value: u.id,
                      label: unitPath(directory.units, u.id),
                    })),
                  ]}
                />
                <PeoplePicker
                  directory={directory}
                  value={expandRecipientsToPeople(directory, grants)}
                  eligible={enabledPerson}
                  onChange={(ids) =>
                    setGrants(
                      collapsePeopleToRecipients(
                        directory,
                        ids,
                        grants,
                        permission as Recipient["permission"],
                      ),
                    )
                  }
                  className="h-motion-catalog min-h-96"
                />
                <FieldSelect
                  label="新选人员的权限"
                  value={permission}
                  onChange={setPermission}
                  options={[
                    { value: "READER", label: "可查看、下载" },
                    { value: "EDITOR", label: "可查看、编辑" },
                  ]}
                />
                <p className="text-caption leading-5 text-muted-foreground">
                  相同或更高权限的上级组织会合并其下的小组和个人。个人编辑权限高于部门查看权限时会单独保留。点击保存后生效。
                </p>
              </>
            ) : (
              <p className="text-body text-muted-foreground">
                只有创建者、空间所有者或管理员可以修改共享设置。
              </p>
            )}
            <section>
              <h3 className="mb-2 text-body font-medium">
                直接共享 · {grants.length}
              </h3>
              {!grants.length && (
                <p className="py-3 text-caption text-muted-foreground">
                  尚未添加直接共享对象
                </p>
              )}
              <div className="divide-y divide-border">
                {grants.map((g, index) => (
                  <div
                    key={`${g.subjectType}:${g.subjectId}`}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    {g.subjectType === "org" ? (
                      <IconUsers size={16} />
                    ) : (
                      <IconUser size={16} />
                    )}
                    <span className="min-w-0 flex-1 text-body">
                      {recipientName(directory, g)}
                    </span>
                    {sharing.canManage ? (
                      <>
                        <FieldSelect
                          value={g.permission}
                          onChange={(p) =>
                            setGrants(
                              grants.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      permission: p as Recipient["permission"],
                                    }
                                  : r,
                              ),
                            )
                          }
                          options={[
                            { value: "READER", label: "可查看" },
                            { value: "EDITOR", label: "可编辑" },
                          ]}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`撤销${recipientName(directory, g)}的共享`}
                          onClick={() =>
                            setGrants(grants.filter((_, i) => i !== index))
                          }
                        >
                          <IconClose size={16} />
                        </Button>
                      </>
                    ) : (
                      <small>
                        {g.permission === "EDITOR" ? "可编辑" : "可查看"}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {(sharing.grants.some((g) => g.inherited) ||
              sharing.members.length > 0) && (
              <section className="rounded-card border border-border p-3">
                <h3 className="mb-2 text-body font-medium">继承与空间成员</h3>
                <p className="mb-2 text-caption text-muted-foreground">
                  此处只读；撤销直接共享后，对象仍可能通过这些授权访问。
                </p>
                {sharing.grants
                  .filter((g) => g.inherited)
                  .map((g) => (
                    <div key={g.id} className="flex gap-3 py-2 text-caption">
                      <span className="flex-1">{g.name}</span>
                      <span>
                        {g.resourceType === "space"
                          ? "来自工作空间"
                          : "来自上级文件夹"}
                      </span>
                      <span>
                        {g.permission === "EDITOR" ? "可编辑" : "可查看"}
                      </span>
                    </div>
                  ))}
                {sharing.members.map((m) => (
                  <div
                    key={m.subjectId}
                    className="flex justify-between gap-3 py-2 text-caption"
                  >
                    <span>{m.name}</span>
                    <span>
                      空间
                      {m.permission === "OWNER"
                        ? "所有者"
                        : m.permission === "EDITOR"
                          ? "编辑者"
                          : "阅读者"}
                    </span>
                  </div>
                ))}
              </section>
            )}
            {error && (
              <p role="alert" className="text-body text-destructive">
                {error}{" "}
                <ActionSurface

                  onClick={() => setAttempt((a) => a + 1)}
                >
                  重新加载
                </ActionSurface>
              </p>
            )}
          </div>
        )}
      </AppModal>
    </div>
  );
}
