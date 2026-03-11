import prisma from '@/backend/prisma/client'
import { format } from 'date-fns'
import { ALL_PLATFORMS, PLATFORM_INFO } from '@/lib/platforms'
import type { PlatformType } from '@/types'
import type {
  TodoTimelineEntry,
  TraderReportData,
  TraderPlatformGroup,
  TraderAccount,
  TraderPlatformPnL,
  DailyBalancesData,
  DailyBalancesAccount,
} from '@/types/backend-types'

/**
 * Aggregation function for the backoffice Action Hub.
 * Runs all queries in parallel for performance.
 */
export async function getActionHubData() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const tomorrowEnd = new Date(todayStart)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2)

  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    pendingTodos,
    overdueDevices,
    deviceReservations,
    submittedDrafts,
    draftsByStep,
    todayAllocations,
    yesterdayAllocCount,
    recentTimeline,
    tomorrowDueTodos,
    unconfirmedAllocations,
    gmailIntegration,
    recentProcessedEmails,
    gmailMatchedCount,
    discrepancyAllocations,
    verificationAllocations,
  ] = await Promise.all([
    // Pending todos (sorted by due date, overdue first)
    prisma.todo.findMany({
      where: { status: 'PENDING' },
      include: {
        clientRecord: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),

    // Overdue devices (SIGNED_OUT + dueBackAt < now)
    prisma.phoneAssignment.findMany({
      where: {
        status: 'SIGNED_OUT',
        dueBackAt: { lt: now },
      },
      include: {
        agent: { select: { id: true, name: true } },
        clientRecord: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { dueBackAt: 'asc' },
    }),

    // Device reservations waiting (record has reservation date but no active SIGNED_OUT assignment)
    prisma.clientRecord.findMany({
      where: {
        deviceReservationDate: { not: null },
        status: 'DRAFT',
        phoneAssignments: {
          none: { status: 'SIGNED_OUT' },
        },
      },
      include: {
        closer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // SUBMITTED records (ready to approve)
    prisma.clientRecord.findMany({
      where: {
        status: 'SUBMITTED',
      },
      include: {
        closer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Record counts by step (active drafts only)
    prisma.clientRecord.groupBy({
      by: ['step'],
      where: { status: 'DRAFT' },
      _count: true,
    }),

    // Today's fund allocations
    prisma.fundAllocation.findMany({
      where: { createdAt: { gte: todayStart } },
      include: {
        recordedBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
        clientRecord: { select: { id: true, firstName: true, lastName: true } },
        destinationClientRecord: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Yesterday's allocation count
    prisma.fundAllocation.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),

    // Activity timeline (recent events)
    getActionHubTimeline(),

    // Todos due tomorrow (for closing rundown)
    prisma.todo.count({
      where: {
        status: 'PENDING',
        dueDate: { gte: todayStart, lt: tomorrowEnd },
      },
    }),

    // Unconfirmed fund allocations count
    prisma.fundAllocation.count({
      where: { confirmationStatus: 'UNCONFIRMED' },
    }),

    // Gmail integration — last sync time
    prisma.gmailIntegration.findFirst({
      where: { isActive: true },
      select: { lastSyncAt: true },
      orderBy: { updatedAt: 'desc' },
    }),

    // Recent processed emails (last 7 days) for fund insights panel
    prisma.processedEmail.findMany({
      where: { receivedAt: { gte: sevenDaysAgo } },
      orderBy: { receivedAt: 'desc' },
      take: 30,
    }),

    // Gmail auto-matched fund count (CONFIRMED with no confirmedBy)
    prisma.fundAllocation.count({
      where: {
        confirmationStatus: 'CONFIRMED',
        confirmedById: null,
      },
    }),

    // Discrepancy fund allocations (need attention)
    prisma.fundAllocation.findMany({
      where: { confirmationStatus: 'DISCREPANCY' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Verification/clearing allocations (withdrawals needing attention)
    prisma.fundAllocation.findMany({
      where: {
        direction: { in: ['WITHDRAWAL', 'withdrawal'] },
        OR: [
          { confirmationStatus: 'UNCONFIRMED' },
          { confirmationStatus: 'DISCREPANCY' },
          { confirmationStatus: 'CONFIRMED', confirmedById: null },
        ],
      },
      include: {
        recordedBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
        clientRecord: { select: { id: true, firstName: true, lastName: true } },
        destinationClientRecord: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  // Compute activity streak + yesterday stats (lightweight)
  const streakData = await computeActivityStreak()
  const yesterdayStats = await getYesterdayStats(yesterdayStart, todayStart)

  return {
    pendingTodos,
    overdueDevices,
    deviceReservations,
    submittedDrafts,
    draftsByStep,
    todayAllocations,
    yesterdayAllocCount,
    recentTimeline,
    tomorrowDueTodos,
    unconfirmedAllocations,
    lastGmailSync: gmailIntegration?.lastSyncAt ?? null,
    streakDays: streakData.streakDays,
    longestStreak: streakData.longestStreak,
    yesterdayStats,
    recentProcessedEmails,
    gmailMatchedCount,
    discrepancyAllocations,
    verificationAllocations,
  }
}

/**
 * Lightweight stats for the backoffice overview page.
 * All count() queries — fast and parallel.
 */
export async function getOverviewStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    pendingReviews,
    approvedToday,
    overdueTodos,
    overdueDevices,
    activeClients,
  ] = await Promise.all([
    // SUBMITTED records awaiting approval
    prisma.clientRecord.count({
      where: { status: 'SUBMITTED' },
    }),

    // Approved today
    prisma.clientRecord.count({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: todayStart },
      },
    }),

    // Overdue pending todos
    prisma.todo.count({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
    }),

    // Overdue devices
    prisma.phoneAssignment.count({
      where: {
        status: 'SIGNED_OUT',
        dueBackAt: { lt: now },
      },
    }),

    // Active clients (DRAFT + SUBMITTED + APPROVED)
    prisma.clientRecord.count({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
    }),
  ])

  return {
    pendingReviews,
    approvedToday,
    urgentActions: overdueTodos + overdueDevices,
    activeClients,
  }
}

/**
 * Trader Report data — P&L from balance snapshots + active accounts.
 * Used by the Pre-Trading Daily Brief (page 2).
 */
export async function getTraderReportData(): Promise<TraderReportData> {
  const today = new Date()
  const t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  t1.setDate(t1.getDate() - 1) // yesterday
  const t2 = new Date(t1)
  t2.setDate(t2.getDate() - 1) // day before yesterday

  const [snapshotsT1T2, approvedClients, firstSnapshots] = await Promise.all([
    // T-1 and T-2 balance snapshots
    prisma.balanceSnapshot.findMany({
      where: { date: { in: [t1, t2] } },
      select: {
        clientRecordId: true,
        platform: true,
        date: true,
        balance: true,
      },
    }),

    // All approved clients with account statuses
    prisma.clientRecord.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        accountStatuses: true,
        closer: { select: { id: true, name: true } },
      },
    }),

    // First snapshot per client per platform (for lifetime P&L)
    prisma.$queryRawUnsafe<Array<{ clientRecordId: string; platform: string; balance: string }>>(
      `SELECT DISTINCT ON ("clientRecordId", "platform") "clientRecordId", "platform", "balance"::text
       FROM "BalanceSnapshot"
       ORDER BY "clientRecordId", "platform", "date" ASC`
    ),
  ])

  const toNum = (d: unknown): number => {
    if (d === null || d === undefined) return 0
    return Number(String(d))
  }

  // Build lookup: clientId → { firstName, lastName, agentName, accountStatuses }
  const clientLookup = new Map(
    approvedClients.map((c) => [
      c.id,
      {
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        agentName: c.closer?.name ?? 'Unknown',
        statuses: (c.accountStatuses as Record<string, string>) ?? {},
      },
    ]),
  )

  // Build T-1 and T-2 balance maps: key = `clientId:platform`
  // Compare using ISO date strings (YYYY-MM-DD) to avoid timezone issues
  // DB stores @db.Date as midnight UTC, but JS local-time comparison can shift the date
  const t1Str = t1.toISOString().slice(0, 10)
  const t2Str = t2.toISOString().slice(0, 10)

  const t1Balances = new Map<string, number>()
  const t2Balances = new Map<string, number>()
  for (const snap of snapshotsT1T2) {
    const key = `${snap.clientRecordId}:${snap.platform}`
    const snapStr = new Date(snap.date).toISOString().slice(0, 10)
    if (snapStr === t1Str) {
      t1Balances.set(key, toNum(snap.balance))
    } else {
      t2Balances.set(key, toNum(snap.balance))
    }
  }

  // Build first-snapshot map for lifetime P&L
  const firstBalances = new Map<string, number>()
  for (const snap of firstSnapshots) {
    const key = `${snap.clientRecordId}:${snap.platform}`
    firstBalances.set(key, toNum(snap.balance))
  }

  // Map status string to display value
  const statusMap = (s: string): TraderAccount['status'] => {
    switch (s) {
      case 'VIP': return 'VIP'
      case 'SEMI_LIMITED': return 'Semi-Limited'
      case 'LIMITED': return 'Limited'
      case 'DEAD': return 'Dead'
      default: return 'Active'
    }
  }

  // Build platform accounts + P&L per platform
  const platformAccounts: TraderPlatformGroup[] = []
  const pnlByPlatform: TraderPlatformPnL[] = []

  for (const platformKey of ALL_PLATFORMS) {
    const info = PLATFORM_INFO[platformKey]
    const accounts: TraderAccount[] = []
    let platT1Total = 0
    let platT2Total = 0

    for (const [clientId, client] of clientLookup) {
      const key = `${clientId}:${platformKey}`
      const bal = t1Balances.get(key)
      if (bal === undefined) continue // no snapshot for this client-platform

      const t2Bal = t2Balances.get(key) ?? 0
      const firstBal = firstBalances.get(key) ?? bal
      const dailyPnL = bal - t2Bal
      const lifetimePnL = bal - firstBal
      const status = statusMap(client.statuses[platformKey] ?? 'ACTIVE')

      accounts.push({
        clientId,
        clientName: client.name,
        agentName: client.agentName,
        balance: Math.round(bal),
        dailyPnL: Math.round(dailyPnL),
        lifetimePnL: Math.round(lifetimePnL),
        status,
      })

      platT1Total += bal
      platT2Total += t2Bal
    }

    if (accounts.length === 0) continue

    // Sort by balance descending
    accounts.sort((a, b) => b.balance - a.balance)

    const vipCount = accounts.filter((a) => a.status === 'VIP').length
    const semiLimitedCount = accounts.filter((a) => a.status === 'Semi-Limited').length
    const activeCount = accounts.filter((a) => a.status === 'Active').length

    platformAccounts.push({
      platform: platformKey,
      name: info.name,
      abbrev: info.abbrev,
      category: info.category,
      accounts,
      totalBalance: Math.round(platT1Total),
      vipCount,
      semiLimitedCount,
      activeCount,
    })

    pnlByPlatform.push({
      platform: platformKey,
      name: info.name,
      abbrev: info.abbrev,
      t1Balance: Math.round(platT1Total),
      t2Balance: Math.round(platT2Total),
      dailyPnL: Math.round(platT1Total - platT2Total),
      accountCount: accounts.length,
    })
  }

  // Sort: sportsbooks first, then financial
  platformAccounts.sort((a, b) => {
    if (a.category === b.category) return 0
    return a.category === 'sports' ? -1 : 1
  })

  const dailyTotal = pnlByPlatform.reduce((sum, p) => sum + p.dailyPnL, 0)

  return {
    pnl: {
      dailyTotal,
      byPlatform: pnlByPlatform,
    },
    platformAccounts,
  }
}

/**
 * Compute consecutive days with productive activity (streak).
 * Looks at EventLog for days with TODO_COMPLETED, CLIENT_APPROVED, or FUND_ALLOCATED.
 * Goes back up to 90 days. Returns current streak + longest streak.
 */
async function computeActivityStreak(): Promise<{ streakDays: number; longestStreak: number }> {
  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 90)

  const events = await prisma.eventLog.findMany({
    where: {
      eventType: { in: ['TODO_COMPLETED', 'CLIENT_APPROVED', 'FUND_ALLOCATED', 'DEVICE_SIGNED_OUT', 'DEVICE_RETURNED'] },
      createdAt: { gte: lookback },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (events.length === 0) return { streakDays: 0, longestStreak: 0 }

  // Collect unique active dates (YYYY-MM-DD)
  const activeDates = new Set<string>()
  for (const e of events) {
    const d = e.createdAt
    activeDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  // Walk backwards from yesterday counting consecutive active days
  const today = new Date()
  let streakDays = 0
  let longestStreak = 0
  let currentRun = 0

  // Check up to 90 days
  for (let i = 1; i <= 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (activeDates.has(key)) {
      currentRun++
      if (i <= 90) longestStreak = Math.max(longestStreak, currentRun)
      if (streakDays === i - 1) streakDays = currentRun // extend current streak
    } else {
      currentRun = 0
    }
  }

  return { streakDays, longestStreak: Math.max(longestStreak, streakDays) }
}

/**
 * Yesterday's completed work stats for the motivational card.
 */
async function getYesterdayStats(yesterdayStart: Date, todayStart: Date) {
  const [todosCompleted, clientsApproved, fundsRecorded] = await Promise.all([
    prisma.todo.count({
      where: { status: 'COMPLETED', completedAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.clientRecord.count({
      where: { status: 'APPROVED', approvedAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.fundAllocation.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
  ])

  return { todosCompleted, clientsApproved, fundsRecorded }
}

/**
 * Activity timeline for the Action Hub — includes todo, device, fund, and approval events.
 */
async function getActionHubTimeline(): Promise<TodoTimelineEntry[]> {
  const events = await prisma.eventLog.findMany({
    where: {
      eventType: {
        in: [
          'TODO_ASSIGNED',
          'TODO_COMPLETED',
          'TODO_REVERTED',
          'DEVICE_SIGNED_OUT',
          'DEVICE_RETURNED',
          'DEVICE_REISSUED',
          'CLIENT_APPROVED',
          'CLIENT_APPROVAL_REVERTED',
          'FUND_ALLOCATED',
        ],
      },
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const actionMap: Record<string, TodoTimelineEntry['action']> = {
    TODO_ASSIGNED: 'assigned',
    TODO_COMPLETED: 'completed',
    TODO_REVERTED: 'reverted',
    DEVICE_SIGNED_OUT: 'device_out',
    DEVICE_RETURNED: 'device_returned',
    DEVICE_REISSUED: 'device_reissued',
    CLIENT_APPROVED: 'client_approved',
    CLIENT_APPROVAL_REVERTED: 'client_reverted',
    FUND_ALLOCATED: 'assigned', // reuse 'assigned' visual style
  }

  const typeMap: Record<string, 'info' | 'success' | 'warning'> = {
    TODO_ASSIGNED: 'info',
    TODO_COMPLETED: 'success',
    TODO_REVERTED: 'warning',
    DEVICE_SIGNED_OUT: 'info',
    DEVICE_RETURNED: 'success',
    DEVICE_REISSUED: 'warning',
    CLIENT_APPROVED: 'success',
    CLIENT_APPROVAL_REVERTED: 'warning',
    FUND_ALLOCATED: 'info',
  }

  return events.map((e) => ({
    id: e.id,
    date: format(e.createdAt, 'MMM d, yyyy'),
    time: format(e.createdAt, 'h:mm a'),
    createdAt: e.createdAt,
    event: e.description,
    type: typeMap[e.eventType] ?? 'info',
    actor: e.user?.name ?? null,
    action: actionMap[e.eventType] ?? 'assigned',
  }))
}

// ── Daily Balances Recording Page Data ─────────────────────────

export async function getDailyBalancesData(dateStr?: string): Promise<DailyBalancesData> {
  // Default to today
  const targetDate = dateStr
    ? new Date(dateStr + 'T00:00:00')
    : (() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      })()

  const yesterdayDate = new Date(targetDate)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)

  const targetStr = targetDate.toISOString().slice(0, 10)
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

  // Fetch in parallel:
  // 1. Approved clients with their agent and platforms
  // 2. Today's snapshots (already recorded)
  // 3. Yesterday's snapshots (for reference)
  const [clients, todaySnapshots, yesterdaySnapshots] = await Promise.all([
    prisma.clientRecord.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        platformData: true,
        accountStatuses: true,
        closer: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.balanceSnapshot.findMany({
      where: { date: targetDate },
      select: {
        clientRecordId: true,
        platform: true,
        balance: true,
        screenshotPath: true,
      },
    }),
    prisma.balanceSnapshot.findMany({
      where: { date: yesterdayDate },
      select: {
        clientRecordId: true,
        platform: true,
        balance: true,
      },
    }),
  ])

  // Build lookup maps for snapshots
  const todayMap = new Map<string, { balance: number; screenshotPath: string | null }>()
  for (const s of todaySnapshots) {
    todayMap.set(`${s.clientRecordId}:${s.platform}`, {
      balance: Number(s.balance),
      screenshotPath: s.screenshotPath,
    })
  }
  const yesterdayMap = new Map<string, number>()
  for (const s of yesterdaySnapshots) {
    yesterdayMap.set(`${s.clientRecordId}:${s.platform}`, Number(s.balance))
  }

  // Build per-platform account lists
  const platformAccountsMap = new Map<string, DailyBalancesAccount[]>()

  for (const client of clients) {
    const pd = client.platformData as Record<string, unknown> | null
    if (!pd) continue

    // Determine which platforms this client has
    const platformKeys: Record<string, PlatformType> = {
      draftkings: 'DRAFTKINGS',
      fanduel: 'FANDUEL',
      betmgm: 'BETMGM',
      caesars: 'CAESARS',
      fanatics: 'FANATICS',
      ballybet: 'BALLYBET',
      betrivers: 'BETRIVERS',
      bet365: 'BET365',
      paypal: 'PAYPAL',
      onlineBanking: 'BANK',
      edgeboost: 'EDGEBOOST',
    }

    for (const [key, platformType] of Object.entries(platformKeys)) {
      const entry = pd[key]
      if (!entry || typeof entry !== 'object') continue

      // Only include platforms that have been started (have username or screenshot)
      const entryObj = entry as Record<string, unknown>
      if (!entryObj.username && !entryObj.screenshot && !entryObj.screenshots) continue

      const lookupKey = `${client.id}:${platformType}`
      const todaySnap = todayMap.get(lookupKey)
      const yesterdayBal = yesterdayMap.get(lookupKey) ?? null

      const account: DailyBalancesAccount = {
        clientRecordId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        agentName: client.closer?.name ?? 'Unassigned',
        platform: platformType,
        todayBalance: todaySnap?.balance ?? null,
        yesterdayBalance: yesterdayBal,
        screenshotPath: todaySnap?.screenshotPath ?? null,
        recorded: !!todaySnap,
      }

      if (!platformAccountsMap.has(platformType)) {
        platformAccountsMap.set(platformType, [])
      }
      platformAccountsMap.get(platformType)!.push(account)
    }
  }

  // Build ordered list by platform
  const platformGroups: DailyBalancesData['platformGroups'] = []
  for (const pt of ALL_PLATFORMS) {
    const accounts = platformAccountsMap.get(pt) ?? []
    if (accounts.length === 0) continue
    const info = PLATFORM_INFO[pt]
    platformGroups.push({
      platform: pt,
      name: info.name,
      abbrev: info.abbrev,
      category: info.category,
      accounts,
      recordedCount: accounts.filter((a) => a.recorded).length,
      totalCount: accounts.length,
    })
  }

  const totalAccounts = platformGroups.reduce((s, g) => s + g.totalCount, 0)
  const totalRecorded = platformGroups.reduce((s, g) => s + g.recordedCount, 0)

  return {
    date: targetStr,
    platformGroups,
    totalAccounts,
    totalRecorded,
  }
}
