'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Clock,
  Users,
  FileCheck,
  AlertCircle,
  Hourglass,
  FileText,
  Phone,
  MonitorSmartphone,
  PhoneOff,
  Shield,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { ClientIntakeList } from './client-intake-list'
import { VerificationTasksTable } from './verification-tasks-table'
import type { IntakeClient, VerificationTask, InProgressSubStage } from '@/backend/data/operations'

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

type SortOption = 'priority' | 'deadline' | 'last-updated'

interface SalesInteractionViewProps {
  stats: {
    totalClients: number
    inProgress: number
    pendingApproval: number
    verificationNeeded: number
  }
  agentHierarchy: HierarchyGroup[]
  clientIntake: IntakeClient[]
  verificationTasks: VerificationTask[]
}

// ── Summary filter items (4 statuses only) ──────────
type SummaryFilter = 'total' | 'in-progress' | 'pending-approval' | 'verification-needed'

const summaryItems: {
  key: SummaryFilter
  label: string
  icon: React.ElementType
  colorClass: string
  activeClass: string
  statKey: keyof SalesInteractionViewProps['stats']
}[] = [
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Clock,
    colorClass: 'text-primary',
    activeClass: 'bg-primary/10 text-primary',
    statKey: 'inProgress',
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    icon: Hourglass,
    colorClass: 'text-warning',
    activeClass: 'bg-warning/10 text-warning',
    statKey: 'pendingApproval',
  },
  {
    key: 'verification-needed',
    label: 'Verification Needed',
    icon: AlertCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/10 text-destructive',
    statKey: 'verificationNeeded',
  },
]

// ── In Progress sub-stage definitions ───────────────
interface SubStageGroup {
  key: InProgressSubStage
  label: string
  icon: React.ElementType
  headerColor: string
}

const inProgressSubStages: SubStageGroup[] = [
  {
    key: 'pre-qualification',
    label: 'Pre-Qualification',
    icon: FileText,
    headerColor: 'text-muted-foreground',
  },
  {
    key: 'ten-questions',
    label: 'Ten Questions',
    icon: FileCheck,
    headerColor: 'text-primary',
  },
  {
    key: 'waiting-for-phone',
    label: 'Waiting for Phone',
    icon: Phone,
    headerColor: 'text-warning',
  },
  {
    key: 'phone-issued',
    label: 'Phone Issued',
    icon: MonitorSmartphone,
    headerColor: 'text-primary',
  },
  {
    key: 'platform-registrations',
    label: 'Platform Registrations',
    icon: Shield,
    headerColor: 'text-primary',
  },
  {
    key: 'phone-returned',
    label: 'Phone Returned',
    icon: PhoneOff,
    headerColor: 'text-muted-foreground',
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    icon: Hourglass,
    headerColor: 'text-warning',
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
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('total')
  const [sortOption, setSortOption] = useState<SortOption>('priority')
  const [inProgressOpen, setInProgressOpen] = useState(true)
  const [verificationOpen, setVerificationOpen] = useState(true)

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

  // Filter intake clients by agent and search
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

  // Filter verification tasks by agent and search
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

  // Separate intake clients into "In Progress" and "Verification Needed"
  const inProgressClients = useMemo(
    () => filteredIntake.filter((c) => c.subStage !== 'verification-needed'),
    [filteredIntake],
  )

  const verificationClients = useMemo(
    () => filteredIntake.filter((c) => c.subStage === 'verification-needed'),
    [filteredIntake],
  )

  // Dynamic counts
  const dynamicCounts = useMemo(() => {
    return {
      totalClients: filteredIntake.length + filteredTasks.length,
      inProgress: inProgressClients.length,
      pendingApproval: filteredIntake.filter((c) => c.subStage === 'pending-approval').length,
      verificationNeeded: verificationClients.length + filteredTasks.length,
    }
  }, [filteredIntake, filteredTasks, inProgressClients, verificationClients])

  // What sections to show based on summary filter
  const showInProgress =
    summaryFilter === 'total' || summaryFilter === 'in-progress' || summaryFilter === 'pending-approval'
  const showVerification =
    summaryFilter === 'total' || summaryFilter === 'verification-needed'

  // Selected agent name
  const selectedAgentName = useMemo(() => {
    if (!selectedAgentId) return null
    for (const group of agentHierarchy) {
      const agent = group.agents.find((a) => a.id === selectedAgentId)
      if (agent) return agent.name
    }
    return null
  }, [agentHierarchy, selectedAgentId])

  return (
    <div className="flex h-full animate-fade-in" data-testid="sales-interaction-view">
      {/* ── LEFT PANEL ── */}
      <div className="hidden w-56 min-w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* Page Title */}
        <div className="border-b border-sidebar-border p-4">
          <h2 className="text-lg font-semibold">Sales Interaction</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Operations Queue
          </p>
        </div>

        {/* Summary (4 statuses only) */}
        <div className="space-y-1 border-b border-sidebar-border p-3">
          <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Summary
          </p>

          {/* Total row */}
          <button
            onClick={() => setSummaryFilter('total')}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
              summaryFilter === 'total'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            data-testid="summary-filter-total"
          >
            <div className="flex items-center gap-2">
              <Users
                className={cn(
                  'h-4 w-4',
                  summaryFilter === 'total' ? 'text-primary' : 'text-primary',
                )}
              />
              <span className="text-xs">Total Clients</span>
            </div>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-sm font-semibold',
                summaryFilter === 'total' ? 'bg-primary/20 text-primary' : 'bg-muted',
              )}
            >
              {dynamicCounts.totalClients}
            </span>
          </button>

          {summaryItems.map((item) => {
            const isActive = summaryFilter === item.key
            const count = dynamicCounts[item.statKey]

            return (
              <button
                key={item.key}
                onClick={() => setSummaryFilter(isActive ? 'total' : item.key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? item.activeClass
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
                data-testid={`summary-filter-${item.key}`}
              >
                <div className="flex items-center gap-2">
                  <item.icon
                    className={cn('h-4 w-4', isActive ? '' : item.colorClass)}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-sm font-semibold',
                    isActive ? `${item.activeClass.split(' ')[0]}/20` : 'bg-muted',
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

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="sort-dropdown">
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
              {inProgressClients.length + verificationClients.length + filteredTasks.length}
            </span>{' '}
            items
          </p>
          {selectedAgentName && (
            <div className="flex items-center gap-2 rounded border border-primary/20 bg-primary/10 px-2.5 py-1">
              <Users className="h-3 w-3 text-primary" />
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

        {/* Collapsible Sections Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* ── In Progress Section ── */}
            {showInProgress && (
              <Collapsible
                open={inProgressOpen}
                onOpenChange={setInProgressOpen}
                data-testid="section-in-progress"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center justify-between rounded-t-md bg-muted/50 px-4 py-3 transition-colors hover:bg-muted',
                      !inProgressOpen && 'rounded-b-md',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {inProgressOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        In Progress
                      </span>
                    </div>
                    <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {inProgressClients.length}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-hidden rounded-b-md border border-t-0 border-border/50">
                    {inProgressClients.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No clients in progress
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {inProgressSubStages.map((stage) => {
                          const stageClients = summaryFilter === 'pending-approval'
                            ? inProgressClients.filter((c) => c.subStage === 'pending-approval')
                            : inProgressClients.filter((c) => c.subStage === stage.key)
                          if (stageClients.length === 0 && summaryFilter !== 'pending-approval') return null
                          if (summaryFilter === 'pending-approval' && stage.key !== 'pending-approval') return null

                          return (
                            <SubStageSection
                              key={stage.key}
                              stage={stage}
                              clients={stageClients}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* ── Verification Needed Section ── */}
            {showVerification && (
              <Collapsible
                open={verificationOpen}
                onOpenChange={setVerificationOpen}
                data-testid="section-verification-needed"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center justify-between rounded-t-md bg-muted/50 px-4 py-3 transition-colors hover:bg-muted',
                      !verificationOpen && 'rounded-b-md',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {verificationOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">
                        Verification Needed
                      </span>
                    </div>
                    <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {verificationClients.length + filteredTasks.length}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-hidden rounded-b-md border border-t-0 border-border/50">
                    {verificationClients.length === 0 && filteredTasks.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No verification tasks pending
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {/* Intake clients needing verification */}
                        {verificationClients.length > 0 && (
                          <ClientIntakeList
                            clients={verificationClients}
                            selectedAgentId={selectedAgentId}
                          />
                        )}
                        {/* Verification tasks (document review) */}
                        {filteredTasks.length > 0 && (
                          <VerificationTasksTable
                            tasks={filteredTasks}
                            selectedAgentId={selectedAgentId}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

/* ─── Sub-stage collapsible within In Progress ─── */
function SubStageSection({
  stage,
  clients,
}: {
  stage: SubStageGroup
  clients: IntakeClient[]
}) {
  const [isOpen, setIsOpen] = useState(true)
  const Icon = stage.icon

  if (clients.length === 0) return null

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      data-testid={`substage-${stage.key}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between border-b border-border/30 bg-card/30 px-6 py-2 transition-colors hover:bg-card/50',
          )}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Icon className={cn('h-3.5 w-3.5', stage.headerColor)} />
            <span className={cn('text-xs font-medium', stage.headerColor)}>
              {stage.label}
            </span>
          </div>
          <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
            {clients.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ClientIntakeList clients={clients} selectedAgentId={null} />
      </CollapsibleContent>
    </Collapsible>
  )
}
