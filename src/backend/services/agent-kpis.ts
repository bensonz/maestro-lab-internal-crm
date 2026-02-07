import prisma from '@/backend/prisma/client'
import { IntakeStatus, EventType, ToDoStatus } from '@/types'

export interface AgentKPIs {
  totalClients: number
  approvedClients: number
  rejectedClients: number
  inProgressClients: number
  delayedClients: number

  successRate: number
  delayRate: number
  extensionRate: number

  avgDaysToInitiate: number | null
  avgDaysToConvert: number | null

  pendingTodos: number
  overdueTodos: number
}

const EMPTY_KPIS: AgentKPIs = {
  totalClients: 0,
  approvedClients: 0,
  rejectedClients: 0,
  inProgressClients: 0,
  delayedClients: 0,
  successRate: 0,
  delayRate: 0,
  extensionRate: 0,
  avgDaysToInitiate: null,
  avgDaysToConvert: null,
  pendingTodos: 0,
  overdueTodos: 0,
}

export async function getAgentKPIs(agentId: string): Promise<AgentKPIs> {
  const [
    clients,
    extensionClientCount,
    todoStats,
    initiateEvents,
    convertEvents,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { agentId },
      select: { id: true, intakeStatus: true, createdAt: true },
    }),
    prisma.extensionRequest.groupBy({
      by: ['clientId'],
      where: { client: { agentId } },
    }),
    prisma.toDo.groupBy({
      by: ['status'],
      where: {
        assignedToId: agentId,
        status: {
          in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE],
        },
      },
      _count: true,
    }),
    // Events where client transitioned to PHONE_ISSUED
    prisma.eventLog.findMany({
      where: {
        eventType: EventType.STATUS_CHANGE,
        newValue: IntakeStatus.PHONE_ISSUED,
        client: { agentId },
      },
      select: { clientId: true, createdAt: true },
    }),
    // Events where client transitioned to APPROVED
    prisma.eventLog.findMany({
      where: {
        eventType: EventType.STATUS_CHANGE,
        newValue: IntakeStatus.APPROVED,
        client: { agentId },
      },
      select: { clientId: true, createdAt: true },
    }),
  ])

  if (clients.length === 0) {
    return { ...EMPTY_KPIS }
  }

  const totalClients = clients.length
  const approvedClients = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.APPROVED,
  ).length
  const rejectedClients = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.REJECTED,
  ).length
  const inProgressClients = clients.filter(
    (c) =>
      c.intakeStatus === IntakeStatus.PHONE_ISSUED ||
      c.intakeStatus === IntakeStatus.IN_EXECUTION,
  ).length
  const delayedClients = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.EXECUTION_DELAYED,
  ).length

  // Success rate: approved / (approved + rejected)
  const completed = approvedClients + rejectedClients
  const successRate =
    completed > 0 ? Math.round((approvedClients / completed) * 100) : 0

  // Delay rate: delayed / (inProgress + delayed)
  const activePool = inProgressClients + delayedClients
  const delayRate =
    activePool > 0 ? Math.round((delayedClients / activePool) * 100) : 0

  // Extension rate: distinct clients with extensions / totalClients
  const clientsWithExtensions = extensionClientCount.length
  const extensionRate =
    totalClients > 0
      ? Math.round((clientsWithExtensions / totalClients) * 100)
      : 0

  // Build a map of clientId → createdAt for timing calculations
  const clientCreatedAt = new Map(clients.map((c) => [c.id, c.createdAt]))

  // Avg days to initiate (PENDING → PHONE_ISSUED)
  const avgDaysToInitiate = computeAvgDays(initiateEvents, clientCreatedAt)

  // Avg days to convert (PENDING → APPROVED)
  const avgDaysToConvert = computeAvgDays(convertEvents, clientCreatedAt)

  // Todo stats
  const pendingTodos = todoStats
    .filter(
      (s) =>
        s.status === ToDoStatus.PENDING || s.status === ToDoStatus.IN_PROGRESS,
    )
    .reduce((sum, s) => sum + s._count, 0)
  const overdueTodos = todoStats
    .filter((s) => s.status === ToDoStatus.OVERDUE)
    .reduce((sum, s) => sum + s._count, 0)

  return {
    totalClients,
    approvedClients,
    rejectedClients,
    inProgressClients,
    delayedClients,
    successRate,
    delayRate,
    extensionRate,
    avgDaysToInitiate,
    avgDaysToConvert,
    pendingTodos,
    overdueTodos,
  }
}

export async function getAllAgentKPIs(): Promise<Record<string, AgentKPIs>> {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    select: { id: true },
  })

  const entries = await Promise.all(
    agents.map(async (agent) => {
      const kpis = await getAgentKPIs(agent.id)
      return [agent.id, kpis] as const
    }),
  )

  return Object.fromEntries(entries)
}

function computeAvgDays(
  events: { clientId: string | null; createdAt: Date }[],
  clientCreatedAt: Map<string, Date>,
): number | null {
  const days: number[] = []

  for (const event of events) {
    if (!event.clientId) continue
    const created = clientCreatedAt.get(event.clientId)
    if (!created) continue

    const diffMs = event.createdAt.getTime() - created.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    days.push(diffDays)
  }

  if (days.length === 0) return null
  const avg = days.reduce((sum, d) => sum + d, 0) / days.length
  return Math.round(avg * 10) / 10
}
