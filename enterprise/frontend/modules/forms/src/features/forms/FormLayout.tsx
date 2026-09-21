import { Suspense } from "react";
import { MotionOutlet } from "@/shared/design-system/motion/PageMotion";
import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";
import { RoutePlaceholder } from "@/shared/design-system/workspace/ContentStage";
import { PotlabIcon } from "@/shared/icons";
import { useAdminAccess } from "@/portal/useAdminAccess";
export function FormLayout() {
  const { me } = useAdminAccess();
  const UI = useWorkspaceUI();
  const items = [
    { to: "/apps", label: "业务应用", icon: <PotlabIcon name="Table" size={17} />, end: true },
    { to: "/forms", label: "发起申请", icon: <PotlabIcon name="FilePen" size={17} />, end: true },
    { to: "/approvals", label: "待我审批", icon: <PotlabIcon name="Archive" size={17} />, end: true },
    { to: "/approvals/mine", label: "我的申请", icon: <PotlabIcon name="Clipboard" size={17} /> },
    ...(me?.systemRole === "ADMIN" ? [{ to: "/forms/manage", label: "表单管理", icon: <PotlabIcon name="Setting" size={17} /> }] : []),
  ];
  return <UI.AppFrame title="表单与审批" subtitle="申请 · 协作 · 流程" items={items}><Suspense fallback={<RoutePlaceholder />}><MotionOutlet /></Suspense></UI.AppFrame>;
}
