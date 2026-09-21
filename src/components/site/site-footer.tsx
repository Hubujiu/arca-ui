import { Link } from "react-router-dom"

import { CATEGORIES } from "@/lib/catalog"
import { Logo } from "@/components/site/logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            基于 Base UI 的组件库。
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium">分类</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link to={`/components?category=${category.id}`} className="hover:text-foreground">
                  {category.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium">资源</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/components" className="hover:text-foreground">
                组件目录
              </Link>
            </li>
            <li>
              <Link to="/docs" className="hover:text-foreground">
                开始使用
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium">技术栈</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Base UI</li>
            <li>Tailwind CSS v4 · Nova</li>
            <li>React 19 · Vite</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Arca。基于 Base UI 的组件库。
        </p>
      </div>
    </footer>
  )
}
