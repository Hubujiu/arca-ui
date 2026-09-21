import { ArrowRightIcon, RocketIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CATALOG, CATEGORIES } from "@/lib/catalog"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"

const stats = [
  { label: "Tasks", value: "19" },
  { label: "Blocked", value: "3", tone: "destructive" },
  { label: "At risk", value: "3", tone: "warning" },
  { label: "Unassigned", value: "2" },
]

export function HomePage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="bg-dot-grid bg-dot-fade pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Link
            to="/docs"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground"
          >
            <RocketIcon className="size-3.5" />
            开始使用
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            基于 Base UI 的组件库
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            按钮、表单、导航、数据和覆盖层组件，交互原语基于 Base UI。
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/components" className={buttonVariants({ size: "lg" })}>
              浏览组件
            </Link>
            <Link to="/docs" className={buttonVariants({ size: "lg", variant: "outline" })}>
              阅读文档
            </Link>
          </div>
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="overflow-hidden rounded-[28px] border border-border bg-muted/50 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">
            <div className="overflow-hidden rounded-[22px] border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Roadmap Queue</span>
                  <span>/</span>
                  <span>Grouping</span>
                </div>
                <div className="flex gap-1">
                  <span className="size-6 rounded-md border border-border" />
                  <span className="size-6 rounded-md border border-border" />
                </div>
              </div>
              <div className="p-8">
                <h2 className="text-2xl font-semibold">Roadmap Queue</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track work by stage, owner, and signal.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {stats.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-2 text-muted-foreground">
                      {item.label}
                      <Badge variant={item.tone === "destructive" ? "destructive" : "secondary"}>
                        {item.value}
                      </Badge>
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Input className="max-w-xl" placeholder="Search roadmap..." />
                  <Button variant="outline">Signals</Button>
                  <Button variant="outline">Display</Button>
                  <Button>New task</Button>
                </div>
                <div className="mt-6 divide-y rounded-xl border">
                  {["Alex Johnson", "Sarah Chen", "Michael Rodriguez"].map((name) => (
                    <div key={name} className="flex items-center gap-3 px-4 py-3">
                      <Avatar size="sm">
                        <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">Viewer · ready-only access</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Components</p>
            <h2 className="mt-1 text-3xl font-semibold">
              {CATALOG.length} 个组件
            </h2>
          </div>
          <Link to="/components" className={buttonVariants({ variant: "outline" })}>
            查看全部
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category.id}
              to={`/components?category=${category.id}`}
              className="rounded-2xl border border-border px-5 py-4 hover:bg-muted/40"
            >
              <div className="text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-2 font-medium">{category.title}</div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
