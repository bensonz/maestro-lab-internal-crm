import prisma from '@/backend/prisma/client'
import { ToDoStatus, IntakeStatus, PlatformStatus } from '@/types'

export async function getAgentClients(agentId: string) {
  const clients = await prisma.client.findMany({
    where: { agentId },
    include: {
      platforms: {
        select: {
          platformType: true,
          status: true,
        },
      },
      toDos: {
        where: {
          status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
        },
        orderBy: { dueDate: 'asc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return clients.map((client) => {
    const verifiedPlatforms = client.platforms.filter(
      (p) => p.status === PlatformStatus.VERIFIED
    ).length
    const totalPlatforms = client.platforms.length
    const progress = totalPlatforms > 0
      ? Math.round((verifiedPlatforms / totalPlatforms) * 100)
      : 0

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      status: formatIntakeStatus(client.intakeStatus),
      statusColor: getStatusColor(client.intakeStatus),
      nextTask: client.toDos[0]?.title ?? null,
      step: verifiedPlatforms,
      totalSteps: totalPlatforms,
      progress,
      lastUpdated: formatRelativeTime(client.updatedAt),
    }
  })
}

export async function getAgentClientStats(agentId: string) {
  const clients = await prisma.client.findMany({
    where: { agentId },
    select: { intakeStatus: true },
  })

  const total = clients.length
  const inProgress = clients.filter((c) =>
    c.intakeStatus === IntakeStatus.PHONE_ISSUED || c.intakeStatus === IntakeStatus.IN_EXECUTION
  ).length
  const pendingApproval = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.READY_FOR_APPROVAL
  ).length
  const verificationNeeded = clients.filter((c) =>
    c.intakeStatus === IntakeStatus.NEEDS_MORE_INFO || c.intakeStatus === IntakeStatus.PENDING_EXTERNAL
  ).length
  const approved = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.APPROVED
  ).length
  const rejected = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.REJECTED
  ).length

  return { total, inProgress, pendingApproval, verificationNeeded, approved, rejected }
}

export async function getAgentDashboardStats(agentId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [clients, earnings, pendingTodos] = await Promise.all([
    prisma.client.findMany({
      where: { agentId },
      select: { intakeStatus: true },
    }),
    prisma.earning.findMany({
      where: { client: { agentId } },
      select: { amount: true, status: true, createdAt: true },
    }),
    prisma.toDo.count({
      where: {
        assignedToId: agentId,
        status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE] },
      },
    }),
  ])

  const totalClients = clients.length
  const activeClients = clients.filter(
    (c) =>
      c.intakeStatus === IntakeStatus.PHONE_ISSUED ||
      c.intakeStatus === IntakeStatus.IN_EXECUTION
  ).length
  const completedThisMonth = clients.filter(
    (c) => c.intakeStatus === IntakeStatus.APPROVED
  ).length

  const totalEarnings = earnings
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  // Calculate previous month earnings for comparison
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastMonthEarnings = earnings
    .filter(
      (e) =>
        e.status === 'paid' &&
        e.createdAt >= lastMonth &&
        e.createdAt <= endOfLastMonth
    )
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const earningsChange =
    lastMonthEarnings > 0
      ? ((totalEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
      : 0

  return {
    totalClients,
    activeClients,
    completedThisMonth,
    pendingTasks: pendingTodos,
    earnings: totalEarnings,
    earningsChange: Math.round(earningsChange * 10) / 10,
  }
}

export async function getAgentEarnings(agentId: string) {
  const earnings = await prisma.earning.findMany({
    where: {
      client: { agentId },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalEarnings = earnings
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const pendingPayout = earnings
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth = earnings
    .filter((e) => e.createdAt >= startOfMonth)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const recentTransactions = earnings.slice(0, 10).map((e) => ({
    id: e.id,
    client: `${e.client.firstName} ${e.client.lastName}`,
    amount: Number(e.amount),
    status: e.status === 'paid' ? 'Paid' : 'Pending',
    date: formatDate(e.createdAt),
  }))

  return {
    totalEarnings,
    pendingPayout,
    thisMonth,
    recentTransactions,
  }
}

export async function getAgentTodos(agentId: string) {
  const todos = await prisma.toDo.findMany({
    where: {
      assignedToId: agentId,
      status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE] },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
  })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const todaysTasks = todos.filter(
    (t) => t.dueDate && t.dueDate < endOfDay
  ).length
  const thisWeek = todos.filter(
    (t) => t.dueDate && t.dueDate < endOfWeek
  ).length
  const overdue = todos.filter(
    (t) => t.status === ToDoStatus.OVERDUE || (t.dueDate && t.dueDate < now)
  ).length

  // Get completed today count
  const completedToday = await prisma.toDo.count({
    where: {
      assignedToId: agentId,
      status: ToDoStatus.COMPLETED,
      completedAt: { gte: today },
    },
  })

  const pendingTasks = todos.map((t) => ({
    id: t.id,
    task: t.title,
    client: t.client ? `${t.client.firstName} ${t.client.lastName}` : 'N/A',
    due: t.dueDate ? formatRelativeTime(t.dueDate) : 'No deadline',
    overdue: t.status === ToDoStatus.OVERDUE || (t.dueDate ? t.dueDate < now : false),
  }))

  return {
    todaysTasks,
    thisWeek,
    overdue,
    completedToday,
    pendingTasks,
  }
}

function formatIntakeStatus(status: IntakeStatus): string {
  const map: Record<IntakeStatus, string> = {
    [IntakeStatus.PENDING]: 'Pending',
    [IntakeStatus.PHONE_ISSUED]: 'Phone Issued',
    [IntakeStatus.IN_EXECUTION]: 'In Execution',
    [IntakeStatus.NEEDS_MORE_INFO]: 'Needs Info',
    [IntakeStatus.PENDING_EXTERNAL]: 'Pending External',
    [IntakeStatus.EXECUTION_DELAYED]: 'Delayed',
    [IntakeStatus.INACTIVE]: 'Inactive',
    [IntakeStatus.READY_FOR_APPROVAL]: 'Ready for Approval',
    [IntakeStatus.APPROVED]: 'Approved',
    [IntakeStatus.REJECTED]: 'Rejected',
  }
  return map[status] || status
}

function getStatusColor(status: IntakeStatus): string {
  const map: Record<IntakeStatus, string> = {
    [IntakeStatus.PENDING]: 'bg-slate-500',
    [IntakeStatus.PHONE_ISSUED]: 'bg-blue-500',
    [IntakeStatus.IN_EXECUTION]: 'bg-blue-500',
    [IntakeStatus.NEEDS_MORE_INFO]: 'bg-orange-500',
    [IntakeStatus.PENDING_EXTERNAL]: 'bg-orange-500',
    [IntakeStatus.EXECUTION_DELAYED]: 'bg-yellow-500',
    [IntakeStatus.INACTIVE]: 'bg-slate-600',
    [IntakeStatus.READY_FOR_APPROVAL]: 'bg-yellow-500',
    [IntakeStatus.APPROVED]: 'bg-emerald-500',
    [IntakeStatus.REJECTED]: 'bg-red-500',
  }
  return map[status] || 'bg-slate-500'
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  const isPast = diff < 0

  const hours = Math.floor(absDiff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return isPast ? `${days}d ago` : `${days}d`
  }
  if (hours > 0) {
    return isPast ? `${hours}h ago` : `${hours}h`
  }
  const minutes = Math.floor(absDiff / (1000 * 60))
  return isPast ? `${minutes}m ago` : `${minutes}m`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function getClientDetail(clientId: string, agentId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      agentId, // Ensure agent owns this client
    },
    include: {
      platforms: {
        orderBy: { platformType: 'asc' },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      toDos: {
        where: {
          status: { not: ToDoStatus.COMPLETED },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      },
      eventLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      phoneAssignment: true,
    },
  })

  if (!client) return null

  // Parse questionnaire for additional data
  let questionnaire: Record<string, unknown> = {}
  try {
    if (client.questionnaire) {
      questionnaire = JSON.parse(client.questionnaire)
    }
  } catch {
    // Ignore parse errors
  }

  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    middleName: (questionnaire.middleName as string) || null,
    name: `${client.firstName} ${client.lastName}`,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zipCode: client.zipCode,
    country: client.country,
    secondaryAddress: (questionnaire.secondaryAddress as {
      address?: string
      city?: string
      state?: string
      zip?: string
    }) || null,
    dateOfBirth: (questionnaire.dateOfBirth as string) || null,
    status: formatIntakeStatus(client.intakeStatus),
    statusColor: getStatusColor(client.intakeStatus),
    intakeStatus: client.intakeStatus,
    deadline: client.executionDeadline,
    deadlineExtensions: client.deadlineExtensions,
    applicationNotes: client.applicationNotes,
    complianceReview: client.complianceReview,
    complianceStatus: client.complianceStatus,
    questionnaire,
    agent: client.agent,
    platforms: client.platforms.map((p) => ({
      id: p.id,
      platformType: p.platformType,
      status: p.status,
      statusLabel: formatPlatformStatus(p.status),
      statusColor: getPlatformStatusColor(p.status),
      username: p.username,
      accountId: p.accountId,
      screenshots: p.screenshots,
      reviewNotes: p.reviewNotes,
      updatedAt: p.updatedAt,
    })),
    toDos: client.toDos.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      platformType: t.platformType,
      stepNumber: t.stepNumber,
      extensionsUsed: t.extensionsUsed,
      maxExtensions: t.maxExtensions,
      screenshots: t.screenshots,
      metadata: t.metadata,
      createdAt: t.createdAt,
    })),
    eventLogs: client.eventLogs.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      description: e.description,
      metadata: e.metadata,
      oldValue: e.oldValue,
      newValue: e.newValue,
      userName: e.user?.name || 'System',
      createdAt: e.createdAt,
    })),
    phoneAssignment: client.phoneAssignment
      ? {
          phoneNumber: client.phoneAssignment.phoneNumber,
          deviceId: client.phoneAssignment.deviceId,
          issuedAt: client.phoneAssignment.issuedAt,
          signedOutAt: client.phoneAssignment.signedOutAt,
          returnedAt: client.phoneAssignment.returnedAt,
        }
      : null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    statusChangedAt: client.statusChangedAt,
  }
}

function formatPlatformStatus(status: PlatformStatus): string {
  const map: Record<PlatformStatus, string> = {
    [PlatformStatus.NOT_STARTED]: 'Not Started',
    [PlatformStatus.PENDING_UPLOAD]: 'Pending Upload',
    [PlatformStatus.PENDING_REVIEW]: 'Pending Review',
    [PlatformStatus.NEEDS_MORE_INFO]: 'Needs Info',
    [PlatformStatus.PENDING_EXTERNAL]: 'Pending External',
    [PlatformStatus.VERIFIED]: 'Verified',
    [PlatformStatus.REJECTED]: 'Rejected',
    [PlatformStatus.LIMITED]: 'Limited',
  }
  return map[status] || status
}

function getPlatformStatusColor(status: PlatformStatus): string {
  const map: Record<PlatformStatus, string> = {
    [PlatformStatus.NOT_STARTED]: 'bg-muted text-muted-foreground',
    [PlatformStatus.PENDING_UPLOAD]: 'bg-accent/20 text-accent',
    [PlatformStatus.PENDING_REVIEW]: 'bg-primary/20 text-primary',
    [PlatformStatus.NEEDS_MORE_INFO]: 'bg-accent/20 text-accent',
    [PlatformStatus.PENDING_EXTERNAL]: 'bg-chart-3/20 text-chart-3',
    [PlatformStatus.VERIFIED]: 'bg-chart-4/20 text-chart-4',
    [PlatformStatus.REJECTED]: 'bg-destructive/20 text-destructive',
    [PlatformStatus.LIMITED]: 'bg-chart-5/20 text-chart-5',
  }
  return map[status] || 'bg-muted text-muted-foreground'
}
