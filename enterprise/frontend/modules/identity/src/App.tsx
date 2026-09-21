import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import AccessApp from "@/access/App";
import { AdminPage } from "@/organization/AdminPage";
import { Building2, Users } from "@/shared/icons/catalog";
import { cn } from "@/lib/utils";

function IdentityNavigation() {
  const item = ({ isActive }: { isActive: boolean }) => cn(
    "inline-flex items-center gap-2 rounded-control px-4 py-2 text-body font-medium",
    isActive ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );
  return (
    <nav aria-label="组织与身份" className="sticky top-0 z-20 flex gap-2 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <NavLink className={item} to="/organization"><Building2 size={17} />组织与账号</NavLink>
      <NavLink className={item} to="/identities"><Users size={17} />身份模板</NavLink>
    </nav>
  );
}

export function IdentityApp() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <IdentityNavigation />
      <Routes>
        <Route path="/organization" element={<main className="mx-auto w-full max-w-7xl p-6"><AdminPage /></main>} />
        <Route path="/identities" element={<AccessApp scope="identity" embedded />} />
        <Route index element={<Navigate to="/organization" replace />} />
        <Route path="*" element={<Navigate to="/organization" replace />} />
      </Routes>
    </div>
  );
}
