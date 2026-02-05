import prisma from '@/backend/prisma/client'
import { IntakeStatus, PlatformStatus, ToDoStatus, UserRole, PlatformType } from '@/types'

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
