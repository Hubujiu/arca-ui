import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useModuleContext } from "@/module-runtime";
import { DesignerWindow } from "@/shared/design-system/DesignerWindow";
import { EmptyState, ErrorState } from "@/shared/ui";
import { FormLayout } from "./features/forms/FormLayout";
import { LowcodeLayout } from "@/lowcode/common";

const FormsPage = lazy(() => import("./features/forms/FormsPage").then((module) => ({ default: module.FormsPage })));
const FormDesigner = lazy(() => import("./features/forms/FormDesigner").then((module) => ({ default: module.FormDesigner })));
const SubmissionPage = lazy(() => import("./features/forms/SubmissionPage").then((module) => ({ default: module.SubmissionPage })));
const ApprovalsPage = lazy(() => import("./features/forms/ApprovalsPage").then((module) => ({ default: module.ApprovalsPage })));
const ApplicationsPage = lazy(() => import("./features/apps/ApplicationsPage").then((module) => ({ default: module.ApplicationsPage })));
const AppWorkspace = lazy(() => import("./features/apps/AppWorkspace").then((module) => ({ default: module.AppWorkspace })));
const TableDesignerPage = lazy(() => import("@/lowcode/TableDesignerPage").then((module) => ({ default: module.TableDesignerPage })));
const PermissionsPage = lazy(() => import("@/lowcode/PermissionsPage").then((module) => ({ default: module.PermissionsPage })));
const SharedFormPage = lazy(() => import("@/lowcode/SharedFormPage").then((module) => ({ default: module.SharedFormPage })));

function WorkflowRedirect() {
  const context = useModuleContext();
  const location = useLocation();
  useEffect(() => {
    context.navigate(`/m/workflow${location.pathname}${location.search}${location.hash}`);
  }, [context, location]);
  return <EmptyState loading title="正在打开流程中心…" />;
}

export function FormsApp() {
  return (
    <Suspense fallback={<EmptyState loading title="正在打开表单与应用…" />}>
      <Routes>
        <Route element={<DesignerWindow />}>
          <Route path="/forms/new" element={<FormDesigner />} />
          <Route path="/forms/:formId/edit" element={<FormDesigner />} />
          <Route path="/apps/:appId/tables/:tableId/design" element={<TableDesignerPage />} />
          <Route path="/apps/:appId/tables/:tableId/workflow" element={<TableDesignerPage workflow />} />
        </Route>
        <Route element={<FormLayout />}>
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/manage" element={<FormsPage manage />} />
          <Route path="/forms/:formId/fill" element={<SubmissionPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/approvals/mine" element={<ApprovalsPage mine />} />
          <Route path="/approvals/:submissionId" element={<SubmissionPage />} />
        </Route>
        <Route element={<LowcodeLayout />}>
          <Route path="/apps" element={<ApplicationsPage />} />
          <Route path="/apps/shared/:token" element={<SharedFormPage />} />
          <Route path="/apps/:appId" element={<AppWorkspace />} />
          <Route path="/apps/:appId/permissions" element={<PermissionsPage />} />
        </Route>
        <Route path="/workflows/*" element={<WorkflowRedirect />} />
        <Route index element={<Navigate to="/apps" replace />} />
        <Route path="*" element={<div className="p-6"><ErrorState status={404} title="页面不存在">这个表单或应用地址没有对应页面。</ErrorState></div>} />
      </Routes>
    </Suspense>
  );
}
