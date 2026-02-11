'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Users,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react'
import { IntakeStatus } from '@/types'
import { ClientsSummaryPanel, type StatusFilter } from './clients-summary-panel'
import { ClientsGroupedList } from './clients-grouped-list'
import { ClientsCardView } from './clients-card-view'
import type { AgentClient } from './types'

type SortOption = 'priority' | 'newest' | 'oldest'
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
    aborted: number
  }
}

const STATUS_FILTER_MAP: Record<StatusFilter, IntakeStatus[]> = {
  inProgress: [IntakeStatus.PENDING, IntakeStatus.PREQUAL_REVIEW, IntakeStatus.PREQUAL_APPROVED, IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION],
  needsInfo: [
    IntakeStatus.NEEDS_MORE_INFO,
    IntakeStatus.PENDING_EXTERNAL,
    IntakeStatus.EXECUTION_DELAYED,
  ],
  pendingApproval: [IntakeStatus.READY_FOR_APPROVAL],
  approved: [IntakeStatus.APPROVED],
  rejected: [IntakeStatus.REJECTED],
  aborted: [IntakeStatus.INACTIVE],
}

const STATUS_PRIORITY: Record<string, number> = {
  [IntakeStatus.PENDING]: 0,
  [IntakeStatus.PREQUAL_REVIEW]: 1,
  [IntakeStatus.PREQUAL_APPROVED]: 2,
  [IntakeStatus.IN_EXECUTION]: 3,
  [IntakeStatus.PHONE_ISSUED]: 4,
  [IntakeStatus.NEEDS_MORE_INFO]: 5,
  [IntakeStatus.PENDING_EXTERNAL]: 6,
  [IntakeStatus.EXECUTION_DELAYED]: 7,
  [IntakeStatus.READY_FOR_APPROVAL]: 8,
  [IntakeStatus.INACTIVE]: 9,
  [IntakeStatus.APPROVED]: 10,
  [IntakeStatus.REJECTED]: 11,
}

const TERMINAL_STATUSES: IntakeStatus[] = [
  IntakeStatus.APPROVED,
  IntakeStatus.REJECTED,
  IntakeStatus.INACTIVE,
]

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  inProgress: 'In Progress',
  needsInfo: 'Verification Needed',
  pendingApproval: 'Pending Approval',
  approved: 'Active',
  rejected: 'Rejected',
  aborted: 'Aborted',
}

const STATUS_FILTER_OPTIONS: StatusFilter[] = [
  'inProgress',
  'needsInfo',
  'pendingApproval',
  'approved',
  'rejected',
  'aborted',
]

export function ClientsView({ clients, stats }: ClientsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [sort, setSort] = useState<SortOption>('priority')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [hideCompleted, setHideCompleted] = useState(false)

  // Keyboard shortcut for Active Only toggle (A key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey) {
        setHideCompleted((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredClients = useMemo(() => {
    let result = clients

    // Hide completed toggle
    if (hideCompleted) {
      result = result.filter(
        (c) => !TERMINAL_STATUSES.includes(c.intakeStatus),
      )
    }

    // Status filter from sidebar or toolbar dropdown
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
        const priorityDiff =
          (STATUS_PRIORITY[a.intakeStatus] ?? 99) -
          (STATUS_PRIORITY[b.intakeStatus] ?? 99)
        if (priorityDiff !== 0) return priorityDiff
        return b.updatedAt.localeCompare(a.updatedAt)
      }
      if (sort === 'newest') {
        return b.updatedAt.localeCompare(a.updatedAt)
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

          {/* Status Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                data-testid="status-filter-dropdown"
              >
                Status:{' '}
                {statusFilter
                  ? STATUS_FILTER_LABELS[statusFilter]
                  : 'All'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                All Statuses
              </DropdownMenuItem>
              {STATUS_FILTER_OPTIONS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setStatusFilter(key)}
                >
                  {STATUS_FILTER_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                data-testid="sort-dropdown"
              >
                Sort:{' '}
                {sort === 'priority'
                  ? 'Priority'
                  : sort === 'newest'
                    ? 'Newest'
                    : 'Oldest'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSort('priority')}>
                Priority (Default)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort('newest')}>
                Most Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort('oldest')}>
                Oldest Updated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Only Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
                <Switch
                  id="hide-completed"
                  checked={hideCompleted}
                  onCheckedChange={setHideCompleted}
                  data-testid="hide-completed-toggle"
                />
                <Label
                  htmlFor="hide-completed"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  Active Only
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Press{' '}
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  A
                </kbd>{' '}
                to toggle
              </p>
            </TooltipContent>
          </Tooltip>

          {/* View Toggle */}
          <div className="ml-auto flex items-center rounded-md border border-border">
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
              <ClientsGroupedList clients={filteredClients} activeFilter={statusFilter} />
            ) : (
              <ClientsCardView clients={filteredClients} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
