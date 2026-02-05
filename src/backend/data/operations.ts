import prisma from '@/backend/prisma/client'
import { ToDoStatus, IntakeStatus, UserRole } from '@/types'

// ==========================================
// Sales Interaction Data
// ==========================================

export async function getTeamDirectory() {
  const agents = await prisma.user.findMany({
    where: { role: UserRole.AGENT, isActive: true },
    include: {
      agentClients: {
        where: {
          intakeStatus: { notIn: [IntakeStatus.APPROVED, IntakeStatus.REJECTED, IntakeStatus.INACTIVE] },
        },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Group by tier (simplified - would need actual tier field)
  return agents.map((agent) => ({
    name: agent.name,
    code: '★',
    pending: agent.agentClients.length,
  }))
}

export async function getIntakeClients() {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: {
        in: [
          IntakeStatus.PENDING,
          IntakeStatus.NEEDS_MORE_INFO,
          IntakeStatus.PENDING_EXTERNAL,
          IntakeStatus.READY_FOR_APPROVAL,
        ],
      },
    },
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { statusChangedAt: 'asc' },
  })

  return clients.map((client) => {
    const daysSinceChange = Math.floor(
      (Date.now() - client.statusChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      status: formatIntakeStatusLabel(client.intakeStatus),
      statusColor: getIntakeStatusColor(client.intakeStatus),
      agent: client.agent.name,
      days: daysSinceChange,
    }
  })
}

export async function getVerificationClients() {
  const todos = await prisma.toDo.findMany({
    where: {
      type: 'VERIFICATION',
      status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.COMPLETED] },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          agent: { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  })

  return todos.map((todo) => {
    const daysUntilDue = todo.dueDate
      ? Math.ceil((todo.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0

    return {
      id: todo.id,
      name: todo.client ? `${todo.client.firstName} ${todo.client.lastName}` : 'N/A',
      platform: extractPlatformFromMetadata(todo.metadata),
      task: todo.title,
      agent: todo.client?.agent?.name ?? 'Unassigned',
      days: Math.max(0, daysUntilDue),
      status: todo.status === ToDoStatus.COMPLETED ? 'Done' : 'Pending',
    }
  })
}

// ==========================================
// To-Do List Data (Backoffice)
// ==========================================

export async function getBackofficeTodos() {
  const todos = await prisma.toDo.findMany({
    where: {
      status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE] },
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
  })

  // Group by agent
  const agentMap = new Map<string, {
    agentId: string
    agentName: string
    tasks: Array<{
      id: string
      title: string
      client: string
      category: string
      dueIn: string
      overdue: boolean
    }>
  }>()

  const now = new Date()

  for (const todo of todos) {
    const agentId = todo.assignedTo?.id ?? 'unassigned'
    const agentName = todo.assignedTo?.name ?? 'Unassigned'

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { agentId, agentName, tasks: [] })
    }

    const isOverdue = todo.status === ToDoStatus.OVERDUE ||
      (todo.dueDate !== null && todo.dueDate < now)

    agentMap.get(agentId)!.tasks.push({
      id: todo.id,
      title: todo.title,
      client: todo.client ? `${todo.client.firstName} ${todo.client.lastName}` : 'N/A',
      category: mapToDoTypeToCategory(todo.type),
      dueIn: todo.dueDate ? formatDueTime(todo.dueDate) : 'No deadline',
      overdue: isOverdue,
    })
  }

  return Array.from(agentMap.values())
}

export async function getBackofficeTodoStats() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [todayCount, threeDayCount, sevenDayCount, overdueCount] = await Promise.all([
    prisma.toDo.count({
      where: {
        status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
        dueDate: { lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.toDo.count({
      where: {
        status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
        dueDate: { lt: in3Days },
      },
    }),
    prisma.toDo.count({
      where: {
        status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
        dueDate: { lt: in7Days },
      },
    }),
    prisma.toDo.count({
      where: { status: ToDoStatus.OVERDUE },
    }),
  ])

  return {
    todaysTasks: todayCount,
    threeDayTasks: threeDayCount,
    sevenDayTasks: sevenDayCount,
    overdue: overdueCount,
  }
}

// ==========================================
// Fund Allocation Data
// ==========================================

export async function getFundMovements() {
  const allocations = await prisma.fundAllocation.findMany({
    orderBy: { allocatedAt: 'desc' },
    take: 20,
  })

  return allocations.map((a) => ({
    id: a.id,
    from: 'Bank', // Would need proper from/to tracking
    to: a.name,
    amount: Number(a.amount),
    type: 'internal',
    method: 'transfer',
    status: 'completed',
    agent: 'System',
    time: formatRelativeTime(a.allocatedAt),
  }))
}

export async function getClientsForFundAllocation() {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: { in: [IntakeStatus.APPROVED, IntakeStatus.IN_EXECUTION] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { lastName: 'asc' },
  })

  return clients.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
  }))
}

// ==========================================
// Phone Tracking Data
// ==========================================

export async function getPhoneAssignments() {
  const assignments = await prisma.phoneAssignment.findMany({
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      agent: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return assignments.map((a) => {
    let status = 'pending'
    if (a.returnedAt) status = 'inactive'
    else if (a.signedOutAt) status = 'suspended'
    else if (a.issuedAt) status = 'active'

    return {
      id: a.id,
      number: a.phoneNumber,
      client: a.client ? `${a.client.firstName} ${a.client.lastName}` : 'Unassigned',
      clientId: a.client?.id ?? '',
      carrier: 'Unknown', // Would need carrier field in schema
      issuedDate: a.issuedAt ? formatDate(a.issuedAt) : '',
      issuedBy: a.agent.name,
      status,
      notes: a.notes,
    }
  })
}

export async function getPhoneStats() {
  const assignments = await prisma.phoneAssignment.findMany({
    select: {
      issuedAt: true,
      signedOutAt: true,
      returnedAt: true,
    },
  })

  const total = assignments.length
  const active = assignments.filter((a) => a.issuedAt && !a.signedOutAt && !a.returnedAt).length
  const pending = assignments.filter((a) => !a.issuedAt).length
  const suspended = assignments.filter((a) => a.signedOutAt && !a.returnedAt).length

  return { total, active, pending, suspended }
}

// ==========================================
// Client Settlement Data
// ==========================================

export async function getClientsForSettlement() {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: IntakeStatus.APPROVED,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      earnings: {
        select: {
          amount: true,
          status: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  })

  return clients.map((c) => {
    const deposits = c.earnings
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + Number(e.amount), 0)
    const withdrawals = 0 // Would need withdrawal tracking

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      deposits,
      withdrawals,
    }
  })
}

// ==========================================
// Helper Functions
// ==========================================

function formatIntakeStatusLabel(status: IntakeStatus): string {
  const map: Record<IntakeStatus, string> = {
    [IntakeStatus.PENDING]: 'Pending',
    [IntakeStatus.PHONE_ISSUED]: 'Phone Issued',
    [IntakeStatus.IN_EXECUTION]: 'In Execution',
    [IntakeStatus.NEEDS_MORE_INFO]: 'Needs More Info',
    [IntakeStatus.PENDING_EXTERNAL]: 'Pending External',
    [IntakeStatus.EXECUTION_DELAYED]: 'Execution Delayed',
    [IntakeStatus.INACTIVE]: 'Inactive',
    [IntakeStatus.READY_FOR_APPROVAL]: 'Ready to Approve',
    [IntakeStatus.APPROVED]: 'Approved',
    [IntakeStatus.REJECTED]: 'Rejected',
  }
  return map[status] || status
}

function getIntakeStatusColor(status: IntakeStatus): string {
  const map: Record<IntakeStatus, string> = {
    [IntakeStatus.PENDING]: 'bg-slate-500',
    [IntakeStatus.PHONE_ISSUED]: 'bg-blue-500',
    [IntakeStatus.IN_EXECUTION]: 'bg-blue-500',
    [IntakeStatus.NEEDS_MORE_INFO]: 'bg-orange-500',
    [IntakeStatus.PENDING_EXTERNAL]: 'bg-blue-500',
    [IntakeStatus.EXECUTION_DELAYED]: 'bg-yellow-500',
    [IntakeStatus.INACTIVE]: 'bg-slate-600',
    [IntakeStatus.READY_FOR_APPROVAL]: 'bg-emerald-500',
    [IntakeStatus.APPROVED]: 'bg-emerald-500',
    [IntakeStatus.REJECTED]: 'bg-red-500',
  }
  return map[status] || 'bg-slate-500'
}

function mapToDoTypeToCategory(type: string): string {
  const map: Record<string, string> = {
    EXECUTION: 'sales',
    UPLOAD_SCREENSHOT: 'sales',
    PROVIDE_INFO: 'sales',
    PAYMENT: 'transaction',
    PHONE_SIGNOUT: 'other',
    PHONE_RETURN: 'other',
    VERIFICATION: 'sales',
  }
  return map[type] || 'other'
}

function formatDueTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (diff < 0) {
    if (days > 0) return `${days}d overdue`
    return `${hours}h overdue`
  }

  if (days > 0) return `${days}d`
  return `${hours}h`
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `about ${days} days ago`
  if (hours > 0) return `about ${hours} hours ago`
  return 'just now'
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function extractPlatformFromMetadata(metadata: unknown): string {
  if (metadata && typeof metadata === 'object' && 'platform' in metadata) {
    return String((metadata as { platform: unknown }).platform)
  }
  return 'N/A'
}
