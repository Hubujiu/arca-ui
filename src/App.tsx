import { HashRouter, Navigate, Route, Routes } from "react-router-dom"

import { HomePage } from "@/pages/home-page"
import { ComponentsPage } from "@/pages/components-page"
import { ComponentPage } from "@/pages/component-page"
import { DocsPage } from "@/pages/docs-page"
import { EnterpriseGalleryPage } from "@/components/enterprise"

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/components/:slug" element={<ComponentPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/enterprise" element={<EnterpriseGalleryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
