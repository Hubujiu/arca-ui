import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { ActionSurface } from "@/components/controls";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronRight,
  UserRound,
  Users,
} from "@/shared/icons/catalog";
import { CloseAction, SearchAction } from "@/shared/icons/motion";
import { Button } from "@/components/motion/button";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { Checkbox } from "@/components/motion/checkbox";
import { Input } from "@/components/motion/input";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./PersonAvatar";
import {
  buildPickerTree,
  collectTreeIds,
  collectTreePeople,
  filterPickerTree,
  loginBoundPerson,
  moveSelected,
  peopleInUnit,
  personMatches,
  resolvePickerPerson,
  togglePeople,
  unitCheckState,
  type PickerTreeNode,
} from "./people-picker";
import {
  unitPath,
  type Directory,
  type Person,
} from "./model";

export type PeoplePickerProps = {
  directory: Directory;
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  limit?: number;
  disabled?: boolean;
  eligible?: (person: Person) => boolean;
  ordered?: boolean;
  className?: string;
};

function unitIcon(kind: PickerTreeNode["kind"]) {
  return kind === "COMPANY" || kind === "UNASSIGNED" ? Building2 : Users;
}

function TreeNode({
  node,
  directory,
  depth,
  expanded,
  selected,
  multiple,
  disabled,
  limit,
  eligible,
  onToggleExpand,
  onChange,
}: {
  node: PickerTreeNode;
  directory: Directory;
  depth: number;
  expanded: Set<string>;
  selected: string[];
  multiple: boolean;
  disabled: boolean;
  limit: number;
  eligible: (person: Person) => boolean;
  onToggleExpand: (id: string) => void;
  onChange: (value: string[]) => void;
}) {
  const selectedSet = new Set(selected);
  const memberIds = peopleInUnit(directory, node.id, eligible).map(
    (person) => person.id,
  );
  const state = unitCheckState(selectedSet, memberIds);
  const open = expanded.has(node.id);
  const Icon = unitIcon(node.kind);
  const hasChildren = node.children.length > 0 || node.people.length > 0;
  const atLimit = selected.length >= limit;
  return (
    <div>
      <div
        className="dw-data-people-picker-1 flex min-h-9 items-center gap-1 rounded-control pr-2 hover:bg-muted/70"
        style={({ "--dw-data-people-picker-1-padding-left": cssLength(8 + depth * 14) }) as DataStyle}
      >
        {hasChildren ? (
          <ActionSurface
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "折叠" : "展开"}${node.name}`}
            onClick={() => onToggleExpand(node.id)}
            className="inline-flex size-7 shrink-0 items-center justify-center"
          >
            <span className={["inline-flex", cn("transition-transform", open && "rotate-90")].filter(Boolean).join(" ")}><ChevronRight
              size={14}

            /></span>
          </ActionSurface>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        {multiple ? (
          <Checkbox
            checked={state === "checked"}
            indeterminate={state === "indeterminate"}
            disabled={
              disabled ||
              (!memberIds.length && state !== "checked") ||
              (atLimit && state === "unchecked")
            }
            aria-label={`选择${node.name}的全部人员`}
            onCheckedChange={(checked) =>
              onChange(
                togglePeople(selected, memberIds, checked, {
                  multiple,
                  limit,
                }),
              )
            }
          />
        ) : null}
        <Icon size={14} className="shrink-0 text-muted-foreground" />
        <ActionSurface
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className="min-w-0 flex-1 truncate text-left"
        >
          {node.name}
        </ActionSurface>
        <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
          {memberIds.length}
        </span>
      </div>
      {open && (
        <div>
          {node.people.map((person) => {
            const checked = selectedSet.has(person.id);
            const blocked = !eligible(person) && !checked;
            return (
              <ActionSurface
                type="button"
                key={person.id}
                role="checkbox"
                aria-checked={checked}
                disabled={disabled || blocked || (!checked && atLimit)}
                title={unitPath(directory.units, person.orgUnitId)}
                onClick={() =>
                  onChange(
                    togglePeople(selected, [person.id], !checked, {
                      multiple,
                      limit,
                    }),
                  )
                }
                className="dw-data-people-picker-2 flex min-h-9 w-full items-center gap-2 text-left disabled:opacity-50"
                style={({ "--dw-data-people-picker-2-padding-left": cssLength(36 + depth * 14) }) as DataStyle}
              >
                {multiple ? (
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-control border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked ? <Check size={11} /> : null}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      checked
                        ? "border-primary bg-primary"
                        : "border-border",
                    )}
                  >
                    {checked ? (
                      <span className="block size-1.5 rounded-full bg-primary-foreground" />
                    ) : null}
                  </span>
                )}
                <PersonAvatar person={person} size="sm" />
                <span className="min-w-0 flex-1 truncate text-body">
                  {person.displayName}
                  {!person.enabled && "（已停用）"}
                </span>
              </ActionSurface>
            );
          })}
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              directory={directory}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              multiple={multiple}
              disabled={disabled}
              limit={limit}
              eligible={eligible}
              onToggleExpand={onToggleExpand}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedPerson({
  person,
  directory,
  disabled,
  ordered,
  index,
  total,
  onExclude,
  onMove,
}: {
  person: Person;
  directory: Directory;
  disabled: boolean;
  ordered: boolean;
  index: number;
  total: number;
  onExclude: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const canHover = useHoverCapable();
  return (
    <div
      className="group relative flex min-h-11 items-center gap-2.5 rounded-card px-2 py-1.5 hover:bg-muted/80"
      title={unitPath(directory.units, person.orgUnitId)}
    >
      {ordered && (
        <span className="w-4 shrink-0 text-center text-caption tabular-nums text-muted-foreground">
          {index + 1}
        </span>
      )}
      <PersonAvatar person={person} />
      <span className="min-w-0 flex-1 truncate text-body">
        {person.displayName}
        {!person.enabled && (
          <span className="ml-1 text-caption text-destructive">已停用</span>
        )}
      </span>
      {ordered && (
        <span className="flex shrink-0">
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled || index === 0}
            aria-label={`上移${person.displayName}`}

            onClick={() => onMove(-1)}
          >
            <ArrowUp size={12} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled || index === total - 1}
            aria-label={`下移${person.displayName}`}

            onClick={() => onMove(1)}
          >
            <ArrowDown size={12} />
          </Button>
        </span>
      )}
      <ActionSurface
        type="button"
        aria-label={`排除${person.displayName}`}
        disabled={disabled}
        onClick={onExclude}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center focus-visible:opacity-100 disabled:opacity-40",
          canHover
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100",
        )}
      >
        <CloseAction size={14} />
      </ActionSurface>
    </div>
  );
}

export function PeoplePicker({
  directory,
  value,
  onChange,
  multiple = true,
  limit = Number.POSITIVE_INFINITY,
  disabled = false,
  eligible = loginBoundPerson,
  ordered = false,
  className,
}: PeoplePickerProps) {
  const [treeQuery, setTreeQuery] = useState("");
  const [selectedQuery, setSelectedQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = useMemo(
    () => buildPickerTree(directory, eligible, value),
    [directory, eligible, value],
  );
  const visibleTree = useMemo(
    () => filterPickerTree(tree, treeQuery, directory),
    [tree, treeQuery, directory],
  );
  useEffect(() => {
    setExpanded((current) => {
      if (current.size) return current;
      return new Set(tree.map((node) => node.id));
    });
  }, [tree]);
  useEffect(() => {
    if (!treeQuery.trim()) return;
    setExpanded(new Set(collectTreeIds(visibleTree)));
  }, [treeQuery, visibleTree]);
  const selectedPeople = value.map((id) => resolvePickerPerson(directory, id));
  const visibleSelected = selectedPeople.filter((person) =>
    personMatches(person, selectedQuery, directory),
  );
  function toggleExpand(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const leftEmpty = !visibleTree.length;
  const treePeopleCount = visibleTree.reduce(
    (sum, node) => sum + collectTreePeople(node).length,
    0,
  );
  return (
    <div
      className={cn(
        "grid h-full min-h-88 overflow-hidden rounded-control border border-border bg-background md:grid-cols-2",
        className,
      )}
    >
      <section
        className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r"
        aria-label="组织与人员"
      >
        <div className="border-b border-border p-3">
          <Input
            aria-label="搜索部门或人员"
            placeholder="搜索部门、姓名或账号"
            value={treeQuery}
            onChange={setTreeQuery}
            leftIcon={<SearchAction size={16} />}
            classNames={{ field: "" }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {leftEmpty ? (
            <p className="px-3 py-10 text-center text-body leading-6 text-muted-foreground">
              {treeQuery.trim()
                ? "没有匹配的部门或人员，试试姓名、账号或部门名称"
                : "通讯录还没有可选择的人员"}
            </p>
          ) : (
            visibleTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                directory={directory}
                depth={0}
                expanded={expanded}
                selected={value}
                multiple={multiple}
                disabled={disabled}
                limit={limit}
                eligible={eligible}
                onToggleExpand={toggleExpand}
                onChange={onChange}
              />
            ))
          )}
        </div>
        <p className="border-t border-border px-3 py-2 text-caption text-muted-foreground">
          {treeQuery.trim()
            ? `匹配 ${treePeopleCount} 人`
            : "勾选部门会选中其下全部人员"}
        </p>
      </section>
      <section
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        aria-label="已选人员"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <h3 className="text-body font-medium">
            已选人员
            <span className="ml-1.5 font-normal text-muted-foreground">
              {value.length}
              {Number.isFinite(limit) ? ` / ${limit}` : ""}
            </span>
          </h3>
        </div>
        <div className="border-b border-border p-3">
          <Input
            aria-label="搜索已选人员"
            placeholder="在已选人员中搜索"
            value={selectedQuery}
            onChange={setSelectedQuery}
            leftIcon={<SearchAction size={16} />}
            classNames={{ field: "" }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {visibleSelected.map((person) => (
            <SelectedPerson
              key={person.id}
              person={person}
              directory={directory}
              disabled={disabled}
              ordered={ordered}
              index={value.indexOf(person.id)}
              total={value.length}
              onExclude={() =>
                onChange(value.filter((id) => id !== person.id))
              }
              onMove={(delta) => onChange(moveSelected(value, person.id, delta))}
            />
          ))}
          {!value.length && (
            <p className="px-3 py-10 text-center text-body leading-6 text-muted-foreground">
              在左侧勾选部门或人员，已选的人会显示在这里
            </p>
          )}
          {!!value.length && !visibleSelected.length && (
            <p className="px-3 py-10 text-center text-body leading-6 text-muted-foreground">
              已选人员中没有匹配“{selectedQuery.trim()}”的结果，试试姓名或部门
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SelectedSummary({
  directory,
  value,
  placeholder,
}: {
  directory: Directory;
  value: string[];
  placeholder: string;
}) {
  if (!value.length)
    return <span className="text-muted-foreground">{placeholder}</span>;
  const people = value.map((id) => resolvePickerPerson(directory, id));
  const names = people.map((person) => person.displayName);
  const label =
    names.length <= 3
      ? names.join("、")
      : `${names.slice(0, 2).join("、")} 等 ${names.length} 人`;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-1.5">
        {people.slice(0, 4).map((person) => (
          <PersonAvatar
            key={person.id}
            person={person}
            size="sm"
            className="ring-2 ring-background"
          />
        ))}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PeoplePickerField({
  directory,
  value,
  onChange,
  multiple = true,
  limit,
  disabled = false,
  eligible,
  ordered = false,
  placeholder = "选择人员",
  label,
  id,
  describedBy,
  invalid,
  required,
  className,
}: PeoplePickerProps & {
  placeholder?: string;
  label?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const title = label ? `选择${label}` : "选择人员";
  return (
    <>
      <ActionSurface
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-required={required}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "",
          className,
        )}
      >
        <SelectedSummary
          directory={directory}
          value={value}
          placeholder={placeholder}
        />
        <span className="inline-flex size-4 shrink-0 text-muted-foreground"><UserRound  /></span>
      </ActionSurface>
      <CenterMorphModal open={open} onOpenChange={setOpen}>
        <CenterMorphModalContent
          ariaLabel={title}
          className="w-full max-w-4xl p-0"
        >
          <div className="px-6 pb-3 pt-6 pr-14">
            <h2 className="text-title font-medium tracking-tight">{title}</h2>
            <p className="mt-1 text-body text-muted-foreground">
              左侧按组织勾选，右侧预览并排除已选人员。
            </p>
          </div>
          <PeoplePicker
            directory={directory}
            value={draft}
            onChange={setDraft}
            multiple={multiple}
            limit={limit}
            disabled={disabled}
            eligible={eligible}
            ordered={ordered}
            className="mx-4 min-h-0 flex-1"
          />
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              确定
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </>
  );
}
