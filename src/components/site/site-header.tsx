import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useTheme } from "@/components/theme-provider"
import { CATEGORIES, CATALOG } from "@/lib/catalog"
import { Logo } from "@/components/site/logo"

export function SiteHeader() {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const resolvedDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <Link to="/components" className="rounded-md px-2.5 py-1.5 hover:bg-muted hover:text-foreground">
            组件
          </Link>
          <Link to="/docs" className="rounded-md px-2.5 py-1.5 hover:bg-muted hover:text-foreground">
            文档
          </Link>
          <Link to="/enterprise" className="rounded-md px-2.5 py-1.5 hover:bg-muted hover:text-foreground">
            企业门户
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden min-w-48 justify-start text-muted-foreground md:inline-flex"
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
            搜索组件…
            <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <SearchIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedDark ? "light" : "dark")}
            aria-label="切换主题"
          >
            {resolvedDark ? <SunIcon /> : <MoonIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" />}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.24 9.24 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </Button>
        </div>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen} title="搜索组件" description="按名称或分类查找">
        <Command>
          <CommandInput placeholder="搜索组件、分类…" />
          <CommandList>
            <CommandEmpty>没有匹配的组件</CommandEmpty>
            {CATEGORIES.map((category) => (
              <CommandGroup key={category.id} heading={category.title}>
                {CATALOG.filter((item) => item.category === category.id).map((item) => (
                  <CommandItem
                    key={item.slug}
                    keywords={[item.title, item.description, category.title]}
                    onSelect={() => {
                      setOpen(false)
                      navigate(`/components/${item.slug}`)
                    }}
                  >
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}
