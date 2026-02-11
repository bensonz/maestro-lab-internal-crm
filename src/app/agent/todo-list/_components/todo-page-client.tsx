'use client'

import { useState, useMemo, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentHeader } from './agent-header'
import { GrowthPanel } from './growth-panel'
import { MaintenancePanel } from './maintenance-panel'
import { TaskList } from './task-list'
import { FeedbackToast } from './feedback-toast'
import type {
  Todo,
  TimeRange,
  GrowthClient,
  MaintenanceClient,
  AgentProfile,
} from './types'

// Server data shape from getAgentTodos + getAgentClients
interface ServerTodoData {
  todaysTasks: number
  thisWeek: number
  overdue: number
  completedToday: number
  pendingTasks: Array<{
    id: string
    task: string
    description: string
    client: string
    clientId: string
    due: string
    overdue: boolean
    stepNumber: number
    createdAt: string
    extensionsUsed: number
    maxExtensions: number
    createdByName: string
    metadata: Record<string, unknown> | null
  }>
}

interface ServerClientData {
  id: string
  name: string
  intakeStatus: string
  nextTask: string | null
  step: number
  totalSteps: number
  deadline: string | null
}

interface EarningsData {
  totalEarnings: number
  pendingPayout: number
  thisMonth: number
  recentTransactions: Array<{
    id: string
    client: string
    description: string
    amount: number
    status: string
    date: string
    rawDate: string
  }>
  commission: {
    totalEarned: number
    pending: number
    paid: number
    directBonuses: number
    starSlices: number
  }
  overrides: {
    overrideTotal: number
    ownTotal: number
  }
}

interface TodoPageClientProps {
  todoData: ServerTodoData
  clients: ServerClientData[]
  agentName: string
  agentStarLevel: number
  earningsData: EarningsData
}

// $400 bonus pool per approved lead (matches commission rules)
const POOL_PER_LEAD = 400

function getEarningForTask(taskType: string): number {
  const map: Record<string, number> = {
    'Bank Setup': 50,
    PayPal: 30,
    Edgeboost: 40,
    Platform: 200,
    Verification: 25,
    Document: 20,
  }
  return map[taskType] || 0
}

// Map our ToDoType enum values to display-friendly task types
function mapTaskType(task: string): string {
  const lower = task.toLowerCase()
  if (lower.includes('bank') || lower.includes('debit')) return 'Bank Setup'
  if (lower.includes('paypal')) return 'PayPal'
  if (lower.includes('edgeboost')) return 'Edgeboost'
  if (lower.includes('platform') || lower.includes('registration'))
    return 'Platform'
  if (
    lower.includes('verif') ||
    lower.includes('identity') ||
    lower.includes('compliance')
  )
    return 'Verification'
  if (lower.includes('document') || lower.includes('upload'))
    return 'Document'
  return 'Platform'
}

// Map intake statuses to growth stages
function mapStageLabel(status: string): { stage: string; label: string } {
  const map: Record<string, { stage: string; label: string }> = {
    PENDING: { stage: 'pending', label: 'Pending' },
    PHONE_ISSUED: { stage: 'phone_issued', label: 'Phone Issued' },
    IN_EXECUTION: { stage: 'in_progress', label: 'In Progress' },
    NEEDS_MORE_INFO: { stage: 'needs_info', label: 'Needs Info' },
    PENDING_EXTERNAL: { stage: 'pending_external', label: 'Pending External' },
    EXECUTION_DELAYED: { stage: 'delayed', label: 'Delayed' },
    READY_FOR_APPROVAL: { stage: 'review', label: 'Ready for Review' },
  }
  return map[status] || { stage: 'pending', label: status }
}

// Convert server todo into Lovable Todo shape
function mapServerTodoToTodo(
  serverTodo: ServerTodoData['pendingTasks'][0],
): Todo {
  const dueHours = parseDueToHours(serverTodo.due, serverTodo.overdue)
  const meta = serverTodo.metadata as {
    instructions?: {
      mustDo?: string[]
      mustNotDo?: string[]
      successCriteria?: string
    }
  } | null

  const defaultInstructions = {
    mustDo: ['Follow task instructions carefully'],
    mustNotDo: ['Do not skip required steps'],
    successCriteria: 'Task completed per guidelines',
  }

  return {
    id: serverTodo.id,
    title: serverTodo.task,
    description: serverTodo.description,
    client: serverTodo.client,
    clientId: serverTodo.clientId,
    taskType: mapTaskType(serverTodo.task),
    priority: serverTodo.overdue ? 'high' : dueHours <= 24 ? 'medium' : 'low',
    completed: false,
    dueHours,
    triggerType:
      serverTodo.createdByName === 'System' ? 'Rule' : 'Backoffice',
    triggerSource: serverTodo.createdByName,
    linkedStep: serverTodo.stepNumber,
    createdAt: serverTodo.createdAt,
    extensionsUsed: serverTodo.extensionsUsed,
    maxExtensions: serverTodo.maxExtensions,
    instructions: {
      mustDo: meta?.instructions?.mustDo ?? defaultInstructions.mustDo,
      mustNotDo: meta?.instructions?.mustNotDo ?? defaultInstructions.mustNotDo,
      successCriteria:
        meta?.instructions?.successCriteria ??
        defaultInstructions.successCriteria,
    },
  }
}

function parseDueToHours(due: string, isOverdue: boolean): number {
  const match = due.match(/(\d+)([dhm])/)
  if (!match) return 72 // Default to 3 days if unparseable

  const value = parseInt(match[1], 10)
  const unit = match[2]

  let hours = 0
  if (unit === 'd') hours = value * 24
  else if (unit === 'h') hours = value
  else if (unit === 'm') hours = Math.ceil(value / 60)

  return isOverdue ? -hours : hours
}

// Build growth clients from server client data
function buildGrowthClients(
  clients: ServerClientData[],
  earningsData: EarningsData,
): GrowthClient[] {
  const growthStatuses = [
    'PENDING',
    'PHONE_ISSUED',
    'IN_EXECUTION',
    'NEEDS_MORE_INFO',
    'PENDING_EXTERNAL',
    'EXECUTION_DELAYED',
    'READY_FOR_APPROVAL',
  ]

  return clients
    .filter((c) => growthStatuses.includes(c.intakeStatus))
    .map((c) => {
      const { stage, label } = mapStageLabel(c.intakeStatus)
      const daysInPipeline = c.deadline
        ? Math.max(
            0,
            Math.ceil(
              (Date.now() - new Date(c.deadline).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0

      // Look up earnings for this client from real data
      const clientEarnings = earningsData.recentTransactions.filter(
        (t) => t.client === c.name,
      )
      const paidEarnings = clientEarnings
        .filter((t) => t.status === 'Paid')
        .reduce((sum, t) => sum + t.amount, 0)
      const pendingEarnings = clientEarnings
        .filter((t) => t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        id: c.id,
        name: c.name,
        stage,
        stageLabel: label,
        daysInPipeline: Math.abs(daysInPipeline),
        directEarning: paidEarnings,
        starEarning: 0,
        downlineEarning: 0,
        upstreamShare: 0,
        recycledAmount: 0,
        finalTake: paidEarnings + pendingEarnings,
        poolPerLead: POOL_PER_LEAD,
        pendingTasks: c.nextTask ? 1 : 0,
      }
    })
}

// Build maintenance clients from overdue todo data
function buildMaintenanceClients(
  pendingTasks: ServerTodoData['pendingTasks'],
): MaintenanceClient[] {
  return pendingTasks
    .filter((t) => t.overdue)
    .map((t) => {
      const hoursOverdue = Math.abs(parseDueToHours(t.due, true))
      const daysOverdue = Math.max(1, Math.ceil(hoursOverdue / 24))

      const bonusRiskPercent = Math.min(100, daysOverdue * 15)
      return {
        id: t.id,
        name: t.client,
        status: 'verification',
        statusLabel: 'Re-Verification',
        taskDescription: t.task,
        overdueDays: daysOverdue,
        bonusRiskPercent,
        atRiskAmount: POOL_PER_LEAD * (bonusRiskPercent / 100),
        dueDate: t.due,
      }
    })
}

export function TodoPageClient({
  todoData,
  clients,
  agentName,
  agentStarLevel,
  earningsData,
}: TodoPageClientProps) {
  // Map server data to Lovable Todo shape
  const initialTodos = useMemo(
    () => todoData.pendingTasks.map(mapServerTodoToTodo),
    [todoData.pendingTasks],
  )

  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [timeFilter, setTimeFilter] = useState<TimeRange>('3days')
  const [showCompleted, setShowCompleted] = useState(false)

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastEarning, setLastEarning] = useState(0)
  const [totalEarnedToday, setTotalEarnedToday] = useState(0)

  // Build growth/maintenance data from server clients
  const growthClients = useMemo(
    () => buildGrowthClients(clients, earningsData),
    [clients, earningsData],
  )
  const maintenanceClients = useMemo(
    () => buildMaintenanceClients(todoData.pendingTasks),
    [todoData.pendingTasks],
  )

  // Filtered todos for execution layer
  const filteredTodos = useMemo(() => {
    const maxHours =
      timeFilter === '1day' ? 24 : timeFilter === '3days' ? 72 : 168
    return todos
      .filter(
        (t) => (t.dueHours < 0 && !t.completed) || t.dueHours <= maxHours,
      )
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return a.dueHours - b.dueHours
      })
  }, [todos, timeFilter])

  // Agent profile
  const agent: AgentProfile = {
    name: agentName,
    starLevel: agentStarLevel,
    totalClients: clients.length,
    activeClients: clients.filter((c) =>
      ['PHONE_ISSUED', 'IN_EXECUTION'].includes(c.intakeStatus),
    ).length,
  }

  // Daily goal stats
  const dailyGoal = useMemo(() => {
    const todayTodos = todos.filter(
      (t) => t.dueHours <= 24 || t.dueHours < 0,
    )
    const overdueCount = todos.filter(
      (t) => !t.completed && t.dueHours < 0,
    ).length

    // Daily target scales with star level
    const dailyTarget = agentStarLevel * 100 + 100

    return {
      earnedToday: totalEarnedToday,
      dailyTarget,
      potentialNew: growthClients.reduce((s, c) => s + c.finalTake, 0),
      potentialMaintenance: maintenanceClients.reduce(
        (s, c) => s + c.atRiskAmount,
        0,
      ),
      confirmedDirect: earningsData.commission.paid,
      confirmedStar: earningsData.commission.starSlices,
      confirmedDownline: earningsData.overrides.overrideTotal,
      overdueCount,
      overdueRiskAmount: maintenanceClients
        .filter((c) => c.overdueDays > 0)
        .reduce((s, c) => s + c.atRiskAmount, 0),
      completedTasks: todayTodos.filter((t) => t.completed).length,
      totalTasks: todayTodos.length,
      currentStreak: todoData.completedToday,
    }
  }, [
    todos,
    totalEarnedToday,
    growthClients,
    maintenanceClients,
    agentStarLevel,
    earningsData,
    todoData.completedToday,
  ])

  // Handlers
  const handleUpload = useCallback((_todo: Todo) => {
    // TODO: Open AI detection modal for screenshot upload
    // For now, mark as completed directly
    const earning = getEarningForTask(_todo.taskType)
    setLastEarning(earning)
    setTotalEarnedToday((prev) => prev + earning)
    setTodos((prev) =>
      prev.map((t) => (t.id === _todo.id ? { ...t, completed: true } : t)),
    )
    setShowFeedback(true)
  }, [])

  const handleExtend = useCallback((todoId: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId && t.extensionsUsed < t.maxExtensions
          ? {
              ...t,
              dueHours: t.dueHours + 72,
              extensionsUsed: t.extensionsUsed + 1,
            }
          : t,
      ),
    )
  }, [])

  const handleReactivate = useCallback((todoId: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId ? { ...t, completed: false, dueHours: 72 } : t,
      ),
    )
  }, [])

  const handleDismissFeedback = useCallback(() => {
    setShowFeedback(false)
  }, [])

  const totalOverdue = maintenanceClients.filter(
    (c) => c.overdueDays > 0,
  ).length
  const totalAtRisk = maintenanceClients
    .filter((c) => c.overdueDays > 0)
    .reduce((s, c) => s + c.atRiskAmount, 0)

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[1400px] animate-fade-in space-y-4 p-6">
        {/* Tier 1: Context & Daily Goal */}
        <AgentHeader agent={agent} data={dailyGoal} />

        {/* Tier 2 & 3: Growth + Maintenance */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GrowthPanel clients={growthClients} />
          <MaintenancePanel
            clients={maintenanceClients}
            totalOverdue={totalOverdue}
            totalAtRisk={totalAtRisk}
          />
        </div>

        {/* Tier 4: Execution Layer */}
        <TaskList
          todos={filteredTodos}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          onUpload={handleUpload}
          onExtend={handleExtend}
          onReactivate={handleReactivate}
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
        />
      </div>

      {/* Feedback toast */}
      <FeedbackToast
        lastEarning={lastEarning}
        totalEarnedToday={totalEarnedToday}
        currentStreak={todoData.completedToday}
        completedToday={dailyGoal.completedTasks}
        show={showFeedback}
        onDismiss={handleDismissFeedback}
      />
    </ScrollArea>
  )
}
