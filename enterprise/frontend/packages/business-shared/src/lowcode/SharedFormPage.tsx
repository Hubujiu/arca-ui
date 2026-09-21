import { TextEntry } from "@/components/controls";
import { useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FileText } from "@/shared/icons/catalog";
import { ArrowRightAction, SendAction } from "@/shared/icons/motion";
import { api } from "@/shared/api/client";
import { Button, EmptyState } from "@/shared/ui";
import type { Directory } from "../organization/model";
import { FieldRenderer } from "./FieldRenderer";
import { initialValues, validateValues, type DefaultUser, type TableSchema } from "./field-model";
import { LoadState } from "./common";
import { base, blankDirectory, dateLabel, message, useLoad, type Change } from "./model";

type SharedEntry =
  | { mode: "FILL"; tableId: string; name: string; schema: TableSchema; expiresAt: string }
  | { mode: "DATA"; tableId: string; appId: string };

function InlineError({ error }: { error: string }) {
  if (!error) return null;
  return <p role="alert" className="rounded-card border border-destructive/20 bg-destructive/5 p-4 text-body text-destructive">{error}</p>;
}
function SharedFill({
  entry,
  token,
  directory,
  user,
}: {
  entry: Extract<SharedEntry, { mode: "FILL" }>;
  token: string;
  directory: Directory;
  user: DefaultUser;
}) {
  const [data, setData] = useState(() => initialValues(entry.schema, user));
  const [title, setTitle] = useState(entry.name);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [resolving, setResolving] = useState(false),
    [result, setResult] = useState<Change>();
  const attempt = useRef<{ key: string; signature: string } | undefined>(
    undefined,
  );
  const flight = useRef(false);
  const uploadFlight = useRef(false);
  const resolveFlight = useRef(false);
  function onUploadingChange(active: boolean) {
    uploadFlight.current = active;
    setUploading(active);
  }
  function onResolvingChange(active: boolean) {
    resolveFlight.current = active;
    setResolving(active);
  }
  async function submit() {
    if (flight.current || uploadFlight.current || resolveFlight.current) return;
    const next = validateValues(entry.schema, data);
    if (!title.trim()) next._title = "请填写申请标题";
    setErrors(next);
    if (Object.keys(next).length) return;
    const signature = JSON.stringify({ title: title.trim(), data });
    if (!attempt.current || attempt.current.signature !== signature)
      attempt.current = { key: crypto.randomUUID(), signature };
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<Change>(
          `${base}/shared/${encodeURIComponent(token)}`,
          "POST",
          {
            requestKey: attempt.current.key,
            title: title.trim(),
            data,
            submit: true,
          },
        ),
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="mx-auto w-full max-w-xl py-12">
        <EmptyState
          title="提交成功，记录已保存"
          action={
            <Link
              to={`/workflows/${result.id}`}
              className="inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-body text-primary-foreground"
            >
              查看我的申请
              <ArrowRightAction size={15} />
            </Link>
          }
        >
          你可以在审批中心查看本次提交的处理进展。
        </EmptyState>
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-7xl py-7 sm:py-10">
      <header className="mb-6">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-caption text-primary">
          <FileText size={13} />
          表单填写
        </span>
        <h1 className="text-heading font-semibold tracking-tight">{entry.name}</h1>
        <p className="mt-3 text-caption text-muted-foreground">
          以当前公司账号提交 · 链接有效期至 {dateLabel(entry.expiresAt)}
        </p>
      </header>
      <div className="rounded-control border border-border bg-card p-5 sm:p-8">
        <div className="space-y-6">
          <InlineError error={error} />
          <label className="block space-y-2 text-body">
            <span className="font-medium">
              申请标题 <span className="text-destructive">*</span>
            </span>
            <TextEntry
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
              className={""}
              maxLength={200}
              aria-invalid={!!errors._title}
            />
            {errors._title && (
              <small className="block text-caption text-destructive">
                {errors._title}
              </small>
            )}
          </label>
          <FieldRenderer
            schema={entry.schema}
            value={data}
            onChange={setData}
            directory={directory}
            mode="create"
            fileContext={{ tableId: entry.tableId, shareToken: token }}
            disabled={busy}
            onUploadingChange={onUploadingChange}
            onResolvingChange={onResolvingChange}
            errors={errors}
          />
          <div className="flex items-center justify-end border-t border-border pt-6">
            <Button disabled={busy || uploading || resolving} onClick={() => void submit()}>
              <SendAction running={busy} size={15} />
              {busy
                ? "正在提交…"
                : entry.schema.appearance?.submitLabel || "提交申请"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function SharedFormPage() {
  const me = useLoad<DefaultUser>("/api/v1/me");
  const { token } = useParams<{ token: string }>();
  const loaded = useLoad<SharedEntry>(
    token ? `${base}/shared/${encodeURIComponent(token)}` : undefined,
  );
  const directory = useLoad<Directory>("/api/v1/organization");
  if (loaded.data?.mode === "DATA")
    return (
      <Navigate
        replace
        to={`/apps/${encodeURIComponent(loaded.data.appId)}?table=${encodeURIComponent(loaded.data.tableId)}`}
      />
    );
  return (
    <div className="w-full flex-1 overflow-y-auto px-4 sm:px-8">
      {loaded.error || !loaded.data || !token || !me.data ? (
        <div className="mx-auto max-w-3xl py-10">
          <LoadState
            error={loaded.error || me.error || (!token ? "分享地址无效" : "")}
            retry={() => { loaded.refresh(); me.refresh(); }}
            title="正在打开表单…"
          />
        </div>
      ) : (
        <SharedFill
          key={token}
          entry={loaded.data}
          user={me.data!}
          token={token}
          directory={directory.data ?? blankDirectory}
        />
      )}
    </div>
  );
}

