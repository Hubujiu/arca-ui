import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComponentCard } from "@/components/site/component-card"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { CATEGORIES, CATALOG, type CategoryId } from "@/lib/catalog"

export function ComponentsPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const category = (params.get("category") as CategoryId | null) ?? "all"

  const items = useMemo(() => {
    return CATALOG.filter((item) => {
      const matchCategory = category === "all" || item.category === category
      const haystack = `${item.title} ${item.description} ${item.collectedAs}`.toLowerCase()
      return matchCategory && haystack.includes(query.trim().toLowerCase())
    })
  }, [category, query])

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <div className="border-b border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components..."
            className="max-w-lg"
          />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="text-sm text-muted-foreground">Components</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            组件目录
            <span className="ml-3 align-middle rounded-full border px-3 py-1 text-base font-medium text-muted-foreground">
              {CATALOG.length}
            </span>
          </h1>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          基于 Base UI 的组件库，可按分类浏览全部演示。
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={category === "all" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setParams({})}
          >
            全部
          </Button>
          {CATEGORIES.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={category === item.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setParams({ category: item.id })}
            >
              {item.title}
            </Button>
          ))}
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ComponentCard key={item.slug} item={item} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
