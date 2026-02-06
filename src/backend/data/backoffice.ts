import prisma from '@/backend/prisma/client'
import { IntakeStatus, PlatformStatus, ToDoStatus, UserRole, PlatformType, ToDoType, EventType, ExtensionRequestStatus } from '@/types'

export async function getDashboardStats() {
  const [clientCount, agentCount] = await Promise.all([
    prisma.client.count(),
    prisma.user.count({ where: { role: UserRole.AGENT, isActive: true } }),
  ])

  return {
    totalClients: clientCount,
    activeAgents: agentCount,
    totalFundsManaged: '$0', // Would need actual fund tracking
    monthlyRevenue: '$0',
  }
}

// ============================================================================
// Overview Dashboard Functions
// ============================================================================

export async function getOverviewStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [pendingReviews, approvedToday, urgentActions, activeClients, pendingExtensions] = await Promise.all([
    // Clients ready for approval + platforms pending review
    prisma.client.count({
      where: { intakeStatus: IntakeStatus.READY_FOR_APPROVAL },
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
          in: [IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION, IntakeStatus.READY_FOR_APPROVAL],
        },
      },
    }),
    prisma.extensionRequest.count({
      where: { status: ExtensionRequestStatus.PENDING },
    }),
  ])

  return { pendingReviews, approvedToday, urgentActions, activeClients, pendingExtensions }
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
    deadlineStatus: (r.currentDeadline < now ? 'overdue' : 'active') as 'active' | 'overdue',
  }))
}

export async function getPriorityTasks() {
  const now = new Date()

  // Get urgent To-Dos
  const tasks = await prisma.toDo.findMany({
    where: {
      status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE] },
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
  })

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: mapToDoTypeToLabel(t.type),
    clientId: t.client?.id ?? null,
    clientName: t.client ? `${t.client.firstName} ${t.client.lastName}` : null,
    isUrgent: t.priority <= 1 || Boolean(t.dueDate && t.dueDate <= now),
  }))
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
        intakeStatus: { in: [IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION] },
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

  const reminders: { message: string; timeLabel: string; isOverdue: boolean }[] = []

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
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      client: { select: { firstName: true, lastName: true } },
      user: { select: { name: true, id: true } },
    },
  })

  return events.map((e) => ({
    id: e.id,
    title: formatEventTitle(e.eventType),
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
  const [pendingIntake, pendingVerification, pendingSettlement, overdueTasks] = await Promise.all([
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

export async function getPlatformOverview() {
  const sportsPlatforms = [
    PlatformType.DRAFTKINGS,
    PlatformType.FANDUEL,
    PlatformType.BETMGM,
    PlatformType.CAESARS,
  ]

  const platformStats = await Promise.all(
    sportsPlatforms.map(async (platformType) => {
      const count = await prisma.clientPlatform.count({
        where: {
          platformType,
          status: PlatformStatus.VERIFIED,
        },
      })
      return {
        name: formatPlatformName(platformType),
        clients: count,
        balance: 0, // Would need fund allocation tracking
      }
    })
  )

  return platformStats
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
        },
      },
      phoneAssignment: {
        select: {
          phoneNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return clients.map((client) => {
    const activePlatforms = client.platforms
      .filter((p) => p.status === PlatformStatus.VERIFIED)
      .map((p) => getPlatformAbbrev(p.platformType))
    const allPlatforms = client.platforms.map((p) => getPlatformAbbrev(p.platformType))

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phoneAssignment?.phoneNumber ?? client.phone ?? '',
      email: client.email,
      start: formatDate(client.createdAt),
      funds: '$0', // Would need fund tracking
      platforms: allPlatforms,
      activePlatforms,
      intakeStatus: client.intakeStatus,
    }
  })
}

export async function getClientStats() {
  const clients = await prisma.client.findMany({
    select: { intakeStatus: true },
  })

  const total = clients.length
  const active = clients.filter((c) =>
    c.intakeStatus === IntakeStatus.PHONE_ISSUED ||
    c.intakeStatus === IntakeStatus.IN_EXECUTION ||
    c.intakeStatus === IntakeStatus.APPROVED
  ).length
  const closed = clients.filter((c) =>
    c.intakeStatus === IntakeStatus.REJECTED || c.intakeStatus === IntakeStatus.INACTIVE
  ).length
  const furtherVerification = clients.filter((c) =>
    c.intakeStatus === IntakeStatus.NEEDS_MORE_INFO || c.intakeStatus === IntakeStatus.PENDING_EXTERNAL
  ).length

  return { total, active, closed, furtherVerification }
}

export async function getAllAgents() {
  const agents = await prisma.user.findMany({
    where: { role: UserRole.AGENT },
    include: {
      agentMetrics: true,
      agentClients: {
        select: { intakeStatus: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return agents.map((agent) => {
    const workingClients = agent.agentClients.filter((c) =>
      c.intakeStatus === IntakeStatus.PHONE_ISSUED || c.intakeStatus === IntakeStatus.IN_EXECUTION
    ).length

    return {
      id: agent.id,
      name: agent.name,
      tier: '1★', // Would need tier system
      phone: agent.phone ?? '',
      start: formatDate(agent.createdAt),
      clients: agent.agentClients.length,
      earned: '$0', // Would need earnings tracking
      month: '$0',
      working: workingClients,
    }
  })
}

export async function getAgentStats() {
  const [totalAgents, initiatedApps] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.AGENT } }),
    prisma.client.count({
      where: {
        intakeStatus: { in: [IntakeStatus.PENDING, IntakeStatus.PHONE_ISSUED] },
      },
    }),
  ])

  // New clients this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newClientsMonth = await prisma.client.count({
    where: { createdAt: { gte: startOfMonth } },
  })

  return {
    totalAgents,
    initiatedApps,
    newClientsMonth,
    avgDaysToOpen: 0, // Would need calculation
  }
}

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

function formatPlatformName(platformType: PlatformType): string {
  const map: Record<PlatformType, string> = {
    [PlatformType.DRAFTKINGS]: 'DraftKings',
    [PlatformType.FANDUEL]: 'FanDuel',
    [PlatformType.BETMGM]: 'BetMGM',
    [PlatformType.CAESARS]: 'Caesars',
    [PlatformType.FANATICS]: 'Fanatics',
    [PlatformType.BALLYBET]: 'Bally Bet',
    [PlatformType.BETRIVERS]: 'BetRivers',
    [PlatformType.BET365]: 'Bet365',
    [PlatformType.BANK]: 'Bank',
    [PlatformType.PAYPAL]: 'PayPal',
    [PlatformType.EDGEBOOST]: 'EdgeBoost',
  }
  return map[platformType] || platformType
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
