'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Users, UserCheck, CheckSquare, Search, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'client' | 'agent' | 'task'
  id: string
  title: string
  subtitle: string
  status: string
  link: string
}

function useGlobalSearchState() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen }
}

// Singleton state so SearchTrigger and GlobalSearch share open/close
let globalSetOpen: ((open: boolean) => void) | null = null

export function GlobalSearch() {
  const router = useRouter()
  const { open, setOpen } = useGlobalSearchState()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  globalSetOpen = setOpen

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    timerRef.current = setTimeout(() => search(value), 300)
  }

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(result.link)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setQuery('')
      setResults([])
    }
  }

  const clients = results.filter((r) => r.type === 'client')
  const agents = results.filter((r) => r.type === 'agent')
  const tasks = results.filter((r) => r.type === 'task')
  const hasResults = results.length > 0
  const hasQuery = query.length >= 2

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Global Search"
      description="Search across clients, agents, and tasks"
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search clients, agents, tasks..."
        value={query}
        onValueChange={handleQueryChange}
        data-testid="global-search-input"
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {!isLoading && hasQuery && !hasResults && (
          <CommandEmpty>No results found</CommandEmpty>
        )}

        {!isLoading && !hasQuery && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </div>
        )}

        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((r) => (
              <CommandItem
                key={r.id}
                value={`client-${r.id}`}
                onSelect={() => handleSelect(r)}
                data-testid={`search-result-client-${r.id}`}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{r.title}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {r.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {clients.length > 0 && (agents.length > 0 || tasks.length > 0) && (
          <CommandSeparator />
        )}

        {agents.length > 0 && (
          <CommandGroup heading="Agents">
            {agents.map((r) => (
              <CommandItem
                key={r.id}
                value={`agent-${r.id}`}
                onSelect={() => handleSelect(r)}
                data-testid={`search-result-agent-${r.id}`}
              >
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="truncate">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                </div>
                <Badge
                  variant={r.status === 'active' ? 'secondary' : 'outline'}
                  className="ml-2 text-[10px]"
                >
                  {r.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {agents.length > 0 && tasks.length > 0 && <CommandSeparator />}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((r) => (
              <CommandItem
                key={r.id}
                value={`task-${r.id}`}
                onSelect={() => handleSelect(r)}
                data-testid={`search-result-task-${r.id}`}
              >
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="truncate">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                </div>
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {r.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export function SearchTrigger({
  variant = 'input',
  className,
}: {
  variant?: 'input' | 'icon'
  className?: string
}) {
  function handleClick() {
    globalSetOpen?.(true)
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        data-testid="search-trigger-icon"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative flex items-center rounded-md border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted',
        className,
      )}
      data-testid="search-trigger-input"
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="flex-1 text-left">Search clients, tasks...</span>
      <kbd className="pointer-events-none ml-2 hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
        ⌘K
      </kbd>
    </button>
  )
}
