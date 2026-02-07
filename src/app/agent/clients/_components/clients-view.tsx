'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Users, Search, ArrowUpDown } from 'lucide-react'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { ClientsSummaryPanel, type StatusFilter } from './clients-summary-panel'
import { DeadlineCountdown } from '@/components/deadline-countdown'

type SortOption = 'priority' | 'newest' | 'oldest' | 'deadline'

interface AgentClient {
  id: string
  name: string
  intakeStatus: IntakeStatus
  status: string
  statusColor: string
  nextTask: string | null
  step: number
  totalSteps: number
  progress: number
  lastUpdated: string
  updatedAt: string
  deadline: string | null
}

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

const STATUS_BORDER_COLOR: Record<string, string> = {
  [IntakeStatus.IN_EXECUTION]: 'border-l-primary',
  [IntakeStatus.PHONE_ISSUED]: 'border-l-blue-500',
  [IntakeStatus.NEEDS_MORE_INFO]: 'border-l-orange-500',
  [IntakeStatus.PENDING_EXTERNAL]: 'border-l-orange-500',
  [IntakeStatus.EXECUTION_DELAYED]: 'border-l-yellow-500',
  [IntakeStatus.READY_FOR_APPROVAL]: 'border-l-accent',
  [IntakeStatus.PENDING]: 'border-l-slate-500',
  [IntakeStatus.INACTIVE]: 'border-l-slate-600',
  [IntakeStatus.APPROVED]: 'border-l-chart-4',
  [IntakeStatus.REJECTED]: 'border-l-destructive',
}

const SORT_LABELS: Record<SortOption, string> = {
  priority: 'Priority',
  newest: 'Newest Updated',
  oldest: 'Oldest Updated',
  deadline: 'Deadline',
}

const SORT_OPTIONS: SortOption[] = ['priority', 'newest', 'oldest', 'deadline']

export function ClientsView({ clients, stats }: ClientsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [sort, setSort] = useState<SortOption>('priority')
  const [sortOpen, setSortOpen] = useState(false)

  const filteredClients = useMemo(() => {
    let result = clients

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
        // Clients with deadlines first (ascending), then those without
        if (a.deadline && b.deadline)
          return a.deadline.localeCompare(b.deadline)
        if (a.deadline) return -1
        if (b.deadline) return 1
        return 0
      }
      return a.updatedAt.localeCompare(b.updatedAt)
    })

    return result
  }, [clients, statusFilter, search, sort])

  const isTerminal = (status: IntakeStatus) =>
    status === IntakeStatus.APPROVED || status === IntakeStatus.REJECTED

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <ClientsSummaryPanel
        stats={stats}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-muted/30 border-border/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {filteredClients.length}
              </span>{' '}
              of{' '}
              <span className="font-medium text-foreground">
                {clients.length}
              </span>{' '}
              clients
            </span>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setSortOpen(!sortOpen)}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {SORT_LABELS[sort]}
              </Button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border/50 bg-card p-1 shadow-lg">
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
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground hover:bg-muted/50',
                      )}
                    >
                      {SORT_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Cards */}
        {filteredClients.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-2xl bg-muted/50 p-4 ring-1 ring-border/30">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
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
                  <Button className="btn-glow h-11 rounded-xl bg-primary px-6 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Client
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <Link key={client.id} href={`/agent/clients/${client.id}`}>
                <Card
                  className={cn(
                    'group h-full border-l-2 border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive cursor-pointer',
                    STATUS_BORDER_COLOR[client.intakeStatus] ||
                      'border-l-slate-500',
                    isTerminal(client.intakeStatus) && 'opacity-60',
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg font-semibold text-foreground">
                          {client.name}
                        </CardTitle>
                        {client.nextTask && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            Next: {client.nextTask}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${client.statusColor}`}
                      >
                        {client.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          Step {client.step} of {client.totalSteps}
                        </span>
                        <span className="font-semibold text-foreground">
                          {client.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
                          style={{ width: `${client.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Deadline Countdown */}
                    {client.deadline && (
                      <DeadlineCountdown
                        deadline={client.deadline}
                        variant="badge"
                      />
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-4">
                      <p className="text-xs text-muted-foreground">
                        Updated {client.lastUpdated}
                      </p>
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                        View Details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
