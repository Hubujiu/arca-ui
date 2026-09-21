import { MotionOutlet } from "@/shared/design-system/motion/PageMotion";
import { useWorkspaceUI } from "@/shared/design-system/workspace/WorkspaceUI";
import { RoutePlaceholder } from "@/shared/design-system/workspace/ContentStage";
import { Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Layers3,
  Inbox,
  ArrowLeft,
  BriefcaseBusiness,
  Users,
  Target,
  CalendarDays,
  Box,
} from "@/shared/icons/catalog";
import { Button, EmptyState } from "@/shared/ui";
import { cn } from "@/lib/utils";
import { statuses } from "./model";

export function LowcodeLayout() {
  const UI = useWorkspaceUI();
  const { pathname } = useLocation();
  const content = <Suspense fallback={<RoutePlaceholder />}><MotionOutlet /></Suspense>;
  // A specific app supplies its own group/table sidebar; never nest two rails.
  if (/^\/apps\/[^/]+/.test(pathname)) return <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">{content}</main>;
  return <UI.AppFrame title="应用与审批" subtitle="业务数据与流程" items={[
    { to: "/apps", label: "全部应用", icon: <Layers3 size={17} />, end: true },
    { to: "/forms", label: "原有表单", icon: <BriefcaseBusiness size={17} /> },
  ]}>{content}</UI.AppFrame>;
}
export function AppIcon({
  icon = "layers",
  color = "blue",
  small = false,
}: {
  icon?: string;
  color?: string;
  small?: boolean;
}) {
  const Icon =
    (
      {
        layers: Layers3,
        briefcase: BriefcaseBusiness,
        users: Users,
        target: Target,
        calendar: CalendarDays,
        box: Box,
      } as Record<string, typeof Layers3>
    )[icon] || Layers3;
  const colors: Record<string, string> = {
    blue: "bg-muted text-foreground",
    teal: "bg-muted text-foreground",
    violet: "bg-muted text-foreground",
    amber: "bg-muted text-foreground",
    rose: "bg-muted text-foreground",
    slate: "bg-muted text-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-card",
        small ? "size-9" : "size-12",
        colors[color] || colors.blue,
      )}
    >
      <Icon size={small ? 18 : 24} />
    </span>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-caption font-medium",
        value === "APPROVED"
          ? "bg-status-success/10 text-status-success dark:bg-status-success/10 dark:text-status-success"
          : value === "PENDING"
            ? "bg-status-info/10 text-status-info dark:bg-status-info/10 dark:text-status-info"
            : value === "RETURNED"
              ? "bg-status-warning/10 text-status-warning dark:bg-status-warning/10 dark:text-status-warning"
              : "bg-muted text-muted-foreground",
      )}
    >
      {statuses[value] || value}
    </span>
  );
}
export function LoadState({
  error,
  retry,
  title = "正在加载…",
}: {
  error?: string;
  retry: () => void;
  title?: string;
}) {
  if (!error) return <RoutePlaceholder />;
  return <div className="p-8"><EmptyState title={title === "正在加载…" ? "暂时无法加载" : title} action={<Button onClick={retry}>重试</Button>}>{error}</EmptyState></div>;
}
export function BackLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}
