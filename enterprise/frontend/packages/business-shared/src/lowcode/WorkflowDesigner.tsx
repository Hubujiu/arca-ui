import { cssLength } from "@/lib/data-style";
import type { DataStyle } from "@/lib/data-style";
import { ActionSurface, TextEntry } from "@/components/controls";
import { useId, useMemo, useState, type CSSProperties } from "react";
import * as Popover from "@/components/overlays/popover";
import {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CircleStop,
  GitBranch,
  Hand,
  Mail,
  Maximize2,
  Settings2,
  ShieldCheck,
  ClipboardCheck,
  UserRound,
  Users,
  ZoomIn,
  ZoomOut,
} from "@/shared/icons/catalog";
import { CloseAction, PlusAction, SettingsAction, TrashAction } from "@/shared/icons/motion";
import { AppModal, Button } from "@/shared/ui";
import { Switch } from "@/components/motion/switch";
import { cn } from "@/lib/utils";
import { type Directory } from "../organization/model";
import {
  type TableSchema,
} from "./field-model";
import { RuleEditor } from "./RuleEditor";
import { WorkflowRecipientSettings } from "./WorkflowRecipientSettings";
import { WorkflowFieldPermissions } from "./WorkflowFieldPermissions";
import { WorkflowActionSettings } from "./WorkflowActionSettings";
import { WorkflowLifecycleSettings } from "./WorkflowLifecycleSettings";
import { WorkflowAutoApprovalSettings } from "./WorkflowAutoApprovalSettings";
import {
  addWorkflowBranch,
  changeWorkflowApprovalMode,
  conditionFields,
  conditionLabel,
  insertWorkflowNode,
  moveWorkflowBranch,
  nodeTypeLabels,
  removeWorkflowBranch,
  removeWorkflowNode,
  validateWorkflow,
  workflowDescendants,
  workflowParent,
  workflowPositions,
  workflowRecipientSummary,
  workflowVoteRequired,
  type BranchCondition,
  type InsertableNodeType,
  type TreeModel,
  type WorkflowDraft,
  type WorkflowNode,
  type WorkflowNodeType,
} from "./workflow-model";

export { initialWorkflow } from "./workflow-model";
export type { WorkflowDraft, TreeModel, WorkflowNode } from "./workflow-model";

export type WorkflowDesignerProps = {
  value: WorkflowDraft;
  onChange: (value: WorkflowDraft) => void;
  directory: Directory;
  schema: TableSchema;
  disabled?: boolean;
  /** Named approval definitions configure their trigger outside the canvas. */
  showLegacyTriggers?: boolean;
};
const mixHue = (hue: string, pct: number, base = "var(--card)") =>
  `color-mix(in srgb, ${hue} ${pct}%, ${base})`;
const nodeVisuals = {
  START: {
    icon: UserRound,
    hue: "var(--primary-text)",
    caption: "表单提交后进入流程",
  },
  APPROVAL: {
    icon: ShieldCheck,
    hue: "var(--warning)",
    caption: "由指定成员完成审批",
  },
  HANDLING: {
    icon: ClipboardCheck,
    hue: "var(--success)",
    caption: "由指定成员依次完成办理",
  },
  CC: {
    icon: Mail,
    hue: "var(--primary-text)",
    caption: "通知相关成员查看",
  },
  CONDITION: {
    icon: GitBranch,
    hue: "var(--warning)",
    caption: "按表单内容选择一条分支",
  },
  END: {
    icon: CircleStop,
    hue: "var(--muted-foreground)",
    caption: "完成当前分支",
  },
} satisfies Record<
  WorkflowNodeType,
  { icon: typeof UserRound; hue: string; caption: string }
>;
type FlowCardData = {
  model: WorkflowNode;
  detail: string;
  issue: string;
  branches?: string[];
  active: boolean;
  select: () => void;
};
type FlowCardNode = Node<FlowCardData, "workflowCard">;
type FlowEdge = Edge<
  {
    branch?: string;
    lit: boolean;
    disabled: boolean;
    insert: (type: InsertableNodeType) => void;
    select: () => void;
  },
  "workflowEdge"
>;

function InsertionMenu({
  onInsert,
  disabled,
  label = "插入节点",
  compact = false,
}: {
  onInsert: (type: InsertableNodeType) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <ActionSurface
          type="button"
          aria-label={label}
          title={label}
          disabled={disabled}
          className={cn(
            "nodrag nopan inline-flex items-center justify-center gap-1.5 disabled:opacity-40",
            compact
              ? "size-7"
              : "",
          )}
        >
          <PlusAction size={compact ? 15 : 14} />
          {!compact && label}
        </ActionSurface>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content data-dw-surface="popover"
          side="right"
          align="center"
          sideOffset={10}
          collisionPadding={12}
          className="p-2"
        >
          <p className="px-3 pb-2 pt-1 text-caption text-muted-foreground">
            添加下一步
          </p>
          {(["APPROVAL", "HANDLING", "CC", "CONDITION"] as const).map((type) => {
            const visual = nodeVisuals[type];
            return (
              <ActionSurface
                type="button"
                key={type}
                disabled={disabled}
                onClick={() => {
                  onInsert(type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 text-left disabled:opacity-40"
              >
                <span
                  className="dw-data-workflow-designer-1 flex size-9 shrink-0 items-center justify-center rounded-control"
                  style={({
                    "--dw-data-workflow-designer-1-background": mixHue(visual.hue, 12),
                    "--dw-data-workflow-designer-1-color": visual.hue,
                    "--dw-data-workflow-designer-1-box-shadow": `0 0 0 1px ${mixHue(visual.hue, 20)}`,
                  }) as DataStyle}
                >
                  <visual.icon size={17} />
                </span>
                <span>
                  <strong className="block text-body font-medium">
                    {nodeTypeLabels[type]}
                  </strong>
                  <small className="text-caption text-muted-foreground">
                    {visual.caption}
                  </small>
                </span>
              </ActionSurface>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
function WorkflowCard({ data }: NodeProps<FlowCardNode>) {
  const node = data.model,
    visual = nodeVisuals[node.type] ?? nodeVisuals.END,
    Icon = visual.icon;
  return (
    <div className="relative flex w-75 flex-col items-start gap-1.5">
      <span
        className="dw-data-workflow-designer-2 inline-flex h-6 items-center rounded-control px-2 text-caption font-medium"
        style={({
          "--dw-data-workflow-designer-2-background": mixHue(visual.hue, 14, "var(--background)"),
          "--dw-data-workflow-designer-2-color": mixHue(visual.hue, 80, "var(--foreground)"),
        }) as DataStyle}
      >
        {nodeTypeLabels[node.type]}
      </span>
      {node.type !== "START" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          style={({ "--dw-data-workflow-designer-3-top": cssLength(30) }) as DataStyle}
          className="dw-data-workflow-designer-3 !size-1 !opacity-0"
        />
      )}
      <ActionSurface
        type="button"
        onClick={data.select}
        className="nodrag nopan w-full text-left"
        aria-label={`${node.name}，${data.detail}${data.issue ? `，待完善：${data.issue}` : ""}`}
        aria-pressed={data.active}
      >
        {node.type === "CONDITION" && data.branches?.length ? (
          <span className="flex flex-col gap-1.5 px-3 py-2.5">
            {data.branches.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                <span className="w-11 shrink-0 text-caption text-muted-foreground">
                  {index === 0
                    ? "若"
                    : index === data.branches!.length - 1
                      ? "否则"
                      : "否则若"}
                </span>
                <span className="min-w-0 truncate rounded-control bg-muted px-1.5 py-0.5 text-caption font-medium">
                  {label}
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-2.5 p-2.5">
            <span
              className="dw-data-workflow-designer-4 flex size-9 shrink-0 items-center justify-center rounded-control"
              style={({
                "--dw-data-workflow-designer-4-background": mixHue(visual.hue, 12),
                "--dw-data-workflow-designer-4-color": visual.hue,
                "--dw-data-workflow-designer-4-box-shadow": `0 0 0 1px ${mixHue(visual.hue, 20)}`,
              }) as DataStyle}
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0 text-left">
              <strong className="block truncate text-body font-semibold leading-tight">
                {node.name || "未命名节点"}
              </strong>
              <span className="mt-0.5 block truncate text-caption leading-snug text-muted-foreground">
                {data.detail}
                {node.actionConfig?.stageName && <span title={`${node.actionConfig.keyStage ? "关键节点 · " : "阶段 · "}${node.actionConfig.stageName}`}> · {node.actionConfig.keyStage ? "★ " : ""}{node.actionConfig.stageName}</span>}
              </span>
            </span>
            {data.issue ? (
              <span className="inline-flex ml-auto shrink-0 text-destructive"><AlertCircle
                size={14}

              /></span>
            ) : null}
          </span>
        )}
      </ActionSurface>
      {node.type !== "END" && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={false}
          className="!size-1 !opacity-0"
        />
      )}
    </div>
  );
}
function WorkflowEdge(props: EdgeProps<FlowEdge>) {
  const [path, x, y] = getBezierPath({
    ...props,
  });
  const data = props.data;
  return (
    <>
      <BaseEdge className="dw-data-workflow-designer-5"
        id={props.id}
        path={path}
        interactionWidth={18}
        style={({
          "--dw-data-workflow-designer-5-stroke": data?.lit ? "var(--primary)" : "var(--border-strong)",
          "--dw-data-workflow-designer-5-stroke-width": 1.25,
          "--dw-data-workflow-designer-5-transition": "stroke 150ms ease",
        }) as DataStyle}
      />
      {data && (
        <EdgeLabelRenderer>
          {data.branch && (
            <ActionSurface
              type="button"
              onClick={data.select}
              title={data.branch}
              style={({
                "--dw-data-workflow-designer-6-position": "absolute",
                "--dw-data-workflow-designer-6-transform": `translate(-50%, -50%) translate(${props.targetX}px, ${props.targetY - 68}px)`,
                "--dw-data-workflow-designer-6-pointer-events": "all",
              }) as DataStyle}
              className="dw-data-workflow-designer-6 nodrag nopan max-w-65 truncate"
            >
              {data.branch}
            </ActionSurface>
          )}
          {!data.disabled && (
            <div
              style={({
                "--dw-data-workflow-designer-7-position": "absolute",
                "--dw-data-workflow-designer-7-transform": `translate(-50%, -50%) translate(${data.branch ? props.targetX : x}px, ${data.branch ? props.targetY - 27 : y}px)`,
                "--dw-data-workflow-designer-7-pointer-events": "all",
              }) as DataStyle}
              className="dw-data-workflow-designer-7 nodrag nopan"
            >
              <InsertionMenu compact onInsert={data.insert} />
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const nodeTypes = { workflowCard: WorkflowCard };
const edgeTypes = { workflowEdge: WorkflowEdge };
function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left" className="!m-4">
      <div className="flex items-center gap-1 rounded-full bg-card p-1.5 shadow-tactile">
        <Button
          variant="ghost"
          size="icon"
          aria-label="放大流程图"
          onClick={() => void zoomIn({ duration: 150 })}
        >
          <ZoomIn size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="缩小流程图"
          onClick={() => void zoomOut({ duration: 150 })}
        >
          <ZoomOut size={16} />
        </Button>
        <span className="mx-1 h-4 border-l border-border" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="适应画布"
          onClick={() =>
            void fitView({ padding: 0.2, maxZoom: 1, duration: 180 })
          }
        >
          <Maximize2 size={16} />
        </Button>
      </div>
    </Panel>
  );
}


function BranchEditor({
  node,
  schema,
  directory,
  disabled,
  onChange,
}: {
  node: WorkflowNode;
  schema: TableSchema;
  directory: Directory;
  disabled: boolean;
  onChange: (condition: BranchCondition) => void;
}) {
  const condition = node.condition!;
  return (
    <section className="space-y-3 rounded-card border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-caption font-medium">
        <GitBranch size={14} />
        进入这条分支的条件
      </div>
      {condition.operator === "DEFAULT" ? (
        <p className="text-caption leading-5 text-muted-foreground">
          其他分支均不满足时进入。此分支固定排在最后。
        </p>
      ) : (
        <>
          {!conditionFields(schema).length && (
            <p className="text-caption text-warning">
              请先在表单设计中添加字段。
            </p>
          )}
          <RuleEditor
            value={condition}
            fields={conditionFields(schema)}
            directory={directory}
            disabled={disabled}
            onChange={onChange}
          />
          <p className="break-words rounded-control bg-background/70 px-2.5 py-2 text-caption leading-5 text-muted-foreground">
            {conditionLabel(condition, schema, directory)}
          </p>
        </>
      )}
    </section>
  );
}

function WorkflowEditor({
  value,
  onChange,
  schema,
  directory,
  disabled = false,
  showLegacyTriggers = true,
}: WorkflowDesignerProps) {
  const [selectedId, setSelectedId] = useState(value.tree.rootId);
  const [error, setError] = useState("");
  const [showIssues, setShowIssues] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(false);
  const [deletion, setDeletion] = useState<{
    kind: "node" | "branch";
    id: string;
  } | null>(null);
  const fieldId = useId(),
    tree = value.tree;
  const selected =
    tree.nodes.find((node) => node.id === selectedId) ??
    tree.nodes.find((node) => node.id === tree.rootId);
  const issues = useMemo(
    () => validateWorkflow(tree, schema, directory),
    [tree, schema, directory],
  );
  const positions = useMemo(() => workflowPositions(tree), [tree]);
  const structuralError = issues.some((issue) => issue.structural);
  const editDisabled = disabled || structuralError;
  const parent = selected ? workflowParent(tree, selected.id) : undefined;
  function updateTree(next: TreeModel, selectId?: string) {
    if (disabled) return;
    onChange({ ...value, tree: next });
    if (selectId) setSelectedId(selectId);
    setError("");
  }
  function mutate(
    action: () => TreeModel | { tree: TreeModel; nodeId: string },
  ) {
    if (editDisabled) return;
    try {
      const result = action();
      if ("tree" in result) updateTree(result.tree, result.nodeId);
      else updateTree(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试");
    }
  }
  function insert(parentId: string, childId: string, type: InsertableNodeType) {
    mutate(() => insertWorkflowNode(tree, parentId, childId, type, schema));
  }
  function patchNode(id: string, patch: Partial<WorkflowNode>) {
    if (!editDisabled)
      updateTree({
        ...tree,
        nodes: tree.nodes.map((node) =>
          node.id === id ? { ...node, ...patch } : node,
        ),
      });
  }
  function detail(node: WorkflowNode) {
    if (node.type === "APPROVAL" || node.type === "HANDLING" || node.type === "CC") {
      return workflowRecipientSummary(node, schema, directory)+(node.autoApproval?" · 自动通过已配置":"");
    }
    if (node.type === "CONDITION")
      return `${node.children.length} 条分支 · 按顺序判断`;
    return nodeVisuals[node.type]?.caption ?? "未知节点";
  }
  const nodes: FlowCardNode[] = tree.nodes
    .filter((node) => positions.has(node.id))
    .map((node) => ({
      id: node.id,
      type: "workflowCard",
      position: positions.get(node.id)!,
      draggable: false,
      selectable: false,
      deletable: false,
      data: {
        model: node,
        detail: detail(node),
        branches:
          node.type === "CONDITION"
            ? node.children
                .map((childId) => tree.nodes.find((entry) => entry.id === childId))
                .filter((child): child is WorkflowNode => Boolean(child))
                .map((child) =>
                  conditionLabel(child.condition, schema, directory),
                )
            : undefined,
        active: selected?.id === node.id,
        issue: issues.find((issue) => issue.nodeId === node.id)?.message ?? "",
        select: () => setSelectedId(node.id),
      },
    }));
  const edges: FlowEdge[] = tree.nodes.flatMap((node) =>
    node.children
      .filter((child) => positions.has(child))
      .map((child) => ({
        id: `edge${node.id}${child}`,
        source: node.id,
        target: child,
        type: "workflowEdge",
        selectable: false,
        deletable: false,
        data: {
          branch:
            node.type === "CONDITION"
              ? conditionLabel(
                  tree.nodes.find((entry) => entry.id === child)?.condition,
                  schema,
                  directory,
                )
              : undefined,
          lit: selected?.id === node.id || selected?.id === child,
          disabled: editDisabled,
          insert: (type: InsertableNodeType) => insert(node.id, child, type),
          select: () => setSelectedId(child),
        },
      })),
  );
  const deletingNode = deletion
    ? tree.nodes.find((node) => node.id === deletion.id)
    : undefined;
  const deletionCount = deletingNode
    ? deletion?.kind === "branch"
      ? workflowDescendants(tree, deletingNode.id).size
      : deletingNode.type === "CONDITION"
        ? 1 +
          deletingNode.children
            .filter(
              (child) =>
                tree.nodes.find((node) => node.id === child)?.condition
                  ?.operator !== "DEFAULT",
            )
            .reduce(
              (count, child) => count + workflowDescendants(tree, child).size,
              0,
            )
        : 1
    : 0;
  const canvasStyle = {
    "--xy-background-color": "var(--background)",
    "--xy-background-pattern-dots-color-default": "var(--border-strong)",
    "--xy-edge-stroke": "var(--border-strong)",
    "--xy-attribution-background-color": "var(--card)",
  } as CSSProperties;
  return (
    <section
      className="flex min-h-160 flex-col overflow-hidden rounded-panel bg-background shadow-tactile"
      aria-label="审批流程设计器"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className="dw-data-workflow-designer-8 flex size-9 items-center justify-center rounded-control"
            style={({
              "--dw-data-workflow-designer-8-background": mixHue("var(--primary-text)", 12),
              "--dw-data-workflow-designer-8-color": "var(--primary-text)",
              "--dw-data-workflow-designer-8-box-shadow": `0 0 0 1px ${mixHue("var(--primary-text)", 20)}`,
            }) as DataStyle}
          >
            <GitBranch size={18} />
          </span>
          <div>
            <h2 className="text-body font-medium">审批流程</h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              配置处理人，让每次提交有序流转
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Button variant="outline" size="sm" onClick={() => setGlobalSettings(true)}><SettingsAction size={14} />流程全局设置</Button>
          {showLegacyTriggers && <Switch
            checked={value.onCreate}
            disabled={disabled}
            onCheckedChange={(onCreate) => onChange({ ...value, onCreate })}
            label="新增时审批"
          />}
          {showLegacyTriggers && <Switch
            checked={value.onUpdate}
            disabled={disabled}
            onCheckedChange={(onUpdate) => onChange({ ...value, onUpdate })}
            label="修改时审批"
          />}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-border bg-destructive/5 px-5 py-3 text-caption text-destructive"
        >
          <span>{error}</span>
          <ActionSurface
            type="button"
            onClick={() => setError("")}
            aria-label="关闭提示"
          >
            <CloseAction size={14} />
          </ActionSurface>
        </div>
      )}
      <div className="grid min-h-0 flex-1 lg:grid-cols-organization-inspector">
        <div
          className="relative h-120 min-w-0 lg:h-organization-panel lg:min-h-142.5"
          style={canvasStyle}
        >
          <ReactFlow<FlowCardNode, FlowEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            elementsSelectable={false}
            deleteKeyCode={null}
            minZoom={0.18}
            maxZoom={1.5}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            panOnDrag
            zoomOnDoubleClick={false}
            aria-label="流程图画布"
            preventScrolling={false}
          >
            <Background
              gap={22}
              size={1.15}
              color="color-mix(in srgb, var(--foreground) 14%, transparent)"
            />
            <Panel position="top-left" className="!m-4">
              <div className="rounded-full bg-card/95 px-3 py-1.5 text-caption text-muted-foreground shadow-tactile">
                {tree.nodes.length} 个节点{" "}
                <span className="mx-1.5 opacity-50">/</span>{" "}
                {tree.nodes.filter((node) => node.type === "APPROVAL").length}{" "}
                个审批环节
                {tree.nodes.some((node) => node.type === "HANDLING") && (
                  <>
                    <span className="mx-1.5 opacity-50">/</span>
                    {tree.nodes.filter((node) => node.type === "HANDLING").length} 个办理环节
                  </>
                )}
              </div>
            </Panel>
            <Panel position="top-right" className="!m-4">
              <ActionSurface
                type="button"
                onClick={() => setShowIssues((current) => !current)}
                className={cn(
                  "flex items-center gap-1.5",
                  issues.length
                    ? ""
                    : "",
                )}
              >
                {issues.length ? (
                  <AlertCircle size={13} />
                ) : (
                  <Check size={13} />
                )}
                {issues.length ? `${issues.length} 项待完善` : "配置完整"}
              </ActionSurface>
            </Panel>
            <CanvasControls />
            <Panel position="bottom-center" className="!mb-6 hidden xl:block">
              <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <Hand size={12} />
                拖动画布 · 滚轮缩放 · 点击 + 添加节点
              </span>
            </Panel>
          </ReactFlow>
        </div>
        <aside
          aria-label="节点设置"
          className="min-h-0 overflow-y-auto border-t border-border bg-card lg:max-h-organization-panel lg:border-l lg:border-t-0"
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-5 py-4">
            <span className="inline-flex text-muted-foreground"><Settings2 size={15}  /></span>
            <h3 className="text-body font-medium">节点设置</h3>
            {disabled && (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
                只读预览
              </span>
            )}
          </div>
          {selected ? (
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <span
                  className="dw-data-workflow-designer-9 flex size-10 items-center justify-center rounded-control"
                  style={({
                    "--dw-data-workflow-designer-9-background": mixHue(
                      nodeVisuals[selected.type]?.hue ?? nodeVisuals.END.hue,
                      12,
                    ),
                    "--dw-data-workflow-designer-9-color": nodeVisuals[selected.type]?.hue ?? nodeVisuals.END.hue,
                    "--dw-data-workflow-designer-9-box-shadow": `0 0 0 1px ${mixHue(
                      nodeVisuals[selected.type]?.hue ?? nodeVisuals.END.hue,
                      20,
                    )}`,
                  }) as DataStyle}
                >
                  {(() => {
                    const Icon = nodeVisuals[selected.type]?.icon ?? CircleStop;
                    return <Icon size={20} />;
                  })()}
                </span>
                <div>
                  <span className="text-caption text-muted-foreground">
                    {nodeTypeLabels[selected.type]}
                  </span>
                  <h4 className="mt-0.5 max-w-52 truncate text-body font-medium">
                    {selected.name || "未命名节点"}
                  </h4>
                </div>
              </div>
              <label
                htmlFor={`${fieldId}-name`}
                className="block space-y-2 text-caption"
              >
                <span className="font-medium">节点名称</span>
                <TextEntry
                  id={`${fieldId}-name`}
                  value={selected.name}
                  onChange={(event) =>
                    patchNode(selected.id, { name: event.target.value })
                  }
                  disabled={editDisabled}
                  maxLength={100}

                />
              </label>
              {selected.condition && (
                <BranchEditor
                  node={selected}
                  schema={schema}
                  directory={directory}
                  disabled={editDisabled}
                  onChange={(condition) =>
                    patchNode(selected.id, { condition })
                  }
                />
              )}
              {selected.type === "START" && (
                <p className="rounded-card bg-muted/50 p-3 text-caption leading-6 text-muted-foreground">
                  {showLegacyTriggers ? "成员提交表单后自动发起。" : "此流程会按定义的触发方式开始处理。"}流程退回发起人时，发起人可以修改流程运行中的内容并重新提交。
                </p>
              )}
              {selected.type === "END" && (
                <p className="rounded-card bg-muted/50 p-3 text-caption leading-6 text-muted-foreground">
                  该分支执行到这里结束。流程结果会独立保存；最终通过后可回填审批修改，显式结果映射则按配置在通过、拒绝或撤回时执行。
                </p>
              )}
              {selected.type === "APPROVAL" && (
                <>
                  <fieldset disabled={editDisabled} className="space-y-2">
                    <legend className="mb-2 text-caption font-medium">
                      审批方式
                    </legend>
                    {(
                      [
                        {
                          value: "ANY",
                          title: "或签 · 任一人同意",
                          detail: "任一人同意即可通过；任一人拒绝则当前流程不通过",
                        },
                        {
                          value: "ALL",
                          title: "顺序审批 · 所有人依次审批",
                          detail: selected.recipientConfig ? "按进入节点时确定的名单顺序逐一处理，全部同意后通过" : "按下方成员顺序逐一处理，全部同意后通过",
                        },
                        {
                          value: "PARALLEL_ALL",
                          title: "并行会签 · 所有人同时审批",
                          detail: "同时给每位成员分派待办，全部同意后通过；任一人拒绝则当前流程不通过",
                        },
                        {
                          value: "RACE",
                          title: "抢签 · 等待任一人同意",
                          detail: "同时分派待办，任一人同意即通过；部分拒绝继续等待，全部拒绝才终止",
                        },
                        {
                          value: "VOTE",
                          title: "投票 · 达到同意比例",
                          detail: "同时分派待办，同意票达到设定比例即通过；已无法达到比例时终止",
                        },
                      ] as const
                    ).map((mode) => (
                      <label
                        key={mode.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-card border p-3",
                          selected.approvalMode === mode.value
                            ? "border-primary/40 bg-primary/5"
                            : "border-border",
                        )}
                      >
                        <TextEntry
                          type="radio"
                          name={`${fieldId}-approval-mode`}
                          value={mode.value}
                          checked={selected.approvalMode === mode.value}
                          onChange={() =>
                            patchNode(selected.id, changeWorkflowApprovalMode(selected, mode.value))
                          }
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-caption font-medium">
                            {mode.title}
                          </span>
                          <small className="mt-1 block text-caption leading-5 text-muted-foreground">
                            {mode.detail}
                          </small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {selected.approvalMode === "VOTE" && <label className="block space-y-2 text-caption">
                    <span className="font-medium">同意比例（%）</span>
                    <TextEntry aria-label="投票同意比例" type="number" min={1} max={100} step={1}
                      value={selected.voteThreshold ?? ""} disabled={editDisabled}

                      onChange={(event) => patchNode(selected.id, { voteThreshold: event.target.value === "" ? undefined : Number(event.target.value) })} />
                    <span className="block text-caption leading-5 text-muted-foreground">
                      {selected.recipientConfig ? "以进入节点时确定的成员总数为分母，所需同意人数向上取整。"
                        : selected.approverIds?.length && selected.voteThreshold
                          ? `${selected.approverIds.length} 位成员至少需要 ${workflowVoteRequired(selected.approverIds.length, selected.voteThreshold)} 人同意。`
                          : "选择成员并设置比例后显示所需同意人数。"}
                      已通过或终止时，尚未处理的同组待办自动取消。
                    </span>
                  </label>}
                </>
              )}
              {selected.type === "HANDLING" && (
                <>
                  <p className="text-caption leading-5 text-muted-foreground">
                    {selected.recipientConfig ? "按进入节点时确定的名单顺序逐一办理。" : "按下方成员顺序逐一办理。"}当前办理人确认完成后交给下一位，全部完成后进入后续节点。
                  </p>
                </>
              )}
              {selected.type === "CC" && (
                <>
                  <p className="text-caption leading-5 text-muted-foreground">
                    流程经过此节点时，抄送人会收到通知，无需审批。
                  </p>
                </>
              )}
              {(["APPROVAL", "HANDLING", "CC"] as string[]).includes(selected.type) && (
                <>
                  <WorkflowRecipientSettings key={selected.id} node={selected} schema={schema} directory={directory} disabled={editDisabled} onChange={(patch) => patchNode(selected.id, patch)} />
                  <WorkflowFieldPermissions key={`${selected.id}-fields`} node={selected} schema={schema} disabled={editDisabled} onChange={(patch) => patchNode(selected.id, patch)} />
                  {selected.type !== "CC" && <WorkflowActionSettings key={`${selected.id}-actions`} node={selected} disabled={editDisabled} onChange={patch => patchNode(selected.id, patch)} />}
                  {selected.type === "APPROVAL" && <WorkflowAutoApprovalSettings key={`${selected.id}-auto`} node={selected} schema={schema} directory={directory} disabled={editDisabled} onChange={patch=>patchNode(selected.id,patch)} />}
                </>
              )}
              {selected.type === "CONDITION" && (
                <section className="space-y-3">
                  <p className="text-caption leading-5 text-muted-foreground">
                    从上到下判断，进入第一条符合条件的分支。每条分支独立结束。
                  </p>
                  <ol className="space-y-2" aria-label="分支判断顺序">
                    {selected.children.map((childId, index) => {
                      const child = tree.nodes.find(
                        (node) => node.id === childId,
                      );
                      if (!child) return null;
                      const isDefault = child.condition?.operator === "DEFAULT";
                      return (
                        <li
                          key={childId}
                          className="rounded-card border border-border p-2.5"
                        >
                          <ActionSurface
                            type="button"
                            onClick={() => setSelectedId(childId)}
                            className="block w-full text-left"
                          >
                            <span className="mb-1 block text-caption text-muted-foreground">
                              {isDefault ? "兜底分支" : `条件 ${index + 1}`}
                            </span>
                            <span className="block break-words text-caption leading-5">
                              {conditionLabel(
                                child.condition,
                                schema,
                                directory,
                              )}
                            </span>
                          </ActionSurface>
                          {!isDefault && !disabled && (
                            <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={editDisabled || index === 0}
                                onClick={() =>
                                  mutate(() =>
                                    moveWorkflowBranch(tree, childId, -1),
                                  )
                                }
                                aria-label={`上移条件 ${index + 1}`}

                              >
                                <ArrowUp size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={
                                  editDisabled ||
                                  index >= selected.children.length - 2
                                }
                                onClick={() =>
                                  mutate(() =>
                                    moveWorkflowBranch(tree, childId, 1),
                                  )
                                }
                                aria-label={`下移条件 ${index + 1}`}

                              >
                                <ArrowDown size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={editDisabled}
                                onClick={() =>
                                  setDeletion({ kind: "branch", id: childId })
                                }
                                aria-label={`删除条件 ${index + 1} 及后续节点`}
                                className="ml-auto"
                              >
                                <TrashAction size={12} />
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={editDisabled || selected.children.length >= 8}
                    onClick={() =>
                      mutate(() => addWorkflowBranch(tree, selected.id, schema))
                    }
                  >
                    <PlusAction size={13} />
                    添加条件分支
                  </Button>
                </section>
              )}
              {!disabled && (
                <div className="space-y-3 border-t border-border pt-4">
                  {selected.type !== "CONDITION" &&
                    (selected.type === "END"
                      ? parent && (
                          <InsertionMenu
                            disabled={editDisabled}
                            label="在结束前添加节点"
                            onInsert={(type) =>
                              insert(parent.id, selected.id, type)
                            }
                          />
                        )
                      : selected.children[0] && (
                          <InsertionMenu
                            disabled={editDisabled}
                            label="在此后添加节点"
                            onInsert={(type) =>
                              insert(selected.id, selected.children[0], type)
                            }
                          />
                        ))}
                  {selected.type !== "START" && selected.type !== "END" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      disabled={editDisabled}
                      onClick={() =>
                        selected.type === "CONDITION"
                          ? setDeletion({ kind: "node", id: selected.id })
                          : mutate(() => removeWorkflowNode(tree, selected.id))
                      }
                    >
                      <TrashAction size={13} />
                      删除
                      {selected.type === "CONDITION" ? "条件节点" : "此节点"}
                    </Button>
                  )}
                  {parent?.type === "CONDITION" &&
                    selected.condition?.operator !== "DEFAULT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={editDisabled}
                        onClick={() =>
                          setDeletion({ kind: "branch", id: selected.id })
                        }
                      >
                        <TrashAction size={13} />
                        删除整条分支
                      </Button>
                    )}
                </div>
              )}
              {issues
                .filter((issue) => issue.nodeId === selected.id)
                .map((issue, index) => (
                  <p
                    key={index}
                    role="status"
                    className="flex items-start gap-2 text-caption leading-5 text-warning"
                  >
                    <AlertCircle size={13} className="mt-1 shrink-0" />
                    {issue.message}
                  </p>
                ))}
            </div>
          ) : (
            <p className="p-5 text-body text-muted-foreground">
              选择一个节点查看配置。
            </p>
          )}
        </aside>
      </div>
      {(showIssues || structuralError) && (
        <section
          aria-label="流程检查结果"
          className="border-t border-border bg-card px-5 py-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-caption font-medium">
              流程检查 ·{" "}
              {issues.length ? `${issues.length} 项待完善` : "已通过"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowIssues(false)}
              aria-label="收起检查结果"
            >
              <CloseAction size={13} />
            </Button>
          </div>
          {issues.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {issues.map((issue, index) => (
                <li key={index}>
                  <ActionSurface
                    type="button"
                    onClick={() => issue.nodeId && setSelectedId(issue.nodeId)}
                    className="flex items-start gap-2 text-left"
                  >
                    <AlertCircle size={13} className="mt-1 shrink-0" />
                    <span>
                      {issue.nodeId && (
                        <strong className="font-medium">
                          {
                            tree.nodes.find((node) => node.id === issue.nodeId)
                              ?.name
                          }
                          ：
                        </strong>
                      )}
                      {issue.message}
                    </span>
                  </ActionSurface>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-muted-foreground">
              节点连接、处理人和分支条件均已配置。
            </p>
          )}
        </section>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-5 py-2.5 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          审批人与办理人来自公司通讯录
        </span>
        <span>
          {showLegacyTriggers
            ? !value.onCreate && !value.onUpdate ? "当前未启用审批触发" : "修改发布后，后续提交将使用新流程"
            : "触发方式和启用状态在流程定义设置中管理"}
        </span>
      </footer>
      <AppModal open={globalSettings} onOpenChange={setGlobalSettings} title="流程全局设置" description="配置流程结果发生时的字段写入。保存并发布流程后，对后续提交生效。"
        footer={<Button onClick={() => setGlobalSettings(false)}>完成设置</Button>}>
        <WorkflowLifecycleSettings tree={tree} schema={schema} directory={directory} disabled={editDisabled}
          onChange={lifecycleMappings => updateTree({ ...tree, lifecycleMappings })} />
      </AppModal>
      <AppModal
        open={!!deletion}
        onOpenChange={(open) => !open && setDeletion(null)}
        title={
          deletion?.kind === "branch" ? "删除这条分支？" : "删除条件节点？"
        }
        description={
          deletion?.kind === "branch"
            ? `将移除这条分支及其后续的 ${deletionCount} 个节点。只剩兜底分支时，将直接连接该分支。`
            : `将移除条件节点及非兜底分支，共 ${deletionCount} 个节点。「其他情况」分支将保留并连接到上一步。`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeletion(null)}>
              取消
            </Button>
            <Button

              disabled={editDisabled || !deletingNode}
              onClick={() => {
                if (!deletion) return;
                mutate(() =>
                  deletion.kind === "branch"
                    ? removeWorkflowBranch(tree, deletion.id)
                    : removeWorkflowNode(tree, deletion.id),
                );
                setDeletion(null);
              }}
            >
              删除
            </Button>
          </div>
        }
      >
        <p className="rounded-card bg-muted/50 p-3 text-body">
          {deletingNode?.name ?? "节点已发生变化"}
        </p>
      </AppModal>
    </section>
  );
}

/** Persisted draft is fully controlled by the route; canvas selection and viewport are local only. */
export function WorkflowDesigner(props: WorkflowDesignerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
}
export default WorkflowDesigner;
