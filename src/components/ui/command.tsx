import * as React from "react"
import { cn } from "cn"
import { SearchIcon, CheckIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"

type CommandContextValue = {
  query: string
  setQuery: (value: string) => void
  matchCount: number
  setMatch: (id: string, matched: boolean) => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommand() {
  const context = React.useContext(CommandContext)
  if (!context) {
    throw new Error("Command components must be used within <Command>")
  }
  return context
}

function Command({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("")
  const [matches, setMatches] = React.useState<Record<string, boolean>>({})

  const setMatch = React.useCallback((id: string, matched: boolean) => {
    setMatches((current) => {
      if (current[id] === matched) return current
      return { ...current, [id]: matched }
    })
  }, [])

  const matchCount = Object.values(matches).filter(Boolean).length

  return (
    <CommandContext.Provider value={{ query, setQuery, matchCount, setMatch }}>
      <div
        data-slot="command"
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground",
          className
        )}
        {...props}
      />
    </CommandContext.Provider>
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const { query, setQuery } = useCommand()

  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8 rounded-lg border-input/30 bg-input/30 shadow-none *:data-[slot=input-group-addon]:pl-2">
        <input
          data-slot="command-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            props.onChange?.(event)
          }}
          className={cn(
            "w-full bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { matchCount } = useCommand()
  if (matchCount > 0) return null

  return (
    <div
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  heading,
  ...props
}: React.ComponentProps<"div"> & { heading?: string }) {
  return (
    <div
      data-slot="command-group"
      className={cn("overflow-hidden p-1 text-foreground", className)}
      {...props}
    >
      {heading ? (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      ) : null}
      {props.children}
    </div>
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  keywords = [],
  onSelect,
  ...props
}: React.ComponentProps<"button"> & {
  keywords?: string[]
  onSelect?: () => void
}) {
  const { query, setMatch } = useCommand()
  const itemId = React.useId()
  const value = [String(children), ...keywords].join(" ").toLowerCase()
  const visible = !query || value.includes(query.toLowerCase())

  React.useEffect(() => {
    setMatch(itemId, visible)
    return () => setMatch(itemId, false)
  }, [itemId, visible, setMatch])

  if (!visible) return null

  return (
    <button
      type="button"
      data-slot="command-item"
      onClick={onSelect}
      className={cn(
        "group/command-item relative flex w-full cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-muted hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-data-[checked=true]/command-item:opacity-100" />
    </button>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
