'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Clock,
  Users,
  FileCheck,
  AlertCircle,
  Hourglass,
  FileText,
  Shield,
  ClipboardCheck,
  Undo2,
  Loader2,
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
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { completeTodo, revertTodo } from '@/app/actions/todos'
import { ClientIntakeList } from './client-intake-list'
import { DraftReviewDialog } from './draft-review-dialog'
import { DeviceAssignDialog } from './device-assign-dialog'
import { AssignTodoDialog } from './assign-todo-dialog'
import { VerificationTasksTable } from './verification-tasks-table'
import { ClientDetail } from '../../client-management/_components/client-detail'
import { mapServerClientToClient } from '../../client-management/_components/map-client'
import type { Client, ServerClientData } from '../../client-management/_components/types'
import type { IntakeClient, VerificationTask, InProgressSubStage, CompletedTodoEntry, TodoTimelineEntry, ApprovedClientEntry } from '@/types/backend-types'

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
  completedTodos: CompletedTodoEntry[]
  approvedClients: ApprovedClientEntry[]
  todoTimeline: TodoTimelineEntry[]
  lifecycleClients: ServerClientData[]
}

// ── Summary filter items ──────────
type SummaryFilter = 'total' | 'in-progress' | 'pending-approval' | 'verification-needed'

const summaryItems: {
  key: SummaryFilter
  label: string
  icon: React.ElementType
  colorClass: string
  activeClass: string
}[] = [
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Clock,
    colorClass: 'text-primary',
    activeClass: 'bg-primary/10 text-primary',
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    icon: Hourglass,
    colorClass: 'text-warning',
    activeClass: 'bg-warning/10 text-warning',
  },
  {
    key: 'verification-needed',
    label: 'Verification Needed',
    icon: AlertCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/10 text-destructive',
  },
]

// ── In Progress sub-stage definitions ───────────────
// Maps to 4-step client draft intake form:
// Step 1: Pre-Qual (ID, Gmail, BetMGM)
// Step 2: Background (SSN, criminal, banking)
// Step 3: Platforms (11 platform registrations)
// Step 4: Contract (upload + checklist)
interface SubStageGroup {
  key: InProgressSubStage
  label: string
  stepLabel: string
  icon: React.ElementType
  headerColor: string
}

const inProgressSubStages: SubStageGroup[] = [
  {
    key: 'step-1',
    label: 'Pre-Qual',
    stepLabel: '1',
    icon: FileText,
    headerColor: 'text-muted-foreground',
  },
  {
    key: 'step-2',
    label: 'Background',
    stepLabel: '2',
    icon: FileCheck,
    headerColor: 'text-primary',
  },
  {
    key: 'step-3',
    label: 'Platforms',
    stepLabel: '3',
    icon: Shield,
    headerColor: 'text-primary',
  },
  {
    key: 'step-4',
    label: 'Contract',
    stepLabel: '4',
    icon: ClipboardCheck,
    headerColor: 'text-primary',
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    stepLabel: '',
    icon: Hourglass,
    headerColor: 'text-warning',
  },
]

export function SalesInteractionView({
  agentHierarchy,
  clientIntake,
  verificationTasks,
  completedTodos,
  approvedClients,
  todoTimeline,
  lifecycleClients,
}: SalesInteractionViewProps) {
  const router = useRouter()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('total')
  const [sortOption, setSortOption] = useState<SortOption>('priority')
  const [verificationOpen, setVerificationOpen] = useState(false)
  const [reviewingDraftId, setReviewingDraftId] = useState<string | null>(null)
  const [reviewingDraftName, setReviewingDraftName] = useState('')
  const [reviewingResultClientId, setReviewingResultClientId] = useState<string | null>(null)

  // Reviewed section + timeline state
  const [reviewedOpen, setReviewedOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)

  // Revert todo state
  const [revertingTodoId, setRevertingTodoId] = useState<string | null>(null)

  const handleCompleteTodo = useCallback(async (todoId: string, clientName: string) => {
    try {
      const result = await completeTodo(todoId)
      if (result.success) {
        toast.success(`To-do completed for ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to complete to-do')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }, [router])

  const handleRevertTodo = useCallback(async (todoId: string, clientName: string) => {
    setRevertingTodoId(todoId)
    try {
      const result = await revertTodo(todoId)
      if (result.success) {
        toast.success(`To-do reverted for ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to revert to-do')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setRevertingTodoId(null)
    }
  }, [router])

  // Assign To-Do dialog state
  const [todoDialogOpen, setTodoDialogOpen] = useState(false)

  // Device assign dialog state
  const [assigningDraftId, setAssigningDraftId] = useState<string | null>(null)
  const [assigningClientName, setAssigningClientName] = useState('')
  const [assigningAgentName, setAssigningAgentName] = useState('')
  const [assigningInitialPhone, setAssigningInitialPhone] = useState<string | null>(null)
  const [assigningInitialCarrier, setAssigningInitialCarrier] = useState<string | null>(null)

  const handleReviewDraft = useCallback((id: string, name: string, resultClientId?: string | null) => {
    setReviewingDraftId(id)
    setReviewingDraftName(name)
    setReviewingResultClientId(resultClientId ?? null)
  }, [])

  const handleAssignDevice = useCallback((draftId: string, clientName: string, agentName: string, phone?: string | null, carrier?: string | null) => {
    setAssigningDraftId(draftId)
    setAssigningClientName(clientName)
    setAssigningAgentName(agentName)
    setAssigningInitialPhone(phone ?? null)
    setAssigningInitialCarrier(carrier ?? null)
  }, [])

  // Client detail panel state (lifecycle clients mapped to view model)
  const mappedClients = useMemo(
    () => lifecycleClients.map(mapServerClientToClient),
    [lifecycleClients],
  )
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const handleSelectClient = useCallback(
    (clientId: string) => {
      const target = mappedClients.find((c) => c.id === clientId)
      if (target) {
        setSelectedClient(target)
      } else {
        toast.error('Client record not found')
      }
    },
    [mappedClients],
  )

  const handleNavigateToClient = useCallback(
    (clientId: string) => {
      const target = mappedClients.find((c) => c.id === clientId)
      if (target) setSelectedClient(target)
    },
    [mappedClients],
  )

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

  // Filter completed todos by agent and search
  const filteredCompletedTodos = useMemo(() => {
    let result = selectedAgentId
      ? completedTodos.filter((t) => t.agentId === selectedAgentId)
      : completedTodos
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q) ||
          t.issueCategory.toLowerCase().includes(q),
      )
    }
    return result
  }, [completedTodos, selectedAgentId, clientSearch])

  // Filter approved clients by agent and search
  const filteredApprovedClients = useMemo(() => {
    let result = selectedAgentId
      ? approvedClients.filter((c) => c.agentId === selectedAgentId)
      : approvedClients
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.clientName.toLowerCase().includes(q) ||
          c.agentName.toLowerCase().includes(q),
      )
    }
    return result
  }, [approvedClients, selectedAgentId, clientSearch])

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

  // Exception counts per sub-stage
  const subStageExceptionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of inProgressSubStages) {
      counts[stage.key] = inProgressClients.filter(
        (c) => c.subStage === stage.key && c.exceptionStates.length > 0,
      ).length
    }
    return counts
  }, [inProgressClients])

  // What sections to show based on summary filter
  const showInProgress =
    summaryFilter === 'total' || summaryFilter === 'in-progress' || summaryFilter === 'pending-approval'
  const showVerification =
    summaryFilter === 'total' || summaryFilter === 'verification-needed'

  // Per-agent active client counts (in-progress + verification needed)
  const agentActiveCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of clientIntake) {
      counts[c.agentId] = (counts[c.agentId] || 0) + 1
    }
    return counts
  }, [clientIntake])

  // Selected agent name
  const selectedAgentName = useMemo(() => {
    if (!selectedAgentId) return null
    for (const group of agentHierarchy) {
      const agent = group.agents.find((a) => a.id === selectedAgentId)
      if (agent) return agent.name
    }
    return null
  }, [agentHierarchy, selectedAgentId])

  // Show client detail panel when a client is selected
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        allClients={mappedClients}
        onBack={() => setSelectedClient(null)}
        onNavigateToClient={handleNavigateToClient}
      />
    )
  }

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

        {/* Summary */}
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
              <Users className="h-4 w-4 text-primary" />
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
            const count = item.key === 'in-progress'
              ? dynamicCounts.inProgress
              : item.key === 'pending-approval'
                ? dynamicCounts.pendingApproval
                : dynamicCounts.verificationNeeded

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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs font-medium">
                          {agent.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {(agentActiveCounts[agent.id] || 0) > 0 && (
                          <Badge
                            variant="outline"
                            className="h-4 border-primary/30 bg-primary/10 px-1 font-mono text-[10px] text-primary"
                          >
                            {agentActiveCounts[agent.id]}
                          </Badge>
                        )}
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
            onClick={() => setTodoDialogOpen(true)}
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
          <div className="space-y-3 p-4">
            {/* ── In Progress Section (always open, sub-steps collapsible) ── */}
            {showInProgress && (
              <div data-testid="section-in-progress">
                <div className="flex w-full items-center justify-between rounded-t-lg border border-border/50 bg-card px-4 py-3 shadow-sm">
                  <span className="text-sm font-semibold text-foreground">
                    In Progress
                  </span>
                  <Badge
                    variant="outline"
                    className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
                  >
                    {inProgressClients.length}
                  </Badge>
                </div>
                <div className="overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
                  {inProgressClients.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No clients in progress
                    </p>
                  ) : (
                    <div>
                      {inProgressSubStages.map((stage) => {
                        const stageClients = summaryFilter === 'pending-approval'
                          ? inProgressClients.filter((c) => c.subStage === 'pending-approval')
                          : inProgressClients.filter((c) => c.subStage === stage.key)
                        if (summaryFilter === 'pending-approval' && stage.key !== 'pending-approval') return null

                        return (
                          <SubStageSection
                            key={stage.key}
                            stage={stage}
                            clients={stageClients}
                            exceptionCount={subStageExceptionCounts[stage.key] || 0}
                            onSelectClient={handleSelectClient}
                            onReviewDraft={handleReviewDraft}
                            onAssignDevice={handleAssignDevice}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                      'flex w-full items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/5',
                      verificationOpen && 'rounded-b-none border-b-0',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {verificationOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        Verification Needed
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-6 border-destructive/30 bg-destructive/10 px-2.5 font-mono text-xs font-semibold text-destructive"
                    >
                      {verificationClients.length + filteredTasks.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
                    {verificationClients.length === 0 && filteredTasks.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No verification tasks pending
                      </p>
                    ) : (
                      <div>
                        {verificationClients.length > 0 && (
                          <ClientIntakeList
                            clients={verificationClients}
                            selectedAgentId={selectedAgentId}
                            onSelectClient={handleSelectClient}
                            onReviewDraft={handleReviewDraft}
                          />
                        )}
                        {filteredTasks.length > 0 && (
                          <VerificationTasksTable
                            tasks={filteredTasks}
                            selectedAgentId={selectedAgentId}
                            onSelectClient={handleSelectClient}
                            onAssignDevice={handleAssignDevice}
                            onCompleteTodo={handleCompleteTodo}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* ── Reviewed Section (approved clients + completed todos) ── */}
            <div data-testid="section-reviewed">
              <button
                type="button"
                onClick={() => setReviewedOpen(!reviewedOpen)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                data-testid="toggle-reviewed"
              >
                <span className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Reviewed ({filteredApprovedClients.length + filteredCompletedTodos.length})
                </span>
                {reviewedOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {reviewedOpen && (
                <div className="mt-1 overflow-hidden rounded-lg border border-border">
                  {filteredApprovedClients.length === 0 && filteredCompletedTodos.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No reviewed items yet
                    </p>
                  ) : (
                  <div className="divide-y divide-border">
                  {/* Approved clients */}
                  {filteredApprovedClients.map((client) => (
                    <div
                      key={`approved-${client.id}`}
                      className="flex items-start gap-3 px-4 py-2"
                      data-testid={`reviewed-approved-${client.id}`}
                    >
                      <Badge
                        className="mt-0.5 shrink-0 border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0 text-[10px] text-emerald-400"
                      >
                        Approved
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium">
                            {client.clientName}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {client.agentName}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Client approved &middot; $400 bonus pool distributed
                        </div>
                      </div>
                      <span className="mt-0.5 shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(client.approvedAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                  {/* Completed todos */}
                  {filteredCompletedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 px-4 py-2"
                      data-testid={`reviewed-todo-${todo.id}`}
                    >
                      <Badge
                        className="mt-0.5 shrink-0 border-success/30 bg-success/20 px-1.5 py-0 text-[10px] text-success"
                      >
                        {todo.issueCategory}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium">
                            {todo.clientName}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {todo.agentName}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>by {todo.completedByName}</span>
                          <span className="opacity-50">&middot;</span>
                          <span>assigned by {todo.createdByName}</span>
                        </div>
                      </div>
                      <span className="mt-0.5 shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(todo.completedAt), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => handleRevertTodo(todo.id, todo.clientName)}
                        disabled={revertingTodoId === todo.id}
                        data-testid={`revert-todo-${todo.id}`}
                      >
                        {revertingTodoId === todo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Undo2 className="h-3 w-3" />
                        )}
                        Revert
                      </Button>
                    </div>
                  ))}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Activity Timeline ── */}
            {showVerification && (
              <div data-testid="todo-activity-timeline">
                <div className="border-t border-border" />
                <div className="pt-3">
                  {timelineOpen && (
                    <div className="mb-1 max-h-64 overflow-hidden overflow-y-auto rounded-lg border border-border">
                      {todoTimeline.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No activity yet
                        </p>
                      ) : (
                      <div className="divide-y divide-border">
                      {todoTimeline.map((entry) => {
                        const actionConfigs: Record<string, { label: string; badgeClass: string }> = {
                          assigned: { label: 'Assigned', badgeClass: 'bg-primary/20 text-primary border-primary/30' },
                          completed: { label: 'Completed', badgeClass: 'bg-success/20 text-success border-success/30' },
                          reverted: { label: 'Reverted', badgeClass: 'bg-warning/20 text-warning border-warning/30' },
                          device_out: { label: 'Device Out', badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                          device_returned: { label: 'Returned', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                          device_reissued: { label: 'Re-issued', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                        }
                        const actionConfig = actionConfigs[entry.action] ?? actionConfigs.assigned
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 px-3 py-1"
                            data-testid={`todo-timeline-${entry.id}`}
                          >
                            <Badge className={`shrink-0 px-1.5 py-0 text-[9px] ${actionConfig.badgeClass}`}>
                              {actionConfig.label}
                            </Badge>
                            <span className="truncate text-[11px] text-foreground">
                              {entry.event}
                            </span>
                            <span className="ml-auto shrink-0 whitespace-nowrap text-[9px] text-muted-foreground">
                              {entry.date} {entry.time}
                            </span>
                            {entry.actor && (
                              <span className="shrink-0 whitespace-nowrap text-[9px] text-muted-foreground">
                                by {entry.actor}
                              </span>
                            )}
                          </div>
                        )
                      })}
                      </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setTimelineOpen(!timelineOpen)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                    data-testid="toggle-todo-timeline"
                  >
                    <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Activity Timeline ({todoTimeline.length})
                    </span>
                    {timelineOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <DraftReviewDialog
        draftId={reviewingDraftId}
        draftName={reviewingDraftName}
        resultClientId={reviewingResultClientId}
        onClose={() => setReviewingDraftId(null)}
      />

      <DeviceAssignDialog
        draftId={assigningDraftId}
        clientName={assigningClientName}
        agentName={assigningAgentName}
        initialPhone={assigningInitialPhone}
        initialCarrier={assigningInitialCarrier}
        onClose={() => setAssigningDraftId(null)}
      />

      <AssignTodoDialog
        open={todoDialogOpen}
        onClose={() => setTodoDialogOpen(false)}
        clients={clientIntake}
      />
    </div>
  )
}

/* ─── Sub-stage collapsible within In Progress ─── */
function SubStageSection({
  stage,
  clients,
  exceptionCount,
  onSelectClient,
  onReviewDraft,
  onAssignDevice,
}: {
  stage: SubStageGroup
  clients: IntakeClient[]
  exceptionCount: number
  onSelectClient?: (clientId: string) => void
  onReviewDraft?: (draftId: string, name: string, resultClientId?: string | null) => void
  onAssignDevice?: (draftId: string, clientName: string, agentName: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = stage.icon

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={clients.length > 0 ? setIsOpen : undefined}
      data-testid={`substage-${stage.key}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between border-b border-border/30 px-5 py-2.5 transition-colors',
            clients.length > 0 ? 'hover:bg-muted/30' : 'opacity-50',
          )}
        >
          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {stage.stepLabel && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                {stage.stepLabel}
              </span>
            )}
            <Icon className={cn('h-3.5 w-3.5', stage.headerColor)} />
            <span className={cn('text-xs font-medium', stage.headerColor)}>
              {stage.label}
            </span>
            {exceptionCount > 0 && (
              <span
                className="text-[10px] text-muted-foreground"
                data-testid={`substage-alerts-${stage.key}`}
              >
                · {exceptionCount} {exceptionCount === 1 ? 'alert' : 'alerts'}
              </span>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'h-5 px-1.5 font-mono text-[10px]',
              clients.length > 0 ? 'border-primary/30 bg-primary/5 text-primary' : '',
            )}
          >
            {clients.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-b border-border/20 bg-muted/10">
          <ClientIntakeList clients={clients} selectedAgentId={null} onSelectClient={onSelectClient} onReviewDraft={onReviewDraft} onAssignDevice={onAssignDevice} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
