import prisma from '@/backend/prisma/client'
import {
  IntakeStatus,
  PlatformStatus,
  ToDoStatus,
  UserRole,
  PlatformType,
  ToDoType,
  EventType,
  ExtensionRequestStatus,
} from '@/types'
import { getAllAgentKPIs, getAgentKPIs } from '@/backend/services/agent-kpis'

// ============================================================================
// Overview Dashboard Functions
// ============================================================================

export async function getOverviewStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    readyForApproval,
    pendingPlatformReviews,
    approvedToday,
    urgentActions,
    activeClients,
    pendingExtensions,
    delayedClients,
  ] = await Promise.all([
    // Clients ready for final approval
    prisma.client.count({
      where: { intakeStatus: IntakeStatus.READY_FOR_APPROVAL },
    }),
    // Platforms awaiting backoffice review (e.g. BetMGM PENDING_REVIEW)
    prisma.clientPlatform.count({
      where: { status: PlatformStatus.PENDING_REVIEW },
    }),
    prisma.client.count({
      where: {
        intakeStatus: IntakeStatus.APPROVED,
        statusChangedAt: { gte: today },
      },
    }),
    prisma.toDo.count({
      where: {
        priority: { lte: 1 }, // High priority (0 or 1)
        status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
      },
    }),
    prisma.client.count({
      where: {
        intakeStatus: {
          in: [
            IntakeStatus.PHONE_ISSUED,
            IntakeStatus.IN_EXECUTION,
            IntakeStatus.READY_FOR_APPROVAL,
          ],
        },
      },
    }),
    prisma.extensionRequest.count({
      where: { status: ExtensionRequestStatus.PENDING },
    }),
    prisma.client.count({
      where: { intakeStatus: IntakeStatus.EXECUTION_DELAYED },
    }),
  ])

  return {
    pendingReviews: readyForApproval + pendingPlatformReviews,
    approvedToday,
    urgentActions,
    activeClients,
    pendingExtensions,
    delayedClients,
  }
}

export async function getPendingExtensionRequests() {
  const now = new Date()

  const requests = await prisma.extensionRequest.findMany({
    where: { status: ExtensionRequestStatus.PENDING },
    include: {
      client: {
        select: { firstName: true, lastName: true },
      },
      requestedBy: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return requests.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: `${r.client.firstName} ${r.client.lastName}`,
    agentName: r.requestedBy.name,
    reason: r.reason,
    requestedDays: r.requestedDays,
    currentDeadline: r.currentDeadline,
    createdAt: r.createdAt,
    deadlineStatus: (r.currentDeadline < now ? 'overdue' : 'active') as
      | 'active'
      | 'overdue',
  }))
}

export async function getDelayedClients() {
  const clients = await prisma.client.findMany({
    where: { intakeStatus: IntakeStatus.EXECUTION_DELAYED },
    include: {
      agent: { select: { name: true } },
      toDos: {
        select: { status: true },
        where: {
          status: { not: ToDoStatus.CANCELLED },
        },
      },
    },
    orderBy: { statusChangedAt: 'asc' },
  })

  return clients.map((c) => {
    const completedCount = c.toDos.filter(
      (t) => t.status === ToDoStatus.COMPLETED,
    ).length

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      agentName: c.agent?.name ?? 'Unassigned',
      executionDeadline: c.executionDeadline,
      delayedSince: c.statusChangedAt,
      pendingTodosCount: c.toDos.length - completedCount,
      completedTodosCount: completedCount,
    }
  })
}

export async function getPriorityTasks() {
  const now = new Date()

  // Get urgent To-Dos
  const [todos, pendingPlatforms] = await Promise.all([
    prisma.toDo.findMany({
      where: {
        status: {
          in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE],
        },
        OR: [
          { priority: { lte: 1 } }, // High priority
          { dueDate: { lte: now } }, // Due today or overdue
        ],
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 10,
    }),
    // BetMGM (and other platforms) awaiting backoffice review
    prisma.clientPlatform.findMany({
      where: { status: PlatformStatus.PENDING_REVIEW },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    }),
  ])

  const todoTasks = todos.map((t) => ({
    id: t.id,
    title: t.title,
    type: mapToDoTypeToLabel(t.type),
    clientId: t.client?.id ?? null,
    clientName: t.client ? `${t.client.firstName} ${t.client.lastName}` : null,
    isUrgent: t.priority <= 1 || Boolean(t.dueDate && t.dueDate <= now),
  }))

  const platformTasks = pendingPlatforms.map((p) => ({
    id: `platform-${p.id}`,
    title: `Verify ${p.platformType} account`,
    type: 'Platform Review',
    clientId: p.client?.id ?? null,
    clientName: p.client ? `${p.client.firstName} ${p.client.lastName}` : null,
    isUrgent: true,
  }))

  return [...platformTasks, ...todoTasks]
}

function mapToDoTypeToLabel(type: ToDoType): string {
  const map: Record<ToDoType, string> = {
    [ToDoType.EXECUTION]: 'Execution',
    [ToDoType.UPLOAD_SCREENSHOT]: 'Document Review',
    [ToDoType.PROVIDE_INFO]: 'Information Request',
    [ToDoType.PAYMENT]: 'Finance',
    [ToDoType.PHONE_SIGNOUT]: 'Phone Issuance',
    [ToDoType.PHONE_RETURN]: 'Phone Return',
    [ToDoType.VERIFICATION]: 'Approval',
  }
  return map[type] || type
}

export async function getReminders() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [awaitingPhone, pendingDocs] = await Promise.all([
    prisma.client.count({
      where: {
        phoneAssignment: null,
        intakeStatus: {
          in: [IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION],
        },
        createdAt: { lte: yesterday },
      },
    }),
    prisma.toDo.count({
      where: {
        type: ToDoType.VERIFICATION,
        status: ToDoStatus.PENDING,
        createdAt: { lte: yesterday },
      },
    }),
  ])

  const reminders: {
    message: string
    timeLabel: string
    isOverdue: boolean
  }[] = []

  if (awaitingPhone > 0) {
    reminders.push({
      message: `${awaitingPhone} clients awaiting phone number issuance`,
      timeLabel: 'Since yesterday',
      isOverdue: false,
    })
  }

  reminders.push({
    message: 'Fund allocation due by 5 PM',
    timeLabel: 'Today',
    isOverdue: false,
  })

  if (pendingDocs > 0) {
    reminders.push({
      message: `${pendingDocs} documents pending review > 24h`,
      timeLabel: 'Overdue',
      isOverdue: true,
    })
  }

  return reminders
}

export async function getOverviewRecentActivity() {
  const events = await prisma.eventLog.findMany({
    where: {
      eventType: {
        notIn: [EventType.LOGIN, EventType.LOGOUT],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      client: { select: { firstName: true, lastName: true } },
      user: { select: { name: true, id: true } },
    },
  })

  return events.map((e) => ({
    id: e.id,
    title: e.description || formatEventTitle(e.eventType),
    subtitle: formatEventSubtitle(e),
    timestamp: e.createdAt,
  }))
}

function formatEventTitle(type: EventType): string {
  const titles: Record<string, string> = {
    [EventType.APPLICATION_SUBMITTED]: 'New application',
    [EventType.STATUS_CHANGE]: 'Status updated',
    [EventType.PLATFORM_UPLOAD]: 'Screenshot uploaded',
    [EventType.PHONE_ISSUED]: 'Issued phone number',
    [EventType.PHONE_RETURNED]: 'Phone returned',
    [EventType.APPROVAL]: 'Approved application',
    [EventType.REJECTION]: 'Rejected application',
    [EventType.TODO_COMPLETED]: 'Reviewed documents',
    [EventType.TODO_CREATED]: 'Task created',
    [EventType.DEADLINE_EXTENDED]: 'Extended deadline',
    [EventType.DEADLINE_MISSED]: 'Deadline missed',
    [EventType.PLATFORM_STATUS_CHANGE]: 'Platform status updated',
    [EventType.COMMENT]: 'Comment added',
    [EventType.KPI_IMPACT]: 'KPI updated',
    [EventType.TRANSACTION_CREATED]: 'Fund movement recorded',
    [EventType.USER_CREATED]: 'User account created',
    [EventType.USER_UPDATED]: 'User account updated',
    [EventType.USER_DEACTIVATED]: 'User account deactivated',
  }
  return titles[type] || type
}

function formatEventSubtitle(event: {
  client: { firstName: string; lastName: string } | null
  user: { name: string | null; id: string } | null
}): string {
  const clientName = event.client
    ? `${event.client.firstName} ${event.client.lastName}`
    : null
  const agentRef = event.user?.name || 'System'

  if (clientName) {
    return `${clientName} • ${agentRef}`
  }
  return agentRef
}

export async function getPendingActionCounts() {
  const [pendingIntake, pendingVerification, pendingSettlement, overdueTasks] =
    await Promise.all([
      prisma.client.count({
        where: { intakeStatus: IntakeStatus.READY_FOR_APPROVAL },
      }),
      prisma.clientPlatform.count({
        where: { status: PlatformStatus.PENDING_REVIEW },
      }),
      // Settlement would need its own model - for now return 0
      Promise.resolve(0),
      prisma.toDo.count({
        where: { status: ToDoStatus.OVERDUE },
      }),
    ])

  return {
    pendingIntake,
    pendingVerification,
    pendingSettlement,
    overdueTasks,
  }
}

export async function getRecentActivity(limit = 5) {
  const events = await prisma.eventLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          agent: {
            select: { name: true },
          },
        },
      },
      user: {
        select: { name: true },
      },
    },
  })

  return events.map((event) => ({
    action: event.description,
    client: event.client
      ? `${event.client.firstName} ${event.client.lastName}`
      : null,
    agent: event.client?.agent?.name ?? event.user?.name ?? 'System',
    time: formatRelativeTime(event.createdAt),
  }))
}

export async function getAllClients() {
  const clients = await prisma.client.findMany({
    include: {
      agent: {
        select: { name: true },
      },
      platforms: {
        select: {
          platformType: true,
          status: true,
          screenshots: true,
          username: true,
          reviewedBy: true,
          reviewedAt: true,
        },
      },
      phoneAssignment: {
        select: {
          phoneNumber: true,
        },
      },
      fundMovementsFrom: {
        where: { status: 'completed' },
        select: { amount: true },
      },
      fundMovementsTo: {
        where: { status: 'completed' },
        select: { amount: true },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
          platformType: true,
        },
      },
      eventLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return clients.map((client) => {
    const activePlatforms = client.platforms
      .filter((p) => p.status === PlatformStatus.VERIFIED)
      .map((p) => getPlatformAbbrev(p.platformType))
    const allPlatforms = client.platforms.map((p) =>
      getPlatformAbbrev(p.platformType),
    )

    // Compute total funds: money received minus money sent
    const fundsIn = client.fundMovementsTo.reduce(
      (sum, fm) => sum + Number(fm.amount),
      0,
    )
    const fundsOut = client.fundMovementsFrom.reduce(
      (sum, fm) => sum + Number(fm.amount),
      0,
    )
    const totalFunds = fundsIn - fundsOut

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phoneAssignment?.phoneNumber ?? client.phone ?? '',
      email: client.email,
      start: formatDate(client.createdAt),
      funds: `$${Math.abs(totalFunds).toLocaleString()}`,
      platforms: allPlatforms,
      activePlatforms,
      intakeStatus: client.intakeStatus,
      agent: client.agent?.name ?? null,
      // Profile fields
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
      country: client.country,
      questionnaire: client.questionnaire,
      // Platform details for status/screenshots
      platformDetails: client.platforms.map((p) => ({
        platformType: p.platformType,
        status: p.status,
        screenshots: p.screenshots,
        username: p.username,
        reviewedBy: p.reviewedBy,
        reviewedAt: p.reviewedAt?.toISOString() ?? null,
      })),
      // Recent transactions
      transactions: client.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description ?? '',
        date: t.createdAt.toISOString(),
        platformType: t.platformType,
      })),
      // Recent event logs
      eventLogs: client.eventLogs.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description,
        userName: e.user?.name ?? 'System',
        createdAt: e.createdAt.toISOString(),
      })),
    }
  })
}

export async function getClientStats() {
  const clients = await prisma.client.findMany({
    select: { intakeStatus: true },
  })

  const total = clients.length
  const active = clients.filter(
    (c) =>
      c.intakeStatus === IntakeStatus.PHONE_ISSUED ||
      c.intakeStatus === IntakeStatus.IN_EXECUTION ||
      c.intakeStatus === IntakeStatus.APPROVED,
  ).length
  const closed = clients.filter(
    (c) =>
      c.intakeStatus === IntakeStatus.REJECTED ||
      c.intakeStatus === IntakeStatus.INACTIVE,
  ).length
  const furtherVerification = clients.filter(
    (c) =>
      c.intakeStatus === IntakeStatus.NEEDS_MORE_INFO ||
      c.intakeStatus === IntakeStatus.PENDING_EXTERNAL,
  ).length

  return { total, active, closed, furtherVerification }
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    include: {
      agentClients: {
        select: { id: true },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? '',
    isActive: user.isActive,
    createdAt: formatDate(user.createdAt),
    clientCount: user.agentClients.length,
  }))
}

export async function getAllAgents() {
  const [agents, kpisMap] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.AGENT },
      include: {
        agentMetrics: true,
        agentClients: {
          select: { intakeStatus: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    getAllAgentKPIs(),
  ])

  return agents.map((agent) => {
    const workingClients = agent.agentClients.filter(
      (c) =>
        c.intakeStatus === IntakeStatus.PHONE_ISSUED ||
        c.intakeStatus === IntakeStatus.IN_EXECUTION,
    ).length

    const kpis = kpisMap[agent.id]

    return {
      id: agent.id,
      name: agent.name,
      tier: `${agent.starLevel}-Star`,
      phone: agent.phone ?? '',
      start: formatDate(agent.createdAt),
      clients: agent.agentClients.length,
      working: workingClients,
      successRate: kpis?.successRate ?? 0,
      delayRate: kpis?.delayRate ?? 0,
      avgDaysToConvert: kpis?.avgDaysToConvert ?? null,
    }
  })
}

export async function getAgentStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalAgents, initiatedApps, newClientsMonth, initiateEvents] =
    await Promise.all([
      prisma.user.count({ where: { role: UserRole.AGENT } }),
      prisma.client.count({
        where: {
          intakeStatus: {
            in: [IntakeStatus.PENDING, IntakeStatus.PHONE_ISSUED],
          },
        },
      }),
      prisma.client.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Get all PHONE_ISSUED events with client creation dates for avg computation
      prisma.eventLog.findMany({
        where: {
          eventType: EventType.STATUS_CHANGE,
          newValue: IntakeStatus.PHONE_ISSUED,
        },
        select: {
          createdAt: true,
          client: { select: { createdAt: true } },
        },
      }),
    ])

  // Compute avg days to open from all agents' initiation events
  let avgDaysToOpen: number | null = null
  if (initiateEvents.length > 0) {
    const days = initiateEvents
      .filter((e) => e.client)
      .map((e) => {
        const diffMs = e.createdAt.getTime() - e.client!.createdAt.getTime()
        return diffMs / (1000 * 60 * 60 * 24)
      })
    if (days.length > 0) {
      avgDaysToOpen =
        Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10
    }
  }

  return {
    totalAgents,
    initiatedApps,
    newClientsMonth,
    avgDaysToOpen,
  }
}

// ============================================================================
// Agent Detail
// ============================================================================

export async function getAgentDetail(agentId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [user, kpis, newClientsThisMonth] = await Promise.all([
    prisma.user.findUnique({
      where: { id: agentId },
      include: {
        agentClients: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            intakeStatus: true,
            createdAt: true,
          },
        },
      },
    }),
    getAgentKPIs(agentId),
    prisma.client.count({
      where: { agentId, createdAt: { gte: startOfMonth } },
    }),
  ])

  if (!user) return null

  // Compute monthly client breakdown for last 5 months
  const monthlyClients: { month: string; count: number }[] = []
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const count = user.agentClients.filter(
      (c) => c.createdAt >= d && c.createdAt < end,
    ).length
    monthlyClients.push({ month: monthNames[d.getMonth()], count })
  }

  return {
    id: user.id,
    name: user.name || 'Unknown',
    gender: '—',
    age: 0,
    idNumber: '—',
    idExpiry: '—',
    ssn: '—',
    citizenship: '—',
    startDate: user.createdAt.toISOString().split('T')[0],
    tier: user.starLevel > 0 ? `${user.starLevel}-Star` : 'Rookie',
    stars: user.starLevel,
    companyPhone: user.phone ?? '—',
    carrier: '—',
    companyEmail: user.email || '—',
    personalEmail: '—',
    personalPhone: '—',
    zelle: '—',
    address: '—',
    loginAccount: user.email?.split('@')[0] || '—',
    loginEmail: user.email || '—',
    totalClients: kpis.totalClients,
    totalEarned: 0,
    thisMonthEarned: 0,
    newClientsThisMonth,
    newClientsGrowth: 0,
    avgDaysToInitiate: kpis.avgDaysToInitiate ?? 0,
    avgDaysToConvert: kpis.avgDaysToConvert ?? 0,
    successRate: kpis.successRate,
    referralRate: 0,
    extensionRate: kpis.extensionRate,
    resubmissionRate: 0,
    avgAccountsPerClient: 0,
    clientsInProgress: kpis.inProgressClients,
    avgDailyTodos: 0,
    delayRate: kpis.delayRate,
    monthlyClients,
    supervisor: null as { id: string; name: string } | null,
    directReports: [] as { id: string; name: string }[],
    timeline: [] as {
      date: string
      event: string
      type: 'info' | 'success' | 'warning'
    }[],
    idDocumentUrl: undefined as string | undefined,
  }
}

export type AgentDetailData = NonNullable<
  Awaited<ReturnType<typeof getAgentDetail>>
>

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getPlatformAbbrev(platformType: PlatformType): string {
  const map: Record<PlatformType, string> = {
    [PlatformType.DRAFTKINGS]: 'DK',
    [PlatformType.FANDUEL]: 'FD',
    [PlatformType.BETMGM]: 'MGM',
    [PlatformType.CAESARS]: 'CZR',
    [PlatformType.FANATICS]: 'FAN',
    [PlatformType.BALLYBET]: 'BB',
    [PlatformType.BETRIVERS]: 'BR',
    [PlatformType.BET365]: '365',
    [PlatformType.BANK]: 'BANK',
    [PlatformType.PAYPAL]: 'PP',
    [PlatformType.EDGEBOOST]: 'EB',
  }
  return map[platformType] || platformType
}
