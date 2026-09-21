import { Link } from "react-router-dom"

import { PreviewFrame } from "@/components/site/preview-frame"
import { getDemo } from "@/components/arca/registry"
import type { CatalogItem } from "@/lib/catalog"

export function ComponentCard({ item }: { item: CatalogItem }) {
  const Demo = getDemo(item.slug)

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-border bg-card transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <PreviewFrame toolbar={false} className="rounded-none border-0 shadow-none">
        <div className="pointer-events-none scale-[0.92]">
          {Demo ? <Demo /> : <span className="text-sm text-muted-foreground">{item.title}</span>}
        </div>
      </PreviewFrame>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <h3 className="font-medium">
          <Link to={`/components/${item.slug}`} className="after:absolute after:inset-0">
            {item.title}
          </Link>
        </h3>
        <span className="text-sm text-muted-foreground">1 component</span>
      </div>
    </article>
  )
}
