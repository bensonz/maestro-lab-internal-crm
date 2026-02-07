import prisma from '@/backend/prisma/client'
import { ToDoStatus, IntakeStatus, UserRole, PlatformType } from '@/types'

// ==========================================
// Sales Interaction Data
// ==========================================

export async function getSalesInteractionStats() {
  const [clientCount, agentCount, activeApps, pendingCount] = await Promise.all(
    [
      prisma.client.count(),
      prisma.user.count({ where: { role: UserRole.AGENT } }),
      prisma.client.count({
        where: {
          intakeStatus: {
            in: [IntakeStatus.IN_EXECUTION, IntakeStatus.PHONE_ISSUED],
          },
        },
      }),
      prisma.client.count({
        where: {
          intakeStatus: {
            in: [IntakeStatus.PENDING, IntakeStatus.READY_FOR_APPROVAL],
          },
        },
      }),
    ],
  )
  return { clientCount, agentCount, activeApps, pendingCount }
}

interface AgentInHierarchy {
  id: string
  name: string
  role: UserRole
  level: string
  stars: number
  clientCount: number
}

export async function getAgentHierarchy() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.AGENT, UserRole.ADMIN, UserRole.BACKOFFICE] },
      isActive: true,
    },
    include: {
      agentClients: {
        where: {
          intakeStatus: {
            notIn: [
              IntakeStatus.APPROVED,
              IntakeStatus.REJECTED,
              IntakeStatus.INACTIVE,
            ],
          },
        },
        select: { id: true },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  // Group agents by level
  const hierarchy: Record<string, AgentInHierarchy[]> = {
    'MANAGING DIRECTOR': [],
    'SENIOR EXECUTIVE': [],
    'EXECUTIVE DIRECTOR': [],
    '4★ AGENTS': [],
    '3★ AGENTS': [],
    '2★ AGENTS': [],
    '1★ AGENTS': [],
  }

  for (const user of users) {
    // Map roles to hierarchy levels (simplified - would need actual tier field)
    let level: string
    let stars: number

    if (user.role === UserRole.ADMIN) {
      level = 'MANAGING DIRECTOR'
      stars = 5
    } else if (user.role === UserRole.BACKOFFICE) {
      level = 'EXECUTIVE DIRECTOR'
      stars = 4
    } else {
      // For agents, we'd ideally have a tier field
      // For now, assign based on client count as a proxy
      const clientCount = user.agentClients.length
      if (clientCount >= 10) {
        level = '4★ AGENTS'
        stars = 4
      } else if (clientCount >= 5) {
        level = '3★ AGENTS'
        stars = 3
      } else if (clientCount >= 2) {
        level = '2★ AGENTS'
        stars = 2
      } else {
        level = '1★ AGENTS'
        stars = 1
      }
    }

    hierarchy[level].push({
      id: user.id,
      name: user.name || 'Unknown',
      role: user.role,
      level,
      stars,
      clientCount: user.agentClients.length,
    })
  }

  // Remove empty groups and return
  return Object.entries(hierarchy)
    .filter(([, agents]) => agents.length > 0)
    .map(([level, agents]) => ({ level, agents }))
}

export async function getTeamDirectory() {
  const agents = await prisma.user.findMany({
    where: { role: UserRole.AGENT, isActive: true },
    include: {
      agentClients: {
        where: {
          intakeStatus: {
            notIn: [
              IntakeStatus.APPROVED,
              IntakeStatus.REJECTED,
              IntakeStatus.INACTIVE,
            ],
          },
        },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Group by tier (simplified - would need actual tier field)
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    code: '★',
    pending: agent.agentClients.length,
  }))
}

export type IntakeStatusType =
  | 'needs_info'
  | 'pending_platform'
  | 'ready'
  | 'followup'

export interface IntakeClient {
  id: string
  name: string
  status: string
  statusType: IntakeStatusType
  statusColor: string
  agentId: string
  agentName: string
  days: number
  daysLabel: string
  canApprove: boolean
  canAssignPhone: boolean
  pendingPlatform?: string
}

export async function getIntakeClients(): Promise<IntakeClient[]> {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: {
        in: [
          IntakeStatus.PENDING,
          IntakeStatus.NEEDS_MORE_INFO,
          IntakeStatus.PENDING_EXTERNAL,
          IntakeStatus.READY_FOR_APPROVAL,
          IntakeStatus.IN_EXECUTION,
        ],
      },
    },
    include: {
      agent: { select: { id: true, name: true } },
      platforms: {
        select: { platformType: true, status: true },
        where: { status: { not: 'VERIFIED' } },
      },
      toDos: {
        where: { status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] } },
        select: { type: true, dueDate: true },
      },
      phoneAssignment: { select: { id: true } },
    },
    orderBy: { statusChangedAt: 'asc' },
  })

  return clients.map((client) => {
    const daysSinceChange = Math.floor(
      (Date.now() - client.statusChangedAt.getTime()) / (1000 * 60 * 60 * 24),
    )

    // Determine detailed status
    const { statusType, status, pendingPlatform } =
      determineDetailedStatus(client)
    const canApprove = client.intakeStatus === IntakeStatus.READY_FOR_APPROVAL
    const canAssignPhone =
      client.intakeStatus === IntakeStatus.PENDING && !client.phoneAssignment

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      status,
      statusType,
      statusColor: getStatusTypeColor(statusType),
      agentId: client.agent.id,
      agentName: client.agent.name || 'Unassigned',
      days: daysSinceChange,
      daysLabel: daysSinceChange === 0 ? 'Today' : `${daysSinceChange} days`,
      canApprove,
      canAssignPhone,
      pendingPlatform,
    }
  })
}

function determineDetailedStatus(client: {
  intakeStatus: IntakeStatus
  platforms: { platformType: PlatformType; status: string }[]
  toDos: { type: string; dueDate: Date | null }[]
}): { statusType: IntakeStatusType; status: string; pendingPlatform?: string } {
  // Check if needs more info
  if (client.intakeStatus === IntakeStatus.NEEDS_MORE_INFO) {
    return { statusType: 'needs_info', status: 'Needs More Info' }
  }

  // Check pending platform uploads
  const pendingPlatform = client.platforms.find(
    (p) => p.status === 'PENDING_REVIEW',
  )
  if (pendingPlatform) {
    return {
      statusType: 'pending_platform',
      status: `Pending ${formatPlatformShort(pendingPlatform.platformType)}`,
      pendingPlatform: formatPlatformShort(pendingPlatform.platformType),
    }
  }

  // Check if ready to approve
  if (client.intakeStatus === IntakeStatus.READY_FOR_APPROVAL) {
    return { statusType: 'ready', status: 'Ready to Approve' }
  }

  // Check if needs follow-up (has pending execution tasks)
  const hasExecutionTasks = client.toDos.some((t) => t.type === 'EXECUTION')
  if (hasExecutionTasks) {
    // Find the soonest due date
    const dueDates = client.toDos
      .filter((t) => t.dueDate)
      .map((t) => t.dueDate!)
      .sort((a, b) => a.getTime() - b.getTime())

    if (dueDates.length > 0) {
      const daysUntilDue = Math.ceil(
        (dueDates[0].getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      const dueLabel =
        daysUntilDue <= 0 ? 'Due today' : `${daysUntilDue} days left`
      return { statusType: 'followup', status: `Follow-up (${dueLabel})` }
    }
    return { statusType: 'followup', status: 'Follow-up' }
  }

  // Default to needs info
  return { statusType: 'needs_info', status: 'Needs More Info' }
}

function getStatusTypeColor(statusType: IntakeStatusType): string {
  const map: Record<IntakeStatusType, string> = {
    needs_info: 'bg-destructive/20 text-destructive border-destructive/30',
    pending_platform: 'bg-accent/20 text-accent border-accent/30',
    ready: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    followup: 'bg-primary/20 text-primary border-primary/30',
  }
  return map[statusType]
}

function formatPlatformShort(platformType: PlatformType): string {
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
    [PlatformType.EDGEBOOST]: 'Edgeboost',
  }
  return map[platformType] || platformType
}

export interface VerificationTask {
  id: string
  clientId: string | null
  clientName: string
  platformType: PlatformType | null
  platformLabel: string
  task: string
  agentId: string | null
  agentName: string
  deadline: Date | null
  daysUntilDue: number | null
  deadlineLabel: string
  clientDeadline: Date | null
  status: 'Pending' | 'Done'
  screenshots: string[]
}

export async function getVerificationClients(): Promise<VerificationTask[]> {
  const todos = await prisma.toDo.findMany({
    where: {
      type: { in: ['VERIFICATION', 'UPLOAD_SCREENSHOT'] },
      status: {
        in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.COMPLETED],
      },
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          agentId: true,
          executionDeadline: true,
          agent: { select: { name: true } },
          platforms: {
            select: { platformType: true, screenshots: true },
          },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 50,
  })

  return todos.map((todo) => {
    const daysUntilDue = todo.dueDate
      ? Math.ceil((todo.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    let deadlineLabel = 'No deadline'
    if (daysUntilDue !== null) {
      if (daysUntilDue <= 0) deadlineLabel = 'Today'
      else if (daysUntilDue === 1) deadlineLabel = '1 day'
      else deadlineLabel = `${daysUntilDue} days`
    }

    // Find screenshots for this todo's platform from the client's platforms
    const matchingPlatform = todo.platformType
      ? todo.client?.platforms.find((p) => p.platformType === todo.platformType)
      : null

    return {
      id: todo.id,
      clientId: todo.client?.id ?? null,
      clientName: todo.client
        ? `${todo.client.firstName} ${todo.client.lastName}`
        : 'N/A',
      platformType: todo.platformType,
      platformLabel: todo.platformType
        ? getPlatformBadgeLabel(todo.platformType)
        : 'N/A',
      task: formatVerificationTask(todo.title),
      agentId: todo.client?.agentId ?? null,
      agentName: todo.client?.agent?.name ?? 'Unassigned',
      deadline: todo.dueDate,
      daysUntilDue,
      deadlineLabel,
      clientDeadline: todo.client?.executionDeadline ?? null,
      status: todo.status === ToDoStatus.COMPLETED ? 'Done' : 'Pending',
      screenshots: matchingPlatform?.screenshots ?? [],
    }
  })
}

function formatVerificationTask(title: string): string {
  // Shorten common verification tasks
  const shortened: Record<string, string> = {
    'Upload ID Verification': 'ID Verification',
    'Upload Bank Statement': 'Bank Statement',
    'Upload Address Proof': 'Address Proof',
    'Complete Face Scan': 'Face Scan',
    'SSN Verification': 'SSN Verification',
  }
  return shortened[title] || title
}

function getPlatformBadgeLabel(platformType: PlatformType): string {
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
    [PlatformType.EDGEBOOST]: 'Edgeboost',
  }
  return map[platformType] || platformType
}

// ==========================================
// To-Do List Data (Backoffice)
// ==========================================

export async function getBackofficeTodos() {
  const todos = await prisma.toDo.findMany({
    where: {
      status: {
        in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE],
      },
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
  })

  // Group by agent
  const agentMap = new Map<
    string,
    {
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
    }
  >()

  const now = new Date()

  for (const todo of todos) {
    const agentId = todo.assignedTo?.id ?? 'unassigned'
    const agentName = todo.assignedTo?.name ?? 'Unassigned'

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { agentId, agentName, tasks: [] })
    }

    const isOverdue =
      todo.status === ToDoStatus.OVERDUE ||
      (todo.dueDate !== null && todo.dueDate < now)

    agentMap.get(agentId)!.tasks.push({
      id: todo.id,
      title: todo.title,
      client: todo.client
        ? `${todo.client.firstName} ${todo.client.lastName}`
        : 'N/A',
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

  const [todayCount, threeDayCount, sevenDayCount, overdueCount] =
    await Promise.all([
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
  const movements = await prisma.fundMovement.findMany({
    include: {
      fromClient: { select: { firstName: true, lastName: true } },
      toClient: { select: { firstName: true, lastName: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    flowType: m.flowType,
    fromClientName: m.fromClient
      ? `${m.fromClient.firstName} ${m.fromClient.lastName}`
      : '—',
    toClientName: m.toClient
      ? `${m.toClient.firstName} ${m.toClient.lastName}`
      : '—',
    fromPlatform: m.fromPlatform,
    toPlatform: m.toPlatform,
    amount: Number(m.amount),
    fee: m.fee ? Number(m.fee) : null,
    method: m.method,
    status: m.status,
    recordedByName: m.recordedBy.name,
    createdAt: formatRelativeTime(m.createdAt),
  }))
}

export async function getFundMovementStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayMovements = await prisma.fundMovement.findMany({
    where: { createdAt: { gte: today } },
    select: { type: true, amount: true, status: true, flowType: true },
  })

  const externalTotal = todayMovements
    .filter((m) => m.type === 'external')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const internalDeposits = todayMovements
    .filter((m) => m.type === 'internal')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const pendingCount = todayMovements.filter(
    (m) => m.status === 'pending',
  ).length

  return { externalTotal, internalDeposits, pendingCount }
}

export async function getClientsForFundAllocation() {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: {
        in: [
          IntakeStatus.APPROVED,
          IntakeStatus.IN_EXECUTION,
          IntakeStatus.PHONE_ISSUED,
        ],
      },
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

export async function getEligibleClientsForPhone(): Promise<
  {
    id: string
    name: string
    agentName: string
  }[]
> {
  const clients = await prisma.client.findMany({
    where: {
      intakeStatus: IntakeStatus.PENDING,
      phoneAssignment: null,
    },
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return clients.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    agentName: c.agent?.name ?? 'Unassigned',
  }))
}

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
      client: a.client
        ? `${a.client.firstName} ${a.client.lastName}`
        : 'Unassigned',
      clientId: a.client?.id ?? '',
      deviceId: a.deviceId ?? '',
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
  const active = assignments.filter(
    (a) => a.issuedAt && !a.signedOutAt && !a.returnedAt,
  ).length
  const pending = assignments.filter((a) => !a.issuedAt).length
  const suspended = assignments.filter(
    (a) => a.signedOutAt && !a.returnedAt,
  ).length

  return { total, active, pending, suspended }
}

// ==========================================
// Client Settlement Data
// ==========================================

export interface SettlementClient {
  id: string
  name: string
  totalDeposited: number
  totalWithdrawn: number
  netBalance: number
  platforms: {
    name: string
    deposited: number
    withdrawn: number
  }[]
  recentTransactions: {
    id: string
    date: string
    type: 'deposit' | 'withdrawal'
    amount: number
    platform: string
    status: string
  }[]
}

export async function getClientsForSettlement(): Promise<SettlementClient[]> {
  // Fetch clients that are APPROVED or have any fund movements
  const [approvedClients, allMovements] = await Promise.all([
    prisma.client.findMany({
      where: { intakeStatus: IntakeStatus.APPROVED },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    }),
    prisma.fundMovement.findMany({
      select: {
        id: true,
        fromClientId: true,
        toClientId: true,
        fromPlatform: true,
        toPlatform: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Build a set of all client IDs that have fund movements
  const clientIdsWithMovements = new Set<string>()
  for (const m of allMovements) {
    if (m.fromClientId) clientIdsWithMovements.add(m.fromClientId)
    if (m.toClientId) clientIdsWithMovements.add(m.toClientId)
  }

  // Merge: approved clients + any clients with movements not already in the approved list
  const approvedIds = new Set(approvedClients.map((c) => c.id))
  const extraClientIds = [...clientIdsWithMovements].filter(
    (id) => !approvedIds.has(id),
  )

  let extraClients: { id: string; firstName: string; lastName: string }[] = []
  if (extraClientIds.length > 0) {
    extraClients = await prisma.client.findMany({
      where: { id: { in: extraClientIds } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    })
  }

  const allClients = [...approvedClients, ...extraClients]

  // Group movements by client
  return allClients.map((client) => {
    const platformTotals = new Map<
      string,
      { deposited: number; withdrawn: number }
    >()

    // Transactions for this client (both deposit and withdrawal entries)
    const transactions: {
      id: string
      date: string
      type: 'deposit' | 'withdrawal'
      amount: number
      platform: string
      status: string
      createdAt: Date
    }[] = []

    for (const m of allMovements) {
      const amount = Number(m.amount)

      // Deposit: money coming INTO this client
      if (m.toClientId === client.id) {
        const platform = m.toPlatform
        const entry = platformTotals.get(platform) || {
          deposited: 0,
          withdrawn: 0,
        }
        entry.deposited += amount
        platformTotals.set(platform, entry)

        transactions.push({
          id: m.id,
          date: formatSettlementDate(m.createdAt),
          type: 'deposit',
          amount,
          platform,
          status: m.status,
          createdAt: m.createdAt,
        })
      }

      // Withdrawal: money going OUT OF this client
      if (m.fromClientId === client.id) {
        const platform = m.fromPlatform
        const entry = platformTotals.get(platform) || {
          deposited: 0,
          withdrawn: 0,
        }
        entry.withdrawn += amount
        platformTotals.set(platform, entry)

        // Avoid duplicate transaction entry for same-client transfers
        if (m.toClientId !== client.id) {
          transactions.push({
            id: m.id,
            date: formatSettlementDate(m.createdAt),
            type: 'withdrawal',
            amount,
            platform,
            status: m.status,
            createdAt: m.createdAt,
          })
        } else {
          // Same-client transfer: add as a separate withdrawal entry with different id suffix
          transactions.push({
            id: `${m.id}-w`,
            date: formatSettlementDate(m.createdAt),
            type: 'withdrawal',
            amount,
            platform,
            status: m.status,
            createdAt: m.createdAt,
          })
        }
      }
    }

    const totalDeposited = [...platformTotals.values()].reduce(
      (sum, p) => sum + p.deposited,
      0,
    )
    const totalWithdrawn = [...platformTotals.values()].reduce(
      (sum, p) => sum + p.withdrawn,
      0,
    )

    // Sort transactions by date desc, limit to 20
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const recentTransactions = transactions
      .slice(0, 20)
      .map(({ createdAt: _, ...rest }) => rest)

    const platforms = [...platformTotals.entries()]
      .map(([name, totals]) => ({
        name,
        deposited: totals.deposited,
        withdrawn: totals.withdrawn,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      totalDeposited,
      totalWithdrawn,
      netBalance: totalDeposited - totalWithdrawn,
      platforms,
      recentTransactions,
    }
  })
}

function formatSettlementDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
    [IntakeStatus.PARTNERSHIP_ENDED]: 'Partnership Ended',
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
    [IntakeStatus.PARTNERSHIP_ENDED]: 'bg-slate-400',
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
