import { Link } from "react-router-dom"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { CATALOG, CATEGORIES } from "@/lib/catalog"

const TOC = [
  { id: "intro", label: "简介" },
  { id: "principles", label: "原则" },
  { id: "install", label: "接入" },
  { id: "usage", label: "使用组件" },
  { id: "categories", label: "分类" },
]

export function DocsPage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <div className="relative">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40" />
        <main className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)_180px]">
          <aside className="hidden text-sm lg:block">
            <div className="sticky top-20 space-y-6">
              <div>
                <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  开始
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="font-medium text-foreground">简介</li>
                  <li>
                    <Link to="/components" className="hover:text-foreground">
                      组件目录
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  分类
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  {CATEGORIES.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/components?category=${category.id}`}
                        className="hover:text-foreground"
                      >
                        {category.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
          <article className="max-w-3xl">
            <p className="text-sm text-muted-foreground">Introduction</p>
            <h1 id="intro" className="mt-2 text-4xl font-semibold tracking-tight">
              Arca 组件库
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              基于 Base UI 的 React 组件库。{CATALOG.length}{" "}
              个组件已按类目收进本仓库。
            </p>
            <p className="mt-4 leading-7 text-muted-foreground">
              对话框、选择器、菜单、开关、滑杆、Tooltip 等交互原语使用{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                @base-ui/react
              </code>
              。
            </p>

            <h2 id="principles" className="mt-12 text-2xl font-semibold tracking-tight">
              原则
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
              <li>源码在仓库内运行，不依赖外部 registry。</li>
              <li>交互原语使用 Base UI。</li>
              <li>样式使用 Tailwind CSS v4 与 Nova 中性色 token。</li>
              <li>动效使用 Motion，并尊重 prefers-reduced-motion。</li>
            </ul>

            <h2 id="install" className="mt-12 text-2xl font-semibold tracking-tight">
              接入
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              克隆本仓库后安装依赖并启动文档站：
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-sm">
              {`npm install
npm run dev`}
            </pre>

            <h2 id="usage" className="mt-12 text-2xl font-semibold tracking-tight">
              使用组件
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              组件实现落在{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                src/components/motion
              </code>
              、
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                src/components/watermelon
              </code>{" "}
              等目录。文档页演示从{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                src/components/arca
              </code>{" "}
              引用。按压按钮示例：
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-sm">
              {`import { Button } from "@/components/motion/button"

export function Example() {
  return <Button>Continue</Button>
}`}
            </pre>
            <p className="mt-4 leading-7 text-muted-foreground">
              打开{" "}
              <Link to="/components" className="underline underline-offset-4">
                组件目录
              </Link>{" "}
              可按分类浏览全部 {CATALOG.length} 个演示。
            </p>

            <h2 id="categories" className="mt-12 text-2xl font-semibold tracking-tight">
              分类
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  to={`/components?category=${category.id}`}
                  className="rounded-2xl border border-border px-5 py-4 hover:bg-muted/40"
                >
                  <div className="font-medium">{category.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </Link>
              ))}
            </div>
          </article>
          <aside className="hidden text-sm lg:block">
            <div className="sticky top-20">
              <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                On this page
              </div>
              <ul className="space-y-2 text-muted-foreground">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="hover:text-foreground">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
