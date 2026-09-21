import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { EmptyState, ErrorState } from "@/shared/ui";
import { AppShell } from "./features/knowledge/AppShell";
import { KnowledgeSessionProvider } from "./features/knowledge/KnowledgeSession";

const KnowledgePage = lazy(() => import("./features/knowledge/KnowledgePage").then((module) => ({ default: module.KnowledgePage })));
const SearchPage = lazy(() => import("./features/knowledge/SearchPage").then((module) => ({ default: module.SearchPage })));
const DocumentPage = lazy(() => import("./features/knowledge/DocumentPage").then((module) => ({ default: module.DocumentPage })));
const ArchivePage = lazy(() => import("./features/knowledge/ArchivePage").then((module) => ({ default: module.ArchivePage })));
const SettingsPage = lazy(() => import("./features/knowledge/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function KnowledgeApp() {
  return (
    <KnowledgeSessionProvider>
      <Suspense fallback={<EmptyState loading title="正在打开知识库…" />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/documents/:id" element={<DocumentPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/knowledge/settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="/knowledge" replace />} />
            <Route path="*" element={<ErrorState status={404} title="页面不存在">这个知识库地址没有对应页面。</ErrorState>} />
          </Route>
        </Routes>
      </Suspense>
    </KnowledgeSessionProvider>
  );
}
