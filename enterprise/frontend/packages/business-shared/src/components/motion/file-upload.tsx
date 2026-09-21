"use client";
import { useMotionPreference as useReducedMotion } from "@/lib/motion-preference";
// beui.dev/components/blocks/file-upload

import { IconCheck, IconClose, IconFile, IconRotate, IconUpload, IconWarning } from "../../shared/icons";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type FileUploadStatus = "queued" | "uploading" | "success" | "error";
export type FileUploadVariant = "default" | "centered";

export type FileUploadItem = {
  id: string;
  name: string;
  size: number;
  type?: string;
  progress?: number;
  status?: FileUploadStatus;
  error?: string;
  file?: File;
};

export type FileUploadClassNames = {
  root?: string;
  dropzone?: string;
  queue?: string;
  item?: string;
  leading?: string;
  content?: string;
  name?: string;
  meta?: string;
  progress?: string;
  action?: string;
};

export interface FileUploadProps {
  value?: FileUploadItem[];
  defaultValue?: FileUploadItem[];
  onValueChange?: (items: FileUploadItem[]) => void;
  onFilesAdded?: (items: FileUploadItem[], files: File[]) => void;
  onRemove?: (item: FileUploadItem) => void;
  onRetry?: (item: FileUploadItem) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  variant?: FileUploadVariant;
  title?: string;
  description?: string;
  browseLabel?: string;
  className?: string;
  classNames?: FileUploadClassNames;
}

const ROW_TRANSITION = { duration: 0.22, ease: EASE_OUT } as const;
const FAST_TRANSITION = { duration: 0.16, ease: EASE_OUT } as const;

const STATUS_LABEL: Record<FileUploadStatus, string> = {
  queued: "排队",
  uploading: "上传中",
  success: "已上传",
  error: "失败",
};

const STATUS_TONE: Record<FileUploadStatus, string> = {
  queued: "text-muted-foreground",
  uploading: "text-foreground",
  success: "text-status-success dark:text-status-success",
  error: "text-destructive",
};

function useControllableUpload({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: FileUploadItem[];
  defaultValue?: FileUploadItem[];
  onValueChange?: (items: FileUploadItem[]) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? []);
  const isControlled = value !== undefined;
  const items = value ?? internalValue;

  const setItems = useCallback(
    (next: FileUploadItem[]) => {
      if (!isControlled) {
        setInternalValue(next);
      }

      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return [items, setItems] as const;
}

function clampProgress(value: number | undefined, status: FileUploadStatus) {
  if (status === "success") return 100;
  if (value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${
    units[exponent]
  }`;
}

function fileKind(item: FileUploadItem) {
  const extension = item.name.includes(".")
    ? item.name.split(".").pop()
    : undefined;

  if (extension) return extension.toUpperCase();
  if (item.type) return item.type.split("/").pop()?.toUpperCase();
  return "FILE";
}

function getFileIcon() {
  return <IconFile size={18} />;
}

export function createFileUploadItem(file: File, index = 0): FileUploadItem {
  return {
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    progress: 0,
    status: "queued",
    file,
  };
}

function StatusIcon({
  status,
  reduce,
}: {
  status: FileUploadStatus;
  reduce: boolean;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={
          reduce
            ? { opacity: 0 }
            : { opacity: 0, transform: "translateY(4px)" }
        }
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        exit={
          reduce
            ? { opacity: 0 }
            : { opacity: 0, transform: "translateY(-4px)" }
        }
        transition={FAST_TRANSITION}
        className={cn("grid h-6 w-6 place-items-center", STATUS_TONE[status])}
      >
        {status === "success" ? (
          <IconCheck size={16} />
        ) : status === "error" ? (
          <IconWarning size={16} />
        ) : status === "uploading" ? (
          <span
            className={cn(
              "size-4 rounded-full border-2 border-current border-t-transparent",
              reduce ? "" : "animate-spin",
            )}
          />
        ) : (
          <IconFile size={16} />
        )}
        <span className="sr-only">{STATUS_LABEL[status]}</span>
      </motion.span>
    </AnimatePresence>
  );
}

function FileUploadRow({
  item,
  onRemove,
  onRetry,
  classNames,
}: {
  item: FileUploadItem;
  onRemove: (item: FileUploadItem) => void;
  onRetry: (item: FileUploadItem) => void;
  classNames?: FileUploadClassNames;
}) {
  const reduce = useReducedMotion() ?? false;
  const status = item.status ?? "queued";
  const progress = clampProgress(item.progress, status);
  const progressRatio = progress / 100;
  const showProgress = status === "uploading" || status === "success";

  return (
    <motion.li
      layout={!reduce}
      initial={
        reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={
        reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }
      }
      transition={ROW_TRANSITION}
      className={cn(
        "relative overflow-hidden rounded-panel border border-border bg-background p-3",
        classNames?.item,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-card bg-muted text-muted-foreground",
            classNames?.leading,
          )}
        >
          {getFileIcon()}
        </div>

        <div className={cn("min-w-0 flex-1", classNames?.content)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-body font-medium text-foreground",
                  classNames?.name,
                )}
              >
                {item.name}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-caption text-muted-foreground",
                  classNames?.meta,
                )}
              >
                {fileKind(item)} · {formatBytes(item.size)}
                {status === "error" && item.error ? ` · ${item.error}` : null}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <StatusIcon status={status} reduce={reduce} />
              {status === "error" ? (
                <button
                  type="button"
                  onClick={() => onRetry(item)}
                  aria-label={`重试 ${item.name}`}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:scale-95",
                    classNames?.action,
                  )}
                >
                  <IconRotate size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`移除 ${item.name}`}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:scale-95",
                  classNames?.action,
                )}
              >
                <IconClose size={16} />
              </button>
            </div>
          </div>

          {showProgress ? (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label={`${item.name} upload progress`}
              className={cn(
                "mt-3 h-1.5 overflow-hidden rounded-full bg-muted",
                classNames?.progress,
              )}
            >
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  status === "success"
                    ? "bg-status-success/10"
                    : "bg-foreground",
                )}
                style={{
                  transformOrigin: "left",
                  transform: reduce ? `scaleX(${progressRatio})` : undefined,
                }}
                initial={false}
                animate={
                  reduce ? undefined : { transform: `scaleX(${progressRatio})` }
                }
                transition={{ duration: 0.28, ease: EASE_OUT }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function FileUpload({
  value,
  defaultValue,
  onValueChange,
  onFilesAdded,
  onRemove,
  onRetry,
  accept,
  multiple = true,
  maxFiles,
  disabled = false,
  variant = "default",
  title = "把文件拖到这里",
  description = "加入上传队列",
  browseLabel = "浏览文件",
  className,
  classNames,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const reduce = useReducedMotion() ?? false;
  const [items, setItems] = useControllableUpload({
    value,
    defaultValue,
    onValueChange,
  });
  const [dragging, setDragging] = useState(false);

  const commit = useCallback(
    (next: FileUploadItem[]) => {
      setItems(next);
    },
    [setItems],
  );

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      if (disabled || incomingFiles.length === 0) return;

      const remainingSlots =
        maxFiles === undefined ? incomingFiles.length : maxFiles - items.length;
      if (remainingSlots <= 0) return;

      const files = incomingFiles.slice(
        0,
        multiple ? remainingSlots : Math.min(1, remainingSlots),
      );
      const added = files.map((file, index) => createFileUploadItem(file, index));

      if (added.length === 0) return;

      commit([...items, ...added]);
      onFilesAdded?.(added, files);
    },
    [commit, disabled, items, maxFiles, multiple, onFilesAdded],
  );

  const removeItem = useCallback(
    (item: FileUploadItem) => {
      commit(items.filter((entry) => entry.id !== item.id));
      onRemove?.(item);
    },
    [commit, items, onRemove],
  );

  const retryItem = useCallback(
    (item: FileUploadItem) => {
      const retryingItem = {
        ...item,
        error: undefined,
        progress: 0,
        status: "uploading" as const,
      };

      commit(
        items.map((entry) => (entry.id === item.id ? retryingItem : entry)),
      );
      onRetry?.(retryingItem);
    },
    [commit, items, onRetry],
  );

  const resetDrag = useCallback(() => {
    dragDepthRef.current = 0;
    setDragging(false);
  }, []);

  const maxReached = maxFiles !== undefined && items.length >= maxFiles;
  const centered = variant === "centered";

  return (
    <div className={cn("w-full space-y-3", className, classNames?.root)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        aria-label="Upload files"
        accept={accept}
        multiple={multiple}
        disabled={disabled || maxReached}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled || maxReached}
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          resetDrag();
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "group relative flex w-full overflow-hidden rounded-panel border border-dashed border-border bg-background outline-none",
          "transition-border-color-transform duration-200 active:scale-99",
          "hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[dragging=true]:border-foreground",
          "disabled:pointer-events-none disabled:opacity-55",
          centered
            ? "min-h-56 flex-col items-center justify-center gap-3 p-7 text-center"
            : "items-center gap-4 p-5 text-left",
          classNames?.dropzone,
        )}
      >
        <motion.span
          aria-hidden="true"
          className={cn(
            "grid shrink-0 place-items-center bg-muted text-foreground",
            centered
              ? "h-16 w-16 rounded-panel border border-border"
              : "h-14 w-14 rounded-panel",
          )}
          animate={
            reduce
              ? undefined
              : {
                  transform: dragging
                    ? "translateY(-2px)"
                    : "translateY(0px)",
                }
          }
          transition={FAST_TRANSITION}
        >
          <IconUpload size={centered ? 24 : 18} />
        </motion.span>

        <span className={cn("min-w-0", centered ? "max-w-xs" : "flex-1")}>
          <span
            className={cn(
              "block font-semibold text-foreground",
              centered ? "text-body" : "text-body",
            )}
          >
            {maxReached ? "已达到上传上限" : title}
          </span>
          <span
            className={cn(
              "block text-caption text-muted-foreground",
              centered ? "mt-1 leading-5" : "mt-0.5",
            )}
          >
            {maxReached
              ? `已添加 ${items.length} / ${maxFiles} 个文件`
              : description}
          </span>
        </span>

        <span
          className={cn(
            "shrink-0 rounded-full border border-border text-caption font-medium text-foreground transition-colors duration-150 group-hover:bg-muted",
            centered ? "mt-1 px-4 py-2" : "px-3.5 py-2",
          )}
        >
          {browseLabel}
        </span>
      </button>

      <ul className={cn("space-y-2", classNames?.queue)}>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <FileUploadRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onRetry={retryItem}
              classNames={classNames}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
