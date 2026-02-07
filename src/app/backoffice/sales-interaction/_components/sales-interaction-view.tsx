'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  Plus,
  Clock,
  Users,
  FileCheck,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ClientIntakeList } from './client-intake-list'
import { VerificationTasksTable } from './verification-tasks-table'
import type { IntakeClient, VerificationTask } from '@/backend/data/operations'

// ── Types ───────────────────────────────────────────
interface AgentInHierarchy {
  id: string
  name: string
  level: string
  stars: number
  clientCount: number
}

interface HierarchyGroup {
  level: string
  agents: AgentInHierarchy[]
}

type QueueFilter = 'all' | 'pending-approval' | 'verification-needed' | 'in-progress'
type SortOption = 'priority' | 'deadline' | 'last-updated'

interface SalesInteractionViewProps {
  stats: {
    clientCount: number
    agentCount: number
    activeApps: number
    pendingCount: number
  }
  agentHierarchy: HierarchyGroup[]
  clientIntake: IntakeClient[]
  verificationTasks: VerificationTask[]
}

const filterItems: {
  key: QueueFilter
  label: string
  icon: React.ElementType
  colorClass: string
}[] = [
  { key: 'all', label: 'All Clients', icon: Users, colorClass: 'text-primary' },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    icon: FileCheck,
    colorClass: 'text-warning',
  },
  {
    key: 'verification-needed',
    label: 'Verification Needed',
    icon: AlertCircle,
    colorClass: 'text-destructive',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Clock,
    colorClass: 'text-primary',
  },
]

export function SalesInteractionView({
  stats,
  agentHierarchy,
  clientIntake,
  verificationTasks,
}: SalesInteractionViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('priority')

  // Filter hierarchy by search
  const filteredHierarchy = useMemo(() => {
    if (!agentSearch) return agentHierarchy
    return agentHierarchy
      .map((group) => ({
        ...group,
        agents: group.agents.filter((a) =>
          a.name.toLowerCase().includes(agentSearch.toLowerCase()),
        ),
      }))
      .filter((group) => group.agents.length > 0)
  }, [agentHierarchy, agentSearch])

  // Filter intake by agent
  const filteredIntake = useMemo(() => {
    let result = selectedAgentId
      ? clientIntake.filter((c) => c.agentId === selectedAgentId)
      : clientIntake
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.agentName.toLowerCase().includes(q),
      )
    }
    return result
  }, [clientIntake, selectedAgentId, clientSearch])

  // Filter verification by agent
  const filteredTasks = useMemo(() => {
    let result = selectedAgentId
      ? verificationTasks.filter((t) => t.agentId === selectedAgentId)
      : verificationTasks
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q) ||
          t.platformLabel.toLowerCase().includes(q),
      )
    }
    return result
  }, [verificationTasks, selectedAgentId, clientSearch])

  // Queue counts
  const queueCounts = useMemo(() => {
    const intake = selectedAgentId
      ? clientIntake.filter((c) => c.agentId === selectedAgentId)
      : clientIntake
    const tasks = selectedAgentId
      ? verificationTasks.filter((t) => t.agentId === selectedAgentId)
      : verificationTasks

    const pendingApproval = intake.filter(
      (c) => c.statusType === 'ready',
    ).length
    const verificationNeeded = tasks.length
    const inProgress = intake.filter(
      (c) => c.statusType !== 'ready',
    ).length

    return {
      all: pendingApproval + verificationNeeded + inProgress,
      pendingApproval,
      verificationNeeded,
      inProgress,
    }
  }, [clientIntake, verificationTasks, selectedAgentId])

  // What to show based on filter
  const showIntake =
    queueFilter === 'all' ||
    queueFilter === 'pending-approval' ||
    queueFilter === 'in-progress'
  const showVerification =
    queueFilter === 'all' || queueFilter === 'verification-needed'

  // Selected agent name
  const selectedAgentName = useMemo(() => {
    if (!selectedAgentId) return null
    for (const group of agentHierarchy) {
      const agent = group.agents.find((a) => a.id === selectedAgentId)
      if (agent) return agent.name
    }
    return null
  }, [agentHierarchy, selectedAgentId])

  const totalShowing = filteredIntake.length + filteredTasks.length
  const totalAll =
    (selectedAgentId
      ? clientIntake.filter((c) => c.agentId === selectedAgentId).length
      : clientIntake.length) +
    (selectedAgentId
      ? verificationTasks.filter((t) => t.agentId === selectedAgentId).length
      : verificationTasks.length)

  return (
    <div className="flex h-full animate-fade-in">
      {/* ── LEFT PANEL ── */}
      <div className="flex w-60 min-w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Page Title */}
        <div className="border-b border-sidebar-border p-4">
          <h2 className="text-lg font-semibold">Sales Interaction</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Operations Queue
          </p>
        </div>

        {/* Work Queue Summary */}
        <div className="space-y-1.5 border-b border-sidebar-border p-3">
          <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Work Queue
          </p>
          {filterItems.map((item) => {
            const Icon = item.icon
            const isActive = queueFilter === item.key
            const countMap: Record<QueueFilter, number> = {
              all: queueCounts.all,
              'pending-approval': queueCounts.pendingApproval,
              'verification-needed': queueCounts.verificationNeeded,
              'in-progress': queueCounts.inProgress,
            }
            const count = countMap[item.key]

            return (
              <button
                key={item.key}
                onClick={() =>
                  setQueueFilter(
                    isActive && item.key !== 'all' ? 'all' : item.key,
                  )
                }
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
                data-testid={`queue-filter-${item.key}`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-primary' : item.colorClass,
                    )}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-sm font-semibold',
                    isActive ? 'bg-primary/20 text-primary' : 'bg-muted',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Team Directory */}
        <div className="border-b border-sidebar-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Team Directory
            </p>
            {selectedAgentId && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => setSelectedAgentId(null)}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              className="h-7 bg-background/50 pl-7 text-xs"
              data-testid="agent-search-input"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 p-2">
            {filteredHierarchy.map(({ level, agents }) => (
              <div key={level}>
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {level}
                </p>
                <div className="space-y-0.5">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() =>
                        setSelectedAgentId(
                          selectedAgentId === agent.id ? null : agent.id,
                        )
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors',
                        selectedAgentId === agent.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted/50',
                      )}
                      data-testid={`agent-filter-${agent.id}`}
                    >
                      <span className="truncate text-xs font-medium">
                        {agent.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {agent.clientCount > 0 && (
                          <Badge
                            variant="outline"
                            className="h-4 border-warning/30 bg-warning/10 px-1 font-mono text-[10px] text-warning"
                          >
                            {agent.clientCount}
                          </Badge>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {agent.clientCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients or agents..."
              className="border-border bg-card pl-9"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              data-testid="client-search-input"
            />
          </div>

          {/* Status Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Status:{' '}
                {queueFilter === 'all'
                  ? 'All'
                  : queueFilter.replace(/-/g, ' ')}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setQueueFilter('all')}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQueueFilter('pending-approval')}
              >
                Pending Approval
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQueueFilter('verification-needed')}
              >
                Verification Needed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQueueFilter('in-progress')}>
                In Progress
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Sort:{' '}
                {sortOption === 'priority'
                  ? 'Priority'
                  : sortOption === 'deadline'
                    ? 'Deadline'
                    : 'Last Updated'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOption('priority')}>
                Priority (Default)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('deadline')}>
                Deadline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('last-updated')}>
                Last Updated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign To-Do Button */}
          <Button
            size="sm"
            variant="terminal"
            className="ml-auto h-9"
            data-testid="assign-todo-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Assign To-Do
          </Button>
        </div>

        {/* Results Count + Active Filter Indicator */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-mono font-medium text-foreground">
              {totalShowing}
            </span>{' '}
            of{' '}
            <span className="font-mono font-medium text-foreground">
              {totalAll}
            </span>{' '}
            clients
          </p>
          {selectedAgentName && (
            <div className="flex items-center gap-2 rounded border border-primary/20 bg-primary/10 px-2.5 py-1">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary">
                Agent:{' '}
                <span className="font-medium">{selectedAgentName}</span>
              </span>
              <button
                className="ml-1 text-xs font-medium text-primary hover:text-primary/80"
                onClick={() => setSelectedAgentId(null)}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Work Queue Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {showIntake && (
              <ClientIntakeList
                clients={
                  queueFilter === 'pending-approval'
                    ? filteredIntake.filter((c) => c.statusType === 'ready')
                    : queueFilter === 'in-progress'
                      ? filteredIntake.filter((c) => c.statusType !== 'ready')
                      : filteredIntake
                }
                selectedAgentId={selectedAgentId}
              />
            )}
            {showVerification && (
              <VerificationTasksTable
                tasks={filteredTasks}
                selectedAgentId={selectedAgentId}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
