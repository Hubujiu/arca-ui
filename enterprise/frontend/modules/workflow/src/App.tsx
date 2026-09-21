import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DesignerWindow } from "@/shared/design-system/DesignerWindow";
import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";
import { MotionOutlet } from "@/shared/design-system/motion/PageMotion";
import { RoutePlaceholder } from "@/shared/design-system/workspace/ContentStage";
import { EmptyState, ErrorState } from "@/shared/ui";
import { Inbox, GitBranch } from "@/shared/icons/catalog";

const WorkflowCenter = lazy(() => import("./features/workflow/WorkflowCenter").then((module) => ({ default: module.WorkflowCenter })));
const ChangePage = lazy(() => import("./features/workflow/WorkflowCenter").then((module) => ({ default: module.ChangePage })));
const TableDesignerPage = lazy(() => import("@/lowcode/TableDesignerPage").then((module) => ({ default: module.TableDesignerPage })));

function WorkflowLayout() {
  const UI = useWorkspaceUI();
  return (
    <UI.AppFrame title="流程与审批" subtitle="待办 · 运行 · 设计" items={[
      { to: "/workflows", label: "审批中心", icon: <Inbox size={17} />, end: true },
      { to: "/workflows?view=handled", label: "已处理", icon: <GitBranch size={17} /> },
    ]}>
      <Suspense fallback={<RoutePlaceholder />}><MotionOutlet /></Suspense>
    </UI.AppFrame>
  );
}

export function WorkflowApp() {
  return (
    <Suspense fallback={<EmptyState loading title="正在打开流程中心…" />}>
      <Routes>
        <Route element={<DesignerWindow />}>
          <Route path="/apps/:appId/tables/:tableId/workflow" element={<TableDesignerPage workflow />} />
        </Route>
        <Route element={<WorkflowLayout />}>
          <Route path="/workflows" element={<WorkflowCenter />} />
          <Route path="/workflows/:changeId" element={<ChangePage />} />
          <Route index element={<Navigate to="/workflows" replace />} />
          <Route path="*" element={<div className="p-6"><ErrorState status={404} title="页面不存在">这个流程地址没有对应页面。</ErrorState></div>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
