'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
} from 'lucide-react'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { ClientsSummaryPanel, type StatusFilter } from './clients-summary-panel'
import { ClientsGroupedList } from './clients-grouped-list'
import { ClientsCardView } from './clients-card-view'
import type { AgentClient } from './types'

type SortOption = 'priority' | 'newest' | 'oldest' | 'deadline'
type ViewMode = 'list' | 'card'

interface ClientsViewProps {
  clients: AgentClient[]
  stats: {
    total: number
    inProgress: number
    pendingApproval: number
    verificationNeeded: number
    approved: number
    rejected: number
  }
}

const STATUS_FILTER_MAP: Record<StatusFilter, IntakeStatus[]> = {
  inProgress: [IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION],
  needsInfo: [
    IntakeStatus.NEEDS_MORE_INFO,
    IntakeStatus.PENDING_EXTERNAL,
    IntakeStatus.EXECUTION_DELAYED,
  ],
  pendingApproval: [IntakeStatus.READY_FOR_APPROVAL],
  approved: [IntakeStatus.APPROVED],
  rejected: [IntakeStatus.REJECTED],
}

const STATUS_PRIORITY: Record<string, number> = {
  [IntakeStatus.IN_EXECUTION]: 0,
  [IntakeStatus.PHONE_ISSUED]: 1,
  [IntakeStatus.NEEDS_MORE_INFO]: 2,
  [IntakeStatus.PENDING_EXTERNAL]: 3,
  [IntakeStatus.EXECUTION_DELAYED]: 4,
  [IntakeStatus.READY_FOR_APPROVAL]: 5,
  [IntakeStatus.PENDING]: 6,
  [IntakeStatus.INACTIVE]: 7,
  [IntakeStatus.APPROVED]: 8,
  [IntakeStatus.REJECTED]: 9,
}

const SORT_LABELS: Record<SortOption, string> = {
  priority: 'Priority',
  newest: 'Newest',
  oldest: 'Oldest',
  deadline: 'Deadline',
}

const SORT_OPTIONS: SortOption[] = ['priority', 'newest', 'oldest', 'deadline']

const TERMINAL_STATUSES: IntakeStatus[] = [IntakeStatus.APPROVED, IntakeStatus.REJECTED]

export function ClientsView({ clients, stats }: ClientsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [sort, setSort] = useState<SortOption>('priority')
  const [sortOpen, setSortOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [hideCompleted, setHideCompleted] = useState(false)

  const filteredClients = useMemo(() => {
    let result = clients

    // Hide completed toggle
    if (hideCompleted) {
      result = result.filter(
        (c) => !TERMINAL_STATUSES.includes(c.intakeStatus),
      )
    }

    // Status filter from sidebar
    if (statusFilter) {
      const allowedStatuses = STATUS_FILTER_MAP[statusFilter]
      result = result.filter((c) => allowedStatuses.includes(c.intakeStatus))
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort === 'priority') {
        return (
          (STATUS_PRIORITY[a.intakeStatus] ?? 99) -
          (STATUS_PRIORITY[b.intakeStatus] ?? 99)
        )
      }
      if (sort === 'newest') {
        return b.updatedAt.localeCompare(a.updatedAt)
      }
      if (sort === 'deadline') {
        if (a.deadline && b.deadline)
          return a.deadline.localeCompare(b.deadline)
        if (a.deadline) return -1
        if (b.deadline) return 1
        return 0
      }
      return a.updatedAt.localeCompare(b.updatedAt)
    })

    return result
  }, [clients, statusFilter, search, sort, hideCompleted])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <ClientsSummaryPanel
        stats={stats}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-card pl-9"
              data-testid="clients-search"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setSortOpen(!sortOpen)}
              data-testid="sort-dropdown"
            >
              Sort: {SORT_LABELS[sort]}
              <ChevronDown className="h-4 w-4" />
            </Button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSort(option)
                      setSortOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                      sort === option
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/50',
                    )}
                  >
                    {SORT_LABELS[option]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-2">
            {/* Hide completed toggle */}
            <Button
              variant={hideCompleted ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setHideCompleted(!hideCompleted)}
              data-testid="hide-completed-toggle"
            >
              {hideCompleted ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span className="hidden text-xs sm:inline">
                {hideCompleted ? 'Showing active' : 'Hide completed'}
              </span>
            </Button>

            {/* View mode buttons */}
            <div className="flex items-center rounded-md border border-border">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('list')}
                data-testid="view-list-btn"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('card')}
                data-testid="view-card-btn"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results count strip */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-mono font-medium text-foreground">
              {filteredClients.length}
            </span>{' '}
            of{' '}
            <span className="font-mono font-medium text-foreground">
              {clients.length}
            </span>{' '}
            clients
          </p>
        </div>

        {/* Client List/Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {filteredClients.length === 0 ? (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 rounded-2xl bg-muted/50 p-4 ring-1 ring-border/30">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {clients.length === 0
                      ? 'No clients yet'
                      : 'No matching clients'}
                  </h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {clients.length === 0
                      ? 'Start by adding your first client'
                      : 'Try adjusting your search or filters'}
                  </p>
                  {clients.length === 0 && (
                    <Link href="/agent/new-client">
                      <Button data-testid="add-first-client-btn">
                        Add Your First Client
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              <ClientsGroupedList clients={filteredClients} />
            ) : (
              <ClientsCardView clients={filteredClients} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
