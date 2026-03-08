import prisma from '@/backend/prisma/client'
import { PLATFORM_INFO, SPORTS_PLATFORMS } from '@/lib/platforms'
import { getAgentDisplayTier } from '@/lib/commission-constants'
import type {
  CockpitData,
  CockpitSignalData,
  CockpitFundWarRoom,
  CockpitWarRoomPlatform,
  CockpitWarRoomAccount,
  CockpitBankOvernightAlert,
  CockpitEdgeBoostProgress,
  CockpitAgentActivity,
  CockpitLowSuccessAgent,
  CockpitOnboardingBottleneck,
  CockpitStepPipeline,
  CockpitUnusedAccount,
  CockpitSmartInsight,
} from '@/types/backend-types'

// Constants
const SPORTSBOOK_TARGET = 100_000
const MIN_ACCOUNT_TARGET = 5_000
const BANK_OVERNIGHT_THRESHOLD = 250
const BANK_OVERNIGHT_HOURS = 24
const EDGEBOOST_TOTAL_TARGET = 1_000
const EDGEBOOST_DEPOSIT_COUNT = 4
const STALE_AGENT_DAYS = 7
const ATTENTION_SUCCESS_THRESHOLD = 0.85
const STUCK_NO_PROGRESS_DAYS = 5
const STUCK_DEVICE_WAIT_DAYS = 1

function toNum(d: unknown): number {
  if (d === null || d === undefined) return 0
  return Number(String(d))
}

export async function getCockpitData(): Promise<CockpitData> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const twentyFourHoursAgo = new Date(now.getTime() - BANK_OVERNIGHT_HOURS * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - STALE_AGENT_DAYS * 24 * 60 * 60 * 1000)

  const [
    overdueDeviceCount,
    overdueTodoCount,
    unconfirmedFundCount,
    transactionsByPlatform,
    transactionsByClientPlatform,
    approvedClients,
    todayTransactions,
    bankDepositsRecent,
    edgeBoostDeposits,
    agents,
    recentAgentEvents,
    stepAdvancedEvents,
    draftRecords,
    signedOutDeviceCount,
    distinctPhones,
    deviceReservationCount,
    firstTransactionAgg,
  ] = await Promise.all([
    // Signal
    prisma.phoneAssignment.count({
      where: { status: 'SIGNED_OUT', dueBackAt: { lt: now } },
    }),
    prisma.todo.count({
      where: { status: 'PENDING', dueDate: { lt: now } },
    }),
    prisma.fundAllocation.count({
      where: { confirmationStatus: 'UNCONFIRMED' },
    }),

    // Fund War Room
    prisma.transaction.groupBy({
      by: ['platformType', 'type'],
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['clientRecordId', 'platformType', 'type'],
      _sum: { amount: true },
    }),
    prisma.clientRecord.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        approvedAt: true,
        platformData: true,
        closer: { select: { id: true, name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { platformType: true, type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        platformType: 'BANK',
        type: 'DEPOSIT',
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { clientRecordId: true, amount: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { platformType: 'EDGEBOOST', type: 'DEPOSIT' },
      select: { clientRecordId: true, amount: true },
    }),

    // Agent Activity
    prisma.user.findMany({
      where: { role: 'AGENT', isActive: true },
      select: {
        id: true,
        name: true,
        starLevel: true,
        leadershipTier: true,
        clientRecords: {
          select: { id: true, status: true, createdAt: true, approvedAt: true },
        },
      },
    }),
    prisma.eventLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true, createdAt: true },
    }),

    // Bottleneck
    prisma.eventLog.findMany({
      where: { eventType: 'STEP_ADVANCED' },
      select: { metadata: true, createdAt: true },
    }),
    prisma.clientRecord.findMany({
      where: { status: 'DRAFT' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        step: true,
        updatedAt: true,
        deviceReservationDate: true,
        closer: { select: { id: true, name: true } },
        phoneAssignments: {
          where: { status: 'SIGNED_OUT' },
          select: { id: true },
        },
      },
    }),
    prisma.phoneAssignment.count({ where: { status: 'SIGNED_OUT' } }),
    prisma.phoneAssignment.findMany({
      select: { phoneNumber: true },
      distinct: ['phoneNumber'],
    }),
    prisma.clientRecord.count({
      where: {
        deviceReservationDate: { not: null },
        status: 'DRAFT',
        phoneAssignments: { none: { status: 'SIGNED_OUT' } },
      },
    }),

    // Burn rate — earliest transaction date
    prisma.transaction.aggregate({ _min: { createdAt: true } }),
  ])

  // Days of data for burn rate
  const firstTxDate = firstTransactionAgg._min.createdAt
  const daysOfData = firstTxDate
    ? Math.max(1, (now.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30

  // Client lookup for name/agent resolution
  const clientLookup = new Map(
    approvedClients.map((c) => [
      c.id,
      {
        firstName: c.firstName,
        lastName: c.lastName,
        closer: c.closer,
        approvedAt: c.approvedAt,
        platformData: c.platformData,
      },
    ]),
  )

  const signal = buildSignal(overdueDeviceCount, overdueTodoCount, unconfirmedFundCount)

  const fundWarRoom = buildFundWarRoom(
    transactionsByPlatform,
    transactionsByClientPlatform,
    clientLookup,
    todayTransactions,
    bankDepositsRecent,
    edgeBoostDeposits,
    daysOfData,
    now,
  )

  const agentActivity = buildAgentActivity(agents, recentAgentEvents, monthStart)

  const bottleneck = buildOnboardingBottleneck(
    stepAdvancedEvents,
    draftRecords,
    signedOutDeviceCount,
    distinctPhones.length,
    deviceReservationCount,
    overdueDeviceCount,
    approvedClients,
    transactionsByClientPlatform,
    now,
  )

  return { signal, fundWarRoom, agentActivity, bottleneck }
}

// ── Signal ──────────────────────────────────────────────────────────

function buildSignal(
  overdueDevices: number,
  overdueTodos: number,
  unconfirmedFunds: number,
): CockpitSignalData {
  const issues = overdueDevices + overdueTodos
  if (issues > 0) return { statusLevel: 'critical', attentionCount: issues }
  if (unconfirmedFunds > 5) return { statusLevel: 'attention', attentionCount: unconfirmedFunds }
  return { statusLevel: 'normal', attentionCount: 0 }
}

// ── Fund War Room ───────────────────────────────────────────────────

type ClientInfo = {
  firstName: string | null
  lastName: string | null
  closer: { id: string; name: string }
  approvedAt: Date | null
  platformData: unknown
}

function buildFundWarRoom(
  txByPlatform: { platformType: string | null; type: string; _sum: { amount: unknown }; _count: number }[],
  txByClientPlatform: { clientRecordId: string; platformType: string | null; type: string; _sum: { amount: unknown } }[],
  clientLookup: Map<string, ClientInfo>,
  todayTx: { platformType: string | null; type: string; amount: unknown }[],
  bankDepositsRecent: { clientRecordId: string; amount: unknown; createdAt: Date }[],
  edgeBoostDeposits: { clientRecordId: string; amount: unknown }[],
  daysOfData: number,
  now: Date,
): CockpitFundWarRoom {
  // Per-client per-platform balances
  const clientBalances = new Map<string, Map<string, { deposits: number; withdrawals: number }>>()
  for (const row of txByClientPlatform) {
    const p = row.platformType ?? ''
    if (!clientBalances.has(row.clientRecordId)) clientBalances.set(row.clientRecordId, new Map())
    const cm = clientBalances.get(row.clientRecordId)!
    if (!cm.has(p)) cm.set(p, { deposits: 0, withdrawals: 0 })
    const e = cm.get(p)!
    if (row.type === 'DEPOSIT') e.deposits += toNum(row._sum.amount)
    else e.withdrawals += toNum(row._sum.amount)
  }

  // Sportsbook platform cards
  const platforms: CockpitWarRoomPlatform[] = SPORTS_PLATFORMS.map((p) => {
    const info = PLATFORM_INFO[p]
    // Total balance from groupBy
    let totalDeposits = 0
    let totalWithdrawals = 0
    for (const row of txByPlatform) {
      if (row.platformType === p) {
        if (row.type === 'DEPOSIT') totalDeposits += toNum(row._sum.amount)
        else totalWithdrawals += toNum(row._sum.amount)
      }
    }
    const totalBalance = totalDeposits - totalWithdrawals

    // Per-client breakdown
    const accountsBelowMin: CockpitWarRoomAccount[] = []
    let accountCount = 0
    for (const [clientId, pMap] of clientBalances) {
      const cd = pMap.get(p)
      if (cd) {
        accountCount++
        const bal = cd.deposits - cd.withdrawals
        if (bal < MIN_ACCOUNT_TARGET) {
          const c = clientLookup.get(clientId)
          accountsBelowMin.push({
            clientId,
            clientName: c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unknown',
            balance: Math.round(bal),
            agentName: c?.closer?.name ?? 'Unknown',
          })
        }
      }
    }

    // Today's activity
    const todayDep = todayTx
      .filter((t) => t.platformType === p && t.type === 'DEPOSIT')
      .reduce((s, t) => s + toNum(t.amount), 0)
    const todayWd = todayTx
      .filter((t) => t.platformType === p && t.type === 'WITHDRAWAL')
      .reduce((s, t) => s + toNum(t.amount), 0)

    // Burn rate: average weekly withdrawal rate
    const weeklyBurnRate = totalWithdrawals > 0
      ? Math.round((totalWithdrawals / daysOfData) * 7)
      : 0

    return {
      platform: p,
      platformName: info.name,
      abbrev: info.abbrev,
      totalBalance: Math.round(totalBalance),
      target: SPORTSBOOK_TARGET,
      accountCount,
      minAccountTarget: MIN_ACCOUNT_TARGET,
      accountsBelowMin: accountsBelowMin.sort((a, b) => a.balance - b.balance),
      burnRate: weeklyBurnRate,
      todayDeposits: Math.round(todayDep),
      todayWithdrawals: Math.round(todayWd),
    }
  })

  // Bank $250 overnight alerts
  const bankAlerts: CockpitBankOvernightAlert[] = []
  for (const [clientId, pMap] of clientBalances) {
    const bankData = pMap.get('BANK')
    if (!bankData) continue
    const netBal = bankData.deposits - bankData.withdrawals
    if (netBal > BANK_OVERNIGHT_THRESHOLD) {
      const recentDep = bankDepositsRecent.find((d) => d.clientRecordId === clientId)
      if (recentDep) {
        const hoursAgo = (now.getTime() - recentDep.createdAt.getTime()) / (1000 * 60 * 60)
        const c = clientLookup.get(clientId)
        bankAlerts.push({
          clientId,
          clientName: c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unknown',
          agentName: c?.closer?.name ?? 'Unknown',
          bankBalance: Math.round(netBal),
          oldestDepositHoursAgo: Math.round(hoursAgo),
        })
      }
    }
  }

  // EdgeBoost onboarding progress
  const ebByClient = new Map<string, { count: number; total: number }>()
  for (const dep of edgeBoostDeposits) {
    const amt = toNum(dep.amount)
    const ex = ebByClient.get(dep.clientRecordId)
    if (ex) {
      ex.count++
      ex.total += amt
    } else {
      ebByClient.set(dep.clientRecordId, { count: 1, total: amt })
    }
  }
  const edgeBoostProgress: CockpitEdgeBoostProgress[] = []
  for (const [clientId, data] of ebByClient) {
    const isComplete = data.count >= EDGEBOOST_DEPOSIT_COUNT && data.total >= EDGEBOOST_TOTAL_TARGET
    const c = clientLookup.get(clientId)
    edgeBoostProgress.push({
      clientId,
      clientName: c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unknown',
      agentName: c?.closer?.name ?? 'Unknown',
      depositsCompleted: Math.min(data.count, EDGEBOOST_DEPOSIT_COUNT),
      totalDeposited: Math.round(data.total),
      remaining: Math.max(0, EDGEBOOST_TOTAL_TARGET - data.total),
      isComplete,
    })
  }
  // Also add approved clients with NO EdgeBoost deposits
  for (const [clientId, info] of clientLookup) {
    if (!ebByClient.has(clientId)) {
      edgeBoostProgress.push({
        clientId,
        clientName: `${info.firstName ?? ''} ${info.lastName ?? ''}`.trim(),
        agentName: info.closer?.name ?? 'Unknown',
        depositsCompleted: 0,
        totalDeposited: 0,
        remaining: EDGEBOOST_TOTAL_TARGET,
        isComplete: false,
      })
    }
  }

  // Insights
  const insights: CockpitSmartInsight[] = []
  for (const p of platforms) {
    if (p.totalBalance > 0 && p.totalBalance < p.target * 0.5) {
      insights.push({
        id: `low-balance-${p.platform}`,
        text: `${p.platformName} at ${Math.round((p.totalBalance / p.target) * 100)}% of target — $${(p.target - p.totalBalance).toLocaleString()} needed`,
        severity: 'warning',
      })
    }
    if (p.accountsBelowMin.length > 0) {
      insights.push({
        id: `below-min-${p.platform}`,
        text: `${p.accountsBelowMin.length} account${p.accountsBelowMin.length !== 1 ? 's' : ''} below $${MIN_ACCOUNT_TARGET.toLocaleString()} min on ${p.platformName}`,
        severity: 'info',
      })
    }
  }
  if (bankAlerts.length > 0) {
    insights.push({
      id: 'bank-overnight',
      text: `${bankAlerts.length} client${bankAlerts.length !== 1 ? 's' : ''} with bank balance > $${BANK_OVERNIGHT_THRESHOLD} — TRANSFER NOW`,
      severity: 'critical',
    })
  }
  const incompleteEB = edgeBoostProgress.filter((e) => !e.isComplete)
  if (incompleteEB.length > 0) {
    insights.push({
      id: 'edgeboost-pending',
      text: `${incompleteEB.length} client${incompleteEB.length !== 1 ? 's' : ''} pending EdgeBoost 4x deposits`,
      severity: 'info',
    })
  }

  return { platforms, bankAlerts, edgeBoostProgress, insights }
}

// ── Agent Activity ──────────────────────────────────────────────────

function buildAgentActivity(
  agents: {
    id: string
    name: string
    starLevel: number
    leadershipTier: string
    clientRecords: { id: string; status: string; createdAt: Date; approvedAt: Date | null }[]
  }[],
  recentEvents: { userId: string | null; createdAt: Date }[],
  monthStart: Date,
): CockpitAgentActivity {
  const activeUserIds = new Set(recentEvents.map((e) => e.userId).filter(Boolean))

  const stats = agents.map((a) => {
    const total = a.clientRecords.length
    const approved = a.clientRecords.filter((r) => r.status === 'APPROVED')
    const approvedCount = approved.length
    const successRate = total > 0 ? approvedCount / total : 0

    const daysList = approved
      .filter((r) => r.approvedAt)
      .map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const avgDays = daysList.length > 0 ? daysList.reduce((a, b) => a + b, 0) / daysList.length : null

    const monthApproved = approved.filter((r) => r.approvedAt && r.approvedAt >= monthStart)
    const monthDaysList = monthApproved
      .filter((r) => r.approvedAt)
      .map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const monthAvgDays =
      monthDaysList.length > 0 ? monthDaysList.reduce((a, b) => a + b, 0) / monthDaysList.length : null

    return {
      ...a,
      totalClients: total,
      approvedClients: approvedCount,
      successRate,
      avgDays,
      monthApproved: monthApproved.length,
      monthAvgDays,
      isActive: activeUserIds.has(a.id),
    }
  })

  // Rankings — Most Clients first
  const withClients = stats.filter((a) => a.approvedClients > 0)
  const mostClients =
    withClients.length > 0 ? withClients.reduce((a, b) => (a.approvedClients > b.approvedClients ? a : b)) : null

  const withDays = stats.filter((a) => a.avgDays !== null)
  const fastest =
    withDays.length > 0
      ? withDays.reduce((a, b) => ((a.avgDays ?? Infinity) < (b.avgDays ?? Infinity) ? a : b))
      : null

  const withMonthClients = stats.filter((a) => a.monthApproved > 0)
  const monthMost =
    withMonthClients.length > 0
      ? withMonthClients.reduce((a, b) => (a.monthApproved > b.monthApproved ? a : b))
      : null

  const withMonthDays = stats.filter((a) => a.monthAvgDays !== null)
  const monthFastest =
    withMonthDays.length > 0
      ? withMonthDays.reduce((a, b) => ((a.monthAvgDays ?? Infinity) < (b.monthAvgDays ?? Infinity) ? a : b))
      : null

  // Team metrics
  const activeCount = stats.filter((a) => a.isActive).length
  const allDays = withDays.map((a) => a.avgDays!)
  const globalAvg = allDays.length > 0 ? allDays.reduce((a, b) => a + b, 0) / allDays.length : null

  const allApproved = agents.flatMap((a) =>
    a.clientRecords.filter((r) => r.status === 'APPROVED' && r.approvedAt),
  )
  const e2eDays =
    allApproved.length > 0
      ? allApproved
          .map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          .reduce((a, b) => a + b, 0) / allApproved.length
      : null

  const zeroSuccess = stats.filter((a) => a.totalClients > 0 && a.approvedClients === 0).length

  // Low success (<85%, min 3 clients)
  const lowSuccess: CockpitLowSuccessAgent[] = stats
    .filter((a) => a.totalClients >= 3 && a.successRate < ATTENTION_SUCCESS_THRESHOLD)
    .map((a) => ({
      id: a.id,
      name: a.name,
      displayTier: getAgentDisplayTier(a.starLevel, a.leadershipTier),
      successRate: Math.round(a.successRate * 100),
      totalClients: a.totalClients,
      approvedClients: a.approvedClients,
    }))
    .sort((a, b) => a.successRate - b.successRate)

  // Insights
  const insights: CockpitSmartInsight[] = []
  if (zeroSuccess > 0) {
    insights.push({
      id: 'zero-success',
      text: `${zeroSuccess} agent${zeroSuccess !== 1 ? 's' : ''} with clients but zero approvals`,
      severity: zeroSuccess > 2 ? 'critical' : 'warning',
    })
  }
  if (globalAvg !== null && globalAvg > 14) {
    insights.push({
      id: 'slow-overall',
      text: `Average ${Math.round(globalAvg)} days to approve — consider process improvements`,
      severity: 'warning',
    })
  }
  const inactive = stats.filter((a) => !a.isActive).length
  if (inactive > 0) {
    insights.push({
      id: 'inactive-agents',
      text: `${inactive} agent${inactive !== 1 ? 's' : ''} with no activity in ${STALE_AGENT_DAYS} days`,
      severity: inactive > 3 ? 'warning' : 'info',
    })
  }

  return {
    ranking: {
      mostClients: mostClients ? { name: mostClients.name, count: mostClients.approvedClients } : null,
      fastestAgent:
        fastest && fastest.avgDays !== null
          ? { name: fastest.name, avgDays: Math.round(fastest.avgDays * 10) / 10 }
          : null,
      monthMostClients: monthMost ? { name: monthMost.name, count: monthMost.monthApproved } : null,
      monthFastestAgent:
        monthFastest && monthFastest.monthAvgDays !== null
          ? { name: monthFastest.name, avgDays: Math.round(monthFastest.monthAvgDays * 10) / 10 }
          : null,
    },
    teamMetrics: {
      totalAgents: agents.length,
      activeAgents: activeCount,
      globalAvgDays: globalAvg !== null ? Math.round(globalAvg * 10) / 10 : null,
      globalEndToEndDays: e2eDays !== null ? Math.round(e2eDays * 10) / 10 : null,
      zeroSuccessCount: zeroSuccess,
    },
    lowSuccessAgents: lowSuccess,
    insights,
  }
}

// ── Onboarding Bottleneck ───────────────────────────────────────────

const STEP_LABELS: Record<number, string> = {
  1: 'Pre-Qual',
  2: 'Awaiting Device',
  3: 'Platforms',
  4: 'Contract',
}

function buildOnboardingBottleneck(
  stepEvents: { metadata: unknown; createdAt: Date }[],
  drafts: {
    id: string
    firstName: string | null
    lastName: string | null
    step: number
    updatedAt: Date
    deviceReservationDate: string | null
    closer: { id: string; name: string }
    phoneAssignments: { id: string }[]
  }[],
  signedOutCount: number,
  distinctPhoneCount: number,
  deviceReservations: number,
  overdueDeviceCount: number,
  approvedClients: {
    id: string
    firstName: string | null
    lastName: string | null
    approvedAt: Date | null
    platformData: unknown
    closer: { id: string; name: string }
  }[],
  txByClientPlatform: { clientRecordId: string; platformType: string | null; type: string; _sum: { amount: unknown } }[],
  now: Date,
): CockpitOnboardingBottleneck {
  // Step dwell from STEP_ADVANCED events
  const eventsByClient = new Map<string, { fromStep: number; toStep: number; at: Date }[]>()
  for (const ev of stepEvents) {
    const meta = ev.metadata as { clientRecordId?: string; fromStep?: number; toStep?: number } | null
    if (!meta?.clientRecordId || meta.fromStep === undefined || meta.toStep === undefined) continue
    if (!eventsByClient.has(meta.clientRecordId)) eventsByClient.set(meta.clientRecordId, [])
    eventsByClient.get(meta.clientRecordId)!.push({ fromStep: meta.fromStep, toStep: meta.toStep, at: ev.createdAt })
  }

  const stepDwells = new Map<number, number[]>()
  for (const [, events] of eventsByClient) {
    events.sort((a, b) => a.at.getTime() - b.at.getTime())
    for (let i = 0; i < events.length - 1; i++) {
      const days = (events[i + 1].at.getTime() - events[i].at.getTime()) / (1000 * 60 * 60 * 24)
      const step = events[i].toStep
      if (!stepDwells.has(step)) stepDwells.set(step, [])
      stepDwells.get(step)!.push(days)
    }
  }

  // Group drafts by step
  const draftsByStep = new Map<number, typeof drafts>()
  for (const d of drafts) {
    if (!draftsByStep.has(d.step)) draftsByStep.set(d.step, [])
    draftsByStep.get(d.step)!.push(d)
  }

  const stepPipeline: CockpitStepPipeline[] = [1, 2, 3, 4].map((step) => {
    const stepDrafts = draftsByStep.get(step) ?? []
    const dwells = stepDwells.get(step) ?? []
    const avgDays = dwells.length > 0 ? dwells.reduce((a, b) => a + b, 0) / dwells.length : 0

    let stuckCount = 0
    for (const d of stepDrafts) {
      const daysSince = (now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince >= STUCK_NO_PROGRESS_DAYS) {
        stuckCount++
      } else if (step === 2 && d.deviceReservationDate && d.phoneAssignments.length === 0) {
        const waitDays =
          (now.getTime() - new Date(d.deviceReservationDate).getTime()) / (1000 * 60 * 60 * 24)
        if (waitDays >= STUCK_DEVICE_WAIT_DAYS) stuckCount++
      }
    }

    return {
      step,
      label: STEP_LABELS[step] ?? `Step ${step}`,
      stuckCount,
      avgDays: Math.round(avgDays * 10) / 10,
      totalInStep: stepDrafts.length,
    }
  })

  // Pipeline avg = sum of all step avg days
  const pipelineAvgDays = stepPipeline.reduce((s, p) => s + p.avgDays, 0)
  const pipelineAvgRounded = Math.round(pipelineAvgDays * 10) / 10

  // Bottleneck = step with highest avg time
  let bottleneckStep: number | null = null
  let bottleneckPct = 0
  if (pipelineAvgDays > 0) {
    const maxStep = stepPipeline.reduce((max, s) => (s.avgDays > max.avgDays ? s : max))
    if (maxStep.avgDays > 0) {
      bottleneckStep = maxStep.step
      bottleneckPct = Math.round((maxStep.avgDays / pipelineAvgDays) * 100)
    }
  }

  // Unused accounts: APPROVED clients with registered platforms but $0 transactions
  const clientTxPlatforms = new Map<string, Set<string>>()
  for (const row of txByClientPlatform) {
    const p = row.platformType ?? ''
    if (toNum(row._sum.amount) > 0) {
      if (!clientTxPlatforms.has(row.clientRecordId)) clientTxPlatforms.set(row.clientRecordId, new Set())
      clientTxPlatforms.get(row.clientRecordId)!.add(p)
    }
  }

  const unusedAccounts: CockpitUnusedAccount[] = []
  for (const client of approvedClients) {
    if (!client.approvedAt) continue
    const daysSince = (now.getTime() - client.approvedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 1) continue

    const pd = client.platformData as Record<string, { status?: string }> | null
    if (!pd) continue

    const activePlatforms = clientTxPlatforms.get(client.id) ?? new Set()

    for (const [key, entry] of Object.entries(pd)) {
      if (!entry || typeof entry !== 'object') continue
      const platformType = key.toUpperCase().replace(/\s+/g, '_')
      if (activePlatforms.has(platformType)) continue
      const pInfo = (PLATFORM_INFO as Record<string, { name: string } | undefined>)[platformType]
      if (pInfo) {
        unusedAccounts.push({
          clientId: client.id,
          clientName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
          platform: platformType,
          platformName: pInfo.name,
          daysSinceApproval: Math.round(daysSince),
        })
      }
    }
  }

  // Insights
  const insights: CockpitSmartInsight[] = []
  const totalDrafts = drafts.length
  if (totalDrafts > 0) {
    const bottleneckInfo = stepPipeline.reduce((max, s) => (s.totalInStep > max.totalInStep ? s : max))
    if (bottleneckInfo.totalInStep > 0) {
      insights.push({
        id: 'bottleneck',
        text: `Step ${bottleneckInfo.step} (${bottleneckInfo.label}) is the bottleneck — ${bottleneckInfo.totalInStep} clients, ${bottleneckInfo.stuckCount} stuck`,
        severity: bottleneckInfo.stuckCount > 2 ? 'warning' : 'info',
      })
    }
  }
  if (deviceReservations > 0) {
    insights.push({
      id: 'device-need',
      text: `${deviceReservations} client${deviceReservations !== 1 ? 's' : ''} waiting for device — need ${deviceReservations} phones this week`,
      severity: deviceReservations > 3 ? 'warning' : 'info',
    })
  }
  if (unusedAccounts.length > 0) {
    insights.push({
      id: 'unused-accounts',
      text: `${unusedAccounts.length} platform account${unusedAccounts.length !== 1 ? 's' : ''} with $0 balance post-approval`,
      severity: unusedAccounts.length > 5 ? 'warning' : 'info',
    })
  }

  return {
    stepPipeline,
    pipelineAvgDays: pipelineAvgRounded,
    bottleneckStep,
    bottleneckPct,
    devices: {
      waitingForDevice: deviceReservations,
      devicesOut: signedOutCount,
      totalDevices: distinctPhoneCount,
      needThisWeek: deviceReservations,
      overdue: overdueDeviceCount,
    },
    unusedAccounts,
    insights,
  }
}
