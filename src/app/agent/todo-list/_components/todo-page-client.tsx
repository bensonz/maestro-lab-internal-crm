'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentHeader } from './agent-header'
import { GrowthPanel } from './growth-panel'
import { MaintenancePanel } from './maintenance-panel'
import { TeamSupport } from './task-list'
import type {
  GrowthClient,
  MaintenanceClient,
  TeamSupportItem,
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

// Expected income per client based on star level: 1★=$250, 2★=$300, 3★=$350, 4★=$400
function getExpectedIncome(starLevel: number): number {
  return 200 + Math.min(starLevel, 4) * 50
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

// Build growth clients from server client data
function buildGrowthClients(
  clients: ServerClientData[],
  starLevel: number,
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

      return {
        id: c.id,
        name: c.name,
        stage,
        stageLabel: label,
        daysInPipeline: Math.abs(daysInPipeline),
        expectedIncome: getExpectedIncome(starLevel),
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
      const match = t.due.match(/(\d+)([dhm])/)
      const hours = match
        ? match[2] === 'd'
          ? parseInt(match[1]) * 24
          : match[2] === 'h'
            ? parseInt(match[1])
            : 1
        : 72
      const daysOverdue = Math.max(1, Math.ceil(hours / 24))

      const isHighPriority =
        t.task.toLowerCase().includes('high') ||
        t.task.toLowerCase().includes('urgent') ||
        t.task.toLowerCase().includes('critical')

      return {
        id: t.id,
        name: t.client,
        taskCategory: isHighPriority
          ? ('high_priority' as const)
          : ('platform_verification' as const),
        taskDescription: t.task,
        daysRemaining: -daysOverdue,
        overduePercent: daysOverdue, // 1% per day overdue
      }
    })
}

// ── Fake data for demo ──────────────────────────────────────────────
const FAKE_GROWTH_CLIENTS: GrowthClient[] = [
  { id: 'g1', name: 'Marcus Rivera', stage: 'in_progress', stageLabel: 'In Progress', daysInPipeline: 3, expectedIncome: 250, pendingTasks: 2 },
  { id: 'g2', name: 'Sophia Chen', stage: 'phone_issued', stageLabel: 'Phone Issued', daysInPipeline: 1, expectedIncome: 250, pendingTasks: 3 },
  { id: 'g3', name: 'Derek Williams', stage: 'review', stageLabel: 'Ready for Review', daysInPipeline: 7, expectedIncome: 250, pendingTasks: 0 },
  { id: 'g4', name: 'Aisha Patel', stage: 'pending', stageLabel: 'Pending', daysInPipeline: 0, expectedIncome: 250, pendingTasks: 1 },
]

const FAKE_MAINTENANCE_CLIENTS: MaintenanceClient[] = [
  { id: 'm1', name: 'Jason Torres', taskCategory: 'platform_verification', taskDescription: 'Verify DraftKings account screenshots', daysRemaining: 2, overduePercent: 0 },
  { id: 'm2', name: 'Emily Nguyen', taskCategory: 'high_priority', taskDescription: 'Re-submit PayPal ownership verification', daysRemaining: -1, overduePercent: 1 },
  { id: 'm3', name: 'Carlos Mendez', taskCategory: 'platform_verification', taskDescription: 'Upload FanDuel registration confirmation', daysRemaining: 1, overduePercent: 0 },
  { id: 'm4', name: 'Lisa Chang', taskCategory: 'high_priority', taskDescription: 'Update expired ID document immediately', daysRemaining: -3, overduePercent: 3 },
  { id: 'm5', name: 'Ryan Brooks', taskCategory: 'platform_verification', taskDescription: 'Confirm BetRivers account status', daysRemaining: -2, overduePercent: 2 },
]

const FAKE_TEAM_SUPPORT: TeamSupportItem[] = [
  { id: 'ts1', agentName: 'Sarah Kim', agentPhone: '+1-555-0101', hint: 'Sarah is 1 step away from closing her first client — could use guidance on Phase 2 submission', potentialEarning: 200 },
  { id: 'ts2', agentName: 'Jake Martinez', agentPhone: '+1-555-0102', hint: 'Jake has 3 clients stuck in PayPal setup — needs help troubleshooting verification', potentialEarning: 600 },
  { id: 'ts3', agentName: 'Priya Sharma', agentPhone: '+1-555-0103', hint: 'Priya\'s BetMGM submission was rejected — help her prepare retry screenshots', potentialEarning: 250 },
  { id: 'ts4', agentName: 'Tyler Johnson', agentPhone: '+1-555-0104', hint: 'Tyler is new and needs walkthrough on bank setup process for his first client', potentialEarning: 250 },
]

export function TodoPageClient({
  todoData,
  clients,
  agentName,
  agentStarLevel,
  earningsData,
}: TodoPageClientProps) {
  // Build growth clients from server data, fall back to fake data
  const growthClients = useMemo(
    () => {
      const real = buildGrowthClients(clients, agentStarLevel)
      return real.length > 0 ? real : FAKE_GROWTH_CLIENTS
    },
    [clients, agentStarLevel],
  )

  // Build maintenance clients from server data, fall back to fake data
  const maintenanceClients = useMemo(
    () => {
      const real = buildMaintenanceClients(todoData.pendingTasks)
      return real.length > 0 ? real : FAKE_MAINTENANCE_CLIENTS
    },
    [todoData.pendingTasks],
  )

  // Team support — always fake for now (needs real subordinate data)
  const teamSupport = FAKE_TEAM_SUPPORT

  // Calculate total overdue percentage
  const totalOverduePercent = useMemo(
    () => maintenanceClients.reduce((s, c) => s + c.overduePercent, 0),
    [maintenanceClients],
  )

  const bonusBase = 10000
  const effectiveBonus = Math.max(0, bonusBase * ((100 - totalOverduePercent) / 100))

  // Agent profile
  const agent: AgentProfile = {
    name: agentName,
    starLevel: agentStarLevel,
    totalClients: clients.length || 8, // fallback for demo
    activeClients: clients.filter((c) =>
      ['PHONE_ISSUED', 'IN_EXECUTION'].includes(c.intakeStatus),
    ).length || 4, // fallback for demo
  }

  // Total potential from growth clients
  const potentialNew = growthClients.reduce((s, c) => s + c.expectedIncome, 0)

  // Count today's tasks
  const totalTasks = maintenanceClients.length + growthClients.reduce((s, c) => s + c.pendingTasks, 0)

  // Daily goal stats
  const dailyGoal = useMemo(
    () => ({
      potentialNew,
      overduePercent: totalOverduePercent,
      bonusAmount: bonusBase,
      effectiveBonus,
      completedTasks: todoData.completedToday,
      totalTasks,
      currentStreak: todoData.completedToday,
    }),
    [potentialNew, totalOverduePercent, effectiveBonus, todoData.completedToday, totalTasks],
  )

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-[1400px] animate-fade-in space-y-4 p-6">
        {/* Tier 1: Context & Daily Goal */}
        <AgentHeader agent={agent} data={dailyGoal} />

        {/* Tier 2: Growth + Maintenance */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GrowthPanel clients={growthClients} starLevel={agentStarLevel} />
          <MaintenancePanel
            clients={maintenanceClients}
            totalOverduePercent={totalOverduePercent}
          />
        </div>

        {/* Tier 3: Team Support */}
        <TeamSupport items={teamSupport} />
      </div>
    </ScrollArea>
  )
}
