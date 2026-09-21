import { createContext, useContext, useMemo, type ComponentType, type HTMLAttributes, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Table, type TableColumn } from "@/components/motion/table";
import { AnimatedSidebar, AnimatedSidebarContent, AnimatedSidebarHeader, AnimatedSidebarMenu, AnimatedSidebarMenuButton, AnimatedSidebarMenuItem, AnimatedSidebarProvider, AnimatedSidebarTrigger, useAnimatedSidebarPanel } from "@/components/motion/animated-sidebar";
import { PotlabIcon } from "@/shared/icons";
import { cn } from "@/lib/utils";
import { resourceTime } from "./resource-time";

export type PageHeaderProps = { title: string; description?: string; breadcrumb?: ReactNode; actions?: ReactNode };
export type ResourceItem = { id: string; name: string; to: string; icon: ReactNode; type: string; owner: string; updated: string; updatedAt?: string | null; status: ReactNode; action?: ReactNode };
export type ResourceTableProps = { items: ResourceItem[]; emptyState?: ReactNode };
export type SidebarItem = { to: string; label: string; icon?: ReactNode; end?: boolean };
export type AppFrameProps = { title: string; subtitle?: string; items: SidebarItem[]; children: ReactNode; footer?: ReactNode };
export type SurfaceProps = HTMLAttributes<HTMLDivElement>;

function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return <header data-workspace-header className="dw-page-header">
    <div className="min-w-0 flex-1">
      {breadcrumb && <div className="dw-page-breadcrumb mb-3 text-caption text-ui-muted">{breadcrumb}</div>}
      <h1 className="dw-page-title text-heading font-semibold tracking-tight text-ui-ink">{title}</h1>
      {description && <p className="dw-page-description mt-2 text-body text-ui-muted">{description}</p>}
    </div>
    {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
function Panel({ className, ...props }: SurfaceProps) { return <div {...props} className={cn("dw-panel", className)} />; }
function Toolbar({ className, ...props }: SurfaceProps) { return <div {...props} className={cn("dw-toolbar", className)} />; }
const resourceColumns: TableColumn<ResourceItem>[] = [
    { key: "name", header: "名称", width: "42%", sortable: true, cell: row => <Link to={row.to} className="flex h-12 min-w-0 items-center gap-3 font-medium hover:text-ui-accent"><span className="grid size-8 shrink-0 place-items-center rounded-control bg-ui-ground text-ui-accent">{row.icon}</span><span className="truncate">{row.name}</span></Link> },
    { key: "type", header: "类型", width: "90px" },
    { key: "owner", header: "创建者", width: "120px" },
    { key: "updated", header: "最近更新", width: "165px", sortable: true, sortValue: row => resourceTime(row.updatedAt) },
    { key: "status", header: "处理状态", width: "130px", cell: row => row.status },
    { key: "action", header: <span className="sr-only">操作</span>, width: "52px", cell: row => row.action },
  ];
const resourceRowId = (row: ResourceItem) => row.id;
function ResourceTable({ items, emptyState }: ResourceTableProps) {
  return <div data-resource-table className="min-w-0"><Table data={items} columns={resourceColumns} getRowId={resourceRowId} rowHeight={56} height={440} emptyState={emptyState} /></div>;
}
function AppFrameBrand({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  const { collapsed } = useAnimatedSidebarPanel();
  return <div className="dw-sidebar-brand" title={collapsed ? title : undefined}>
    <span className="dw-sidebar-mark">{icon ?? <PotlabIcon name="Table" size={18} />}</span>
    {!collapsed && <div className="min-w-0"><p className="truncate text-body font-semibold">{title}</p>{subtitle && <p className="mt-1 truncate text-caption text-ui-muted">{subtitle}</p>}</div>}
  </div>;
}
function AppFrame({ title, subtitle, items, children, footer }: AppFrameProps) {
  const location = useLocation();
  const navigate = useNavigate();
  return <div data-app-frame className="flex h-full min-h-0 flex-1 bg-ui-ground">
    <AnimatedSidebarProvider>
      <AnimatedSidebar ariaLabel={`${title}导航`} collapsible="icon" className="h-full" panelClassName="h-full">
        <AnimatedSidebarHeader><AppFrameBrand title={title} subtitle={subtitle} icon={items[0]?.icon} /></AnimatedSidebarHeader>
        <AnimatedSidebarContent><nav aria-label={`${title}分区`} className="px-2"><AnimatedSidebarMenu>{items.map(item => <AnimatedSidebarMenuItem key={item.to}>
          <AnimatedSidebarMenuButton onSelect={() => navigate(item.to)} icon={item.icon} isActive={item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + "/")}>{item.label}</AnimatedSidebarMenuButton>
        </AnimatedSidebarMenuItem>)}</AnimatedSidebarMenu></nav>{footer}</AnimatedSidebarContent>
      </AnimatedSidebar>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="dw-local-bar"><AnimatedSidebarTrigger aria-label="折叠或展开侧栏"><PotlabIcon name="PanelLeft" size={17} /></AnimatedSidebarTrigger><span>{title}</span></div>
        <main className="dw-workspace-scroll"><div className="dw-page-content">{children}</div></main>
      </div>
    </AnimatedSidebarProvider>
  </div>;
}
export type WorkspaceComponents = {
  PageHeader: ComponentType<PageHeaderProps>; Panel: ComponentType<SurfaceProps>; Toolbar: ComponentType<SurfaceProps>;
  ResourceTable: ComponentType<ResourceTableProps>; AppFrame: ComponentType<AppFrameProps>;
};
const defaults: WorkspaceComponents = { PageHeader, Panel, Toolbar, ResourceTable, AppFrame };
const Context = createContext<WorkspaceComponents>(defaults);
/** Replace a renderer once without changing business models, routing or loading.
 * Overrides inherit from the nearest provider so a module can replace one slot.
 */
export function WorkspaceUIProvider({ components, children }: { components?: Partial<WorkspaceComponents>; children: ReactNode }) {
  const parent = useContext(Context);
  const value = useMemo(() => ({ ...parent, ...components }), [parent, components]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspaceUI() { return useContext(Context); }
