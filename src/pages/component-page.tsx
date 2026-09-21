import { Link, Navigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { getDemo } from "@/components/arca/registry"
import { PreviewFrame } from "@/components/site/preview-frame"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { CATEGORIES, getCatalogItem } from "@/lib/catalog"

export function ComponentPage() {
  const { slug = "" } = useParams()
  if (slug === "async-table") {
    return <Navigate to="/components/data-table" replace />
  }
  const item = getCatalogItem(slug)
  const Demo = getDemo(slug)

  if (!item) {
    return <Navigate to="/components" replace />
  }

  const category = CATEGORIES.find((entry) => entry.id === item.category)

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-sm text-muted-foreground">
          <Link to="/components" className="hover:text-foreground">
            Components
          </Link>
          <span className="mx-2">/</span>
          <span>{category?.title}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">{item.title}</h1>
          <Badge variant="outline">Base UI</Badge>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">{item.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">收藏来源：{item.collectedAs}</p>
        <div className="mt-8">
          <PreviewFrame>
            {Demo ? <Demo /> : <p className="text-sm text-muted-foreground">预览加载中</p>}
          </PreviewFrame>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
