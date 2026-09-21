import { ActionSurface } from "@/components/controls";
import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconChevronDown, IconClock, IconClose, IconDownload, IconFile, IconUpload } from "@/shared/icons";
import type { DocumentRow, VersionRow } from "@/shared/api/types";
import { actorLabel } from "@/shared/identity";
import { Button } from "@/shared/ui";
import { FileKindIcon } from "@/shared/icons/file-kind";
import { useCatalog } from "../AppShell";
import { aiPolicyLabel, documentDisplayName, fileKind, ProcessBadge, versionLabel } from "../status";

const SPRING = { type: "spring", stiffness: 200, damping: 22, mass: 1.2 } as const;
const ORB = 56;
const PANEL = 320;

export function DocumentDock({
  doc,
  versions,
  busy,
  onDownload,
  onUpload,
  onEdit,
  onPublish,
  onRetry,
}: {
  doc: DocumentRow;
  versions?: VersionRow[];
  busy?: boolean;
  onDownload: () => void;
  onUpload: () => void;
  onEdit: () => void;
  onPublish: (version: VersionRow) => void;
  onRetry: (version: VersionRow) => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(ORB);
  const { categories, tags } = useCatalog();
  const kind = fileKind(doc.originalFilename, doc.mediaType);


  useLayoutEffect(() => {
    setOpen(false);
  }, [doc.id]);

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const update = () => setHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, versions, doc.id]);

  return (
    <div className="pointer-events-none absolute inset-3 z-20">
      <motion.aside
        initial={false}
        animate={{
          width: open ? PANEL : ORB,
          height: open ? Math.max(height, ORB) : ORB,
          borderRadius: open ? 24 : 28,
        }}
        transition={{
          height: { ...SPRING, delay: open ? 0.25 : 0 },
          width: { ...SPRING, delay: open ? 0 : 0.3 },
          borderRadius: SPRING,
        }}
        className="pointer-events-auto absolute right-0 bottom-0 overflow-hidden border border-border bg-card/95 shadow-tactile"
        aria-label="文档操作台"
      >
        <div ref={innerRef}>
          {open ? (
            <motion.div
              key="panel"
              initial={{ opacity: 0, filter: "blur(8px)", y: 40 }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
                y: 0,
                transition: { type: "spring", duration: 0.4, bounce: 0, delay: 0.3 },
              }}
              className="w-80"
            >
              <div className="flex items-start gap-2 px-3 pt-3">
                <ActionSurface
                  type="button"
                  className="mt-0.5 size-10 shrink-0"
                  aria-label="收起操作台"
                  onClick={() => setOpen(false)}
                >
                  <FileKindIcon kind={kind} size={20} />
                </ActionSurface>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="truncate text-body font-medium text-foreground">{documentDisplayName(doc)}</p>
                  <p className="mt-0.5 truncate text-caption text-muted-foreground">
                    {[kind, doc.versionNo ? `v${doc.versionNo}` : null, actorLabel(doc)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ProcessBadge doc={doc} />
                <ActionSurface
                  type="button"
                  className="size-8"
                  aria-label="收起"
                  onClick={() => setOpen(false)}
                >
                  <IconClose size={16} />
                </ActionSurface>
              </div>

              <div className="flex flex-wrap items-center gap-1 px-3 py-3">
                <Button size="sm" variant="ghost" onClick={onDownload}>
                  <IconDownload size={16} />
                  下载
                </Button>
                <Button size="sm" variant="ghost" disabled={!versions || busy} onClick={onUpload}>
                  <IconUpload size={16} />
                  新版本
                </Button>
                <Button size="sm" variant="ghost" disabled={!versions || busy} onClick={onEdit}>
                  <IconFile size={16} />
                  元数据
                </Button>
              </div>

              <div className="max-h-document-dock space-y-4 overflow-y-auto border-t border-border px-4 py-4">
                <section>
                  <h2 className="mb-2 flex items-center gap-1 text-caption tracking-widest text-muted-foreground">
                    <IconChevronDown size={16} />
                    详情
                  </h2>
                  <ul className="space-y-1.5 text-body text-muted-foreground">
                    <li>分类：{categories.find((term) => term.id === doc.categoryId)?.name || "未分类"}</li>
                    <li>标签：{(doc.tagIds || []).map((id) => tags.find((term) => term.id === id)?.name).filter(Boolean).join("、") || "无"}</li>
                    <li>AI：{aiPolicyLabel[doc.aiPolicy]}</li>
                    <li>上传人：{actorLabel(doc)}</li>
                    <li>文件：{doc.originalFilename || "—"}</li>
                  </ul>
                </section>
                {versions ? (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1 text-caption tracking-widest text-muted-foreground">
                      <IconClock size={16} />
                      版本
                    </h2>
                    <ul className="space-y-2">
                      {versions.map((version) => (
                        <li key={version.id} className="rounded-card bg-background/55 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-body font-medium text-foreground">v{version.versionNo}</span>
                            <span className="text-caption text-muted-foreground">
                              {versionLabel(version.status, version.id === doc.currentVersionId)}
                            </span>
                          </div>
                          <p className="truncate text-caption text-muted-foreground">{version.originalFilename}</p>
                          <p className="text-caption text-muted-foreground">
                            {actorLabel(version)} · {new Date(version.createdAt).toLocaleString("zh-CN")}
                          </p>
                          {version.status === "PENDING_REVIEW" ? (
                            <Button size="sm" variant="primary" className="mt-2" disabled={busy} onClick={() => onPublish(version)}>
                              发布
                            </Button>
                          ) : null}
                          {version.status === "FAILED" ? (
                            <Button size="sm" variant="secondary" className="mt-2" disabled={busy} onClick={() => onRetry(version)}>
                              整体重试
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <ActionSurface
              type="button"
              className="size-14"
              aria-label="打开文档操作台"
              onClick={() => setOpen(true)}
            >
              <FileKindIcon kind={kind} size={22} />
            </ActionSurface>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
