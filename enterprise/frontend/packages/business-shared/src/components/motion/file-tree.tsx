"use client";
import { useMotionPreference as useReducedMotion } from "@/lib/motion-preference";
// beui.dev/components/motion/file-tree

import { AnimatePresence, motion } from "motion/react";
import { IconChevron, IconFile, IconFolder } from "../../shared/icons";
import {
  Children,
  Fragment,
  useCallback,
  useEffect,
  isValidElement,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SharedLayoutBg } from "@/components/motion/shared-layout-bg";
import { Tooltip } from "@/components/motion/tooltip";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

type FileTreeItem = {
  value: string;
  name: string;
  type: "file" | "folder";
  children?: FileTreeItem[];
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  dimmed?: boolean;
};

export interface FileTreeFolderProps {
  value: string;
  name: string;
  icon?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  dimmed?: boolean;
}

export interface FileTreeFileProps {
  value: string;
  name: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  dimmed?: boolean;
}

export type FileTreeClassNames = {
  tree?: string;
  item?: string;
  icon?: string;
  label?: string;
};

export interface FileTreeProps {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedChange?: (expandedIds: string[]) => void;
  ariaLabel?: string;
  indent?: number;
  compact?: boolean;
  className?: string;
  dimmed?: boolean;
  classNames?: FileTreeClassNames;
}

type FlatFileTreeItem = {
  item: FileTreeItem;
  depth: number;
  parentId: string | null;
  position: number;
  setSize: number;
};

// These declarative parts are read by FileTree and turned into one flattened,
// keyboard-navigable collection. They intentionally render nothing alone.
export function FileTreeFolder(_props: FileTreeFolderProps) {
  return null;
}

export function FileTreeFile(_props: FileTreeFileProps) {
  return null;
}

const ROW_ENTER = { duration: 0.22, ease: EASE_OUT } as const;
const BRANCH_DRAW = { duration: 0.3, ease: EASE_OUT } as const;

function flattenItems(
  items: FileTreeItem[],
  expanded: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
): FlatFileTreeItem[] {
  return items.flatMap((item, index) => {
    const row = {
      item,
      depth,
      parentId,
      position: index + 1,
      setSize: items.length,
    };

    if (
      item.type !== "folder" ||
      !expanded.has(item.value) ||
      !item.children?.length
    ) {
      return [row];
    }

    return [
      row,
      ...flattenItems(item.children, expanded, depth + 1, item.value),
    ];
  });
}

function findItem(items: FileTreeItem[], id: string): FileTreeItem | undefined {
  for (const item of items) {
    if (item.value === id) return item;
    if (item.children?.length) {
      const nested = findItem(item.children, id);
      if (nested) return nested;
    }
  }
}

function descendantFolderIds(item: FileTreeItem): string[] {
  if (item.type !== "folder" || !item.children?.length) return [];
  const ids: string[] = [];
  for (const child of item.children) {
    if (child.type !== "folder") continue;
    ids.push(child.value, ...descendantFolderIds(child));
  }
  return ids;
}

function eventElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isChevronTarget(target: EventTarget | null) {
  return Boolean(eventElement(target)?.closest("[data-tree-chevron]"));
}

function itemsFromChildren(children: ReactNode): FileTreeItem[] {
  const items: FileTreeItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === Fragment) {
      const props = child.props as { children?: ReactNode };
      items.push(...itemsFromChildren(props.children));
      return;
    }

    if (child.type === FileTreeFolder) {
      const props = child.props as FileTreeFolderProps;
      items.push({
        value: props.value,
        name: props.name,
        type: "folder",
        icon: props.icon,
        disabled: props.disabled,
        className: cn(props.className, props.dimmed && "opacity-50"),
        children: itemsFromChildren(props.children),
      });
      return;
    }

    if (child.type === FileTreeFile) {
      const props = child.props as FileTreeFileProps;
      items.push({
        value: props.value,
        name: props.name,
        type: "file",
        icon: props.icon,
        disabled: props.disabled,
        className: cn(props.className, props.dimmed && "opacity-50"),
      });
    }
  });

  return items;
}

function DefaultIcon({
  item,
  open,
  reduce,
}: {
  item: FileTreeItem;
  open: boolean;
  reduce: boolean;
}) {
  if (item.type === "file") return <IconFile size={16} />;
  if (reduce) {
    return <IconFolder size={16} />;
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={open ? "open" : "closed"}
        initial={{ opacity: 0, scale: 0.75, rotate: open ? -8 : 8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.75, rotate: open ? 8 : -8 }}
        transition={SPRING_SWAP}
        className="absolute inset-0 grid place-items-center"
      >
        <IconFolder size={16} />
      </motion.span>
    </AnimatePresence>
  );
}

export function FileTree({
  children,
  value,
  defaultValue = null,
  onValueChange,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  ariaLabel = "文件目录",
  indent = 18,
  compact = false,
  className,
  classNames,
}: FileTreeProps) {
  const reduce = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalExpandedIds, setInternalExpandedIds] = useState(
    defaultExpandedIds,
  );
  const [focusedId, setFocusedId] = useState<string | null>(
    value ?? defaultValue,
  );
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedId = value === undefined ? internalValue : value;
  const currentExpandedIds = expandedIds ?? internalExpandedIds;
  const expanded = useMemo(
    () => new Set(currentExpandedIds),
    [currentExpandedIds],
  );
  const items = useMemo(() => itemsFromChildren(children), [children]);
  const rows = useMemo(() => {
    const visible = flattenItems(items, expanded);
    return compact ? visible.filter((row) => row.depth === 0) : visible;
  }, [compact, expanded, items]);

  // Keep a real row tabbable in the first commit and immediately after a
  // collapse removes the previously focused descendant.
  const focusedRow =
    focusedId !== null && rows.some(({ item }) => item.value === focusedId)
      ? focusedId
      : (rows[0]?.item.value ?? null);

  useEffect(() => {
    if (focusedId !== focusedRow) setFocusedId(focusedRow);
  }, [focusedId, focusedRow]);

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    const row = rowRefs.current.get(id);
    if (row) row.focus();
    else requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  }, []);

  const selectItem = useCallback(
    (item: FileTreeItem) => {
      if (item.disabled) return;
      if (value === undefined) setInternalValue(item.value);
      onValueChange?.(item.value);
    },
    [onValueChange, value],
  );

  const setExpanded = useCallback(
    (next: string[]) => {
      if (expandedIds === undefined) setInternalExpandedIds(next);
      onExpandedChange?.(next);
    },
    [expandedIds, onExpandedChange],
  );

  const toggleFolder = useCallback(
    (id: string) => {
      const next = new Set(currentExpandedIds);
      if (next.has(id)) {
        next.delete(id);
        const folder = findItem(items, id);
        if (folder) {
          for (const descendant of descendantFolderIds(folder)) next.delete(descendant);
        }
      } else {
        next.add(id);
      }
      setExpanded(Array.from(next));
    },
    [currentExpandedIds, items, setExpanded],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, row: FlatFileTreeItem) => {
      const index = rows.findIndex(({ item }) => item.value === row.item.value);
      const previous = rows[index - 1];
      const next = rows[index + 1];
      const isFolder = row.item.type === "folder";
      const isOpen = expanded.has(row.item.value);

      if (event.key === "ArrowDown" && next) {
        event.preventDefault();
        focusRow(next.item.value);
      } else if (event.key === "ArrowUp" && previous) {
        event.preventDefault();
        focusRow(previous.item.value);
      } else if (event.key === "Home" && rows[0]) {
        event.preventDefault();
        focusRow(rows[0].item.value);
      } else if (event.key === "End" && rows.at(-1)) {
        event.preventDefault();
        focusRow(rows.at(-1)?.item.value ?? row.item.value);
      } else if (event.key === "ArrowRight" && isFolder) {
        event.preventDefault();
        if (!isOpen && !row.item.disabled) toggleFolder(row.item.value);
        else if (next?.parentId === row.item.value) focusRow(next.item.value);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (isFolder && isOpen && !row.item.disabled)
          toggleFolder(row.item.value);
        else if (row.parentId) focusRow(row.parentId);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (row.item.disabled) return;
        selectItem(row.item);
        if (isFolder && !isOpen) toggleFolder(row.item.value);
      } else if (event.key === " ") {
        event.preventDefault();
        if (row.item.disabled) return;
        if (isFolder) toggleFolder(row.item.value);
        else selectItem(row.item);
      } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + Math.min(24, rect.width / 2),
            clientY: rect.top + rect.height / 2,
          }),
        );
      }
    },
    [expanded, focusRow, rows, selectItem, toggleFolder],
  );

  return (
    <div className={cn("min-w-0", className, classNames?.tree)}><SharedLayoutBg
      role="tree"
      aria-label={ariaLabel}
      aria-multiselectable="false"
      inset={0}
      pillClassName=""
      pillContainerClassName="inset-y-auto top-0 h-9"
      className="min-w-0"
    >
      {rows.map((row) => {
          const isFolder = row.item.type === "folder";
          const isOpen = isFolder && expanded.has(row.item.value);
          const isSelected = selectedId === row.item.value;

          const rowButton = (
              <button
                ref={(node) => {
                  if (node) rowRefs.current.set(row.item.value, node);
                  else rowRefs.current.delete(row.item.value);
                }}
                type="button"
                role="treeitem"
                aria-label={compact ? row.item.name : undefined}
                aria-level={row.depth + 1}
                aria-posinset={row.position}
                aria-setsize={row.setSize}
                aria-selected={isSelected}
                aria-expanded={isFolder ? isOpen : undefined}
                aria-disabled={row.item.disabled || undefined}
                data-tree-item={row.item.value}
                tabIndex={focusedRow === row.item.value ? 0 : -1}
                onFocus={() => setFocusedId(row.item.value)}
                onKeyDown={(event) => handleKeyDown(event, row)}
                onPointerDown={(event) => {
                  if (row.item.disabled || event.button !== 2) return;
                  selectItem(row.item);
                }}
                onContextMenu={() => {
                  if (row.item.disabled) return;
                  selectItem(row.item);
                }}
                onClick={(event) => {
                  if (row.item.disabled) return;
                  if (isFolder && isChevronTarget(event.target)) {
                    event.preventDefault();
                    return;
                  }
                  selectItem(row.item);
                  if (isFolder && (!isOpen || isSelected)) toggleFolder(row.item.value);
                }}
                className={cn(
                  "group/file-tree relative flex h-9 w-full items-center overflow-hidden rounded-control text-left text-body text-muted-foreground outline-none",
                  "transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "aria-disabled:cursor-not-allowed",
                  compact ? "shrink-0 justify-center gap-0 px-0" : "gap-2 pr-2",
                  isSelected && "bg-muted font-medium text-foreground",
                  classNames?.item,
                  row.item.className,
                )}
                style={compact ? undefined : { paddingLeft: 8 + row.depth * indent }}
              >
                {!compact && row.depth > 0 ? (
                  <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={reduce ? { duration: 0 } : BRANCH_DRAW}
                    className="absolute top-0 bottom-0 w-px origin-top bg-border/70"
                    style={{ left: 16 + (row.depth - 1) * indent }}
                  />
                ) : null}

                {!compact ? (
                  <motion.span
                    data-tree-chevron={isFolder ? "" : undefined}
                    aria-hidden="true"
                    title={isFolder ? (isOpen ? "收起" : "展开") : undefined}
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={reduce ? { duration: 0 } : SPRING_SWAP}
                    onPointerDown={(event) => {
                      if (!isFolder || row.item.disabled || event.button !== 0) return;
                      event.preventDefault();
                      event.stopPropagation();
                      toggleFolder(row.item.value);
                    }}
                    className={cn(
                      "relative z-10 grid size-6 shrink-0 place-items-center rounded-control",
                      isFolder
                        ? "cursor-pointer hover:bg-foreground/10 hover:text-foreground"
                        : "pointer-events-none opacity-0",
                    )}
                  >
                    <IconChevron size={16} />
                  </motion.span>
                ) : null}

                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 grid size-5 shrink-0 place-items-center",
                    row.item.icon
                      ? "text-transparent"
                      : "text-muted-foreground transition-colors group-hover/file-tree:text-foreground",
                    !row.item.icon && isFolder && isOpen && "text-foreground",
                    classNames?.icon,
                  )}
                >
                  {row.item.icon ?? (
                    <DefaultIcon
                      item={row.item}
                      open={isOpen}
                      reduce={reduce}
                    />
                  )}
                </span>

                {compact ? (
                  <span className="sr-only">{row.item.name}</span>
                ) : (
                  <span
                    className={cn(
                      "relative z-10 min-w-0 flex-1 truncate",
                      classNames?.label,
                    )}
                  >
                    {row.item.name}
                  </span>
                )}
              </button>
          );

          return (
            <motion.div
              layout={reduce ? false : "position"}
              key={row.item.value}
              data-tree-item={row.item.value}
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{
                opacity: row.item.disabled ? 0.42 : 1,
                y: 0,
                transition: reduce
                  ? { duration: 0 }
                  : {
                      ...ROW_ENTER,
                      delay: Math.min(row.position * 0.025, 0.1),
                    },
              }}
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            >
              {compact ? (
                <Tooltip
                  content={row.item.name}
                  side="right"
                  wrapperClassName="w-full"
                >
                  {rowButton}
                </Tooltip>
              ) : (
                rowButton
              )}
            </motion.div>
          );
        })}
    </SharedLayoutBg></div>
  );
}
