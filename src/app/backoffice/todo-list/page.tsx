import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getActionHubData, getTraderReportData } from '@/backend/data/action-hub'
import { ActionHubView } from './_components/action-hub-view'
import { getBusinessDaysElapsed } from '@/lib/clearing-windows'
import type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  DeviceReservation,
  ActionHubTodo,
  FundAllocationEntry,
  FundClearingUrgency,
  MotivationData,
  ProcessedEmailEntry,
  DiscrepancyEntry,
  TraderReportData,
} from '@/types/backend-types'

function computeClearingUrgency(
  alloc: { confirmationStatus: string; confirmedById: string | null; expectedArrivalAt: Date | null; createdAt: Date },
  now: Date,
  stuckBusinessDays: number,
): FundClearingUrgency {
  if (alloc.confirmationStatus === 'CONFIRMED' && !alloc.confirmedById) return 'arrived'
  if (alloc.confirmationStatus === 'DISCREPANCY') return 'discrepancy'
  // UNCONFIRMED: check clearing window
  if (alloc.expectedArrivalAt) {
    const eta = new Date(alloc.expectedArrivalAt).getTime()
    const nowMs = now.getTime()
    if (eta < nowMs) {
      // Past expected arrival — check if stuck (3+ business days)
      const bizDays = getBusinessDaysElapsed(new Date(alloc.createdAt), now)
      if (bizDays >= stuckBusinessDays) return 'stuck'
      return 'expected-soon' // overdue but not yet stuck — treat as urgent
    }
    const hoursRemaining = (eta - nowMs) / (1000 * 60 * 60)
    if (hoursRemaining <= 2) return 'expected-soon'
    return 'in-transit'
  }
  // No expectedArrivalAt — check by creation date for old records
  const bizDays = getBusinessDaysElapsed(new Date(alloc.createdAt), now)
  if (bizDays >= stuckBusinessDays) return 'stuck'
  return 'in-transit'
}

function computeClearingTimeLabel(
  urgency: FundClearingUrgency,
  expectedArrivalAt: Date | null,
  confirmedAt: Date | null,
  now: Date,
): string {
  if (urgency === 'arrived') {
    if (!confirmedAt) return 'Arrived'
    return formatTimestamp(new Date(confirmedAt))
  }
  if (urgency === 'discrepancy') return 'Mismatch'
  if (urgency === 'stuck') {
    const days = Math.ceil((now.getTime() - (expectedArrivalAt?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24))
    return `${days}d — check status`
  }
  if (expectedArrivalAt) {
    const diff = new Date(expectedArrivalAt).getTime() - now.getTime()
    const hours = Math.round(diff / (1000 * 60 * 60))
    if (hours <= 0) return 'Due now'
    if (hours < 24) return `~${hours}h`
    return `~${Math.round(hours / 24)}d`
  }
  return 'Pending'
}

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function BackofficeActionHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Fetch action hub data + trader report data in parallel
  let data: Awaited<ReturnType<typeof getActionHubData>> | null = null
  let traderReportData: TraderReportData | null = null
  try {
    const [hubData, reportData] = await Promise.all([
      getActionHubData(),
      getTraderReportData().catch((e) => {
        console.error('[trader-report] data fetch error:', e)
        return null
      }),
    ])
    data = hubData
    traderReportData = reportData
  } catch (e) {
    console.error('[action-hub] data fetch error:', e)
  }

  const now = new Date()

  // Map all pending todos
  const allTodos: ActionHubTodo[] = (data?.pendingTodos ?? []).map((t) => {
    const dueDate = new Date(t.dueDate)
    const diffMs = dueDate.getTime() - now.getTime()
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const clientName = [
      t.clientRecord?.firstName,
      t.clientRecord?.lastName,
    ].filter(Boolean).join(' ') || 'Unknown'
    return {
      id: t.id,
      title: t.title,
      issueCategory: t.issueCategory,
      clientName,
      agentId: t.assignedTo.id,
      agentName: t.assignedTo.name,
      dueDate,
      daysUntilDue,
      overdue: daysUntilDue < 0,
      clientRecordId: t.clientRecordId ?? '',
      source: t.source,
    }
  })

  // Compute KPIs from real data
  const overdueTodosCount = allTodos.filter((t) => t.overdue).length

  const kpis: ActionHubKPIs = {
    pendingTodos: allTodos.length,
    overdueTodos: overdueTodosCount,
    overdueDevices: data?.overdueDevices.length ?? 0,
    deviceReservations: data?.deviceReservations.length ?? 0,
    todayAllocations: data?.todayAllocations.length ?? 0,
    readyToApprove: data?.submittedDrafts.length ?? 0,
    unconfirmedAllocations: data?.unconfirmedAllocations ?? 0,
    onboardingTodos: allTodos.filter((t) => t.issueCategory === 'Collect Debit Card Information').length,
  }

  // Map overdue devices
  const overdueDevices: OverdueDevice[] = (data?.overdueDevices ?? []).map((d) => {
    const dueAt = new Date(d.dueBackAt)
    const diffMs = now.getTime() - dueAt.getTime()
    const daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const clientName = [d.clientRecord?.firstName, d.clientRecord?.lastName].filter(Boolean).join(' ') || 'Unknown'
    return {
      assignmentId: d.id,
      phoneNumber: d.phoneNumber,
      agentId: d.agent.id,
      agentName: d.agent.name,
      clientName,
      dueBackAt: dueAt,
      daysOverdue,
    }
  })

  // Map device reservations
  const deviceReservations: DeviceReservation[] = (data?.deviceReservations ?? []).map((r) => {
    const clientName = [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unknown'
    return {
      clientRecordId: r.id,
      clientName,
      agentId: r.closer?.id ?? '',
      agentName: r.closer?.name ?? 'Unassigned',
      requestedAt: new Date(r.deviceReservationDate!),
      step: r.step,
    }
  })

  // Map ALL fund allocations (Panel 1: Fund Record — shows everything)
  const todayAllocations: FundAllocationEntry[] = (data?.todayAllocations ?? []).map((a) => ({
    id: a.id,
    amount: Number(a.amount),
    platform: a.platform,
    direction: a.direction,
    notes: a.notes,
    recordedBy: a.recordedBy.name,
    createdAt: a.createdAt,
    confirmationStatus: a.confirmationStatus,
    confirmedAmount: a.confirmedAmount ? Number(a.confirmedAmount) : null,
    confirmedAt: a.confirmedAt,
    confirmedBy: a.confirmedBy?.name ?? null,
    gmailMatched: a.confirmationStatus === 'CONFIRMED' && !a.confirmedById,
    destinationPlatform: a.destinationPlatform,
    transferMethod: a.transferMethod,
    expectedArrivalAt: a.expectedArrivalAt,
    urgency: 'in-transit' as FundClearingUrgency,
    timeLabel: '',
  }))

  // Legacy: Unconfirmed allocations (for header/trader report)
  const unconfirmedAllocations = todayAllocations.filter(
    (a) => a.confirmationStatus === 'UNCONFIRMED' || a.confirmationStatus === 'DISCREPANCY',
  )

  // Legacy: Discrepancy allocations (for header/trader report)
  const discrepancyAllocations: DiscrepancyEntry[] = (data?.discrepancyAllocations ?? []).map((a) => ({
    id: a.id,
    amount: Number(a.amount),
    platform: a.platform,
    direction: a.direction,
    notes: a.notes,
    recordedBy: a.recordedBy.name,
    createdAt: a.createdAt,
    discrepancyNotes: null,
  }))

  // Clearing Status: Verification allocations with urgency computation
  const URGENCY_ORDER: Record<FundClearingUrgency, number> = {
    stuck: 0,
    discrepancy: 1,
    'expected-soon': 2,
    'in-transit': 3,
    arrived: 4,
  }

  const stuckThreshold = 3 // business days (from CLEARING_STUCK_BUSINESS_DAYS default)

  const verificationAllocations: FundAllocationEntry[] = (data?.verificationAllocations ?? [])
    .map((a) => {
      const urgency = computeClearingUrgency(a, now, stuckThreshold)
      const timeLabel = computeClearingTimeLabel(urgency, a.expectedArrivalAt, a.confirmedAt, now)
      return {
        id: a.id,
        amount: Number(a.amount),
        platform: a.platform,
        direction: a.direction,
        notes: a.notes,
        recordedBy: a.recordedBy.name,
        createdAt: a.createdAt,
        confirmationStatus: a.confirmationStatus,
        confirmedAmount: a.confirmedAmount ? Number(a.confirmedAmount) : null,
        confirmedAt: a.confirmedAt,
        confirmedBy: a.confirmedBy?.name ?? null,
        gmailMatched: a.confirmationStatus === 'CONFIRMED' && !a.confirmedById,
        destinationPlatform: a.destinationPlatform,
        transferMethod: a.transferMethod,
        expectedArrivalAt: a.expectedArrivalAt,
        urgency,
        timeLabel,
      }
    })
    .sort((a, b) => {
      const orderDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
      if (orderDiff !== 0) return orderDiff
      const aEta = a.expectedArrivalAt?.getTime() ?? Infinity
      const bEta = b.expectedArrivalAt?.getTime() ?? Infinity
      return aEta - bEta
    })

  // Panel 4: Processed emails for insights
  const processedEmails: ProcessedEmailEntry[] = (data?.recentProcessedEmails ?? []).map((e) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    snippet: e.snippet,
    receivedAt: e.receivedAt,
    detectionType: e.detectionType,
    todoId: e.todoId,
    fundAllocationId: e.fundAllocationId,
  }))

  // Build daily rundown blocks with live counts
  const deviceReservationCount = data?.deviceReservations.length ?? 0
  const emailAutoTodosToday = allTodos.filter((t) => t.source === 'EMAIL_AUTO').length
  const unconfirmedCount = kpis.unconfirmedAllocations

  const dailyRundown: RundownBlock[] = [
    {
      label: 'Hours 1\u20132',
      phase: 'Opening',
      items: [
        {
          label: 'Check platform balances & record fund allocations',
          count: kpis.todayAllocations,
          description: `${kpis.todayAllocations} recorded today`,
        },
        {
          label: 'Review device management',
          count: kpis.overdueDevices + kpis.deviceReservations,
          link: '#device-management',
          description: `${kpis.overdueDevices} overdue, ${kpis.deviceReservations} pending`,
        },
        {
          label: 'Process pending client approvals',
          count: kpis.readyToApprove,
          link: '/backoffice/sales-interaction',
          description: `${kpis.readyToApprove} ready`,
        },
        {
          label: 'Review email-generated todos',
          count: emailAutoTodosToday,
          link: '#agent-contact',
          description: `${emailAutoTodosToday} auto-created from email today`,
        },
      ],
    },
    {
      label: 'Hours 2\u20134',
      phase: 'Core Operations',
      items: [
        {
          label: 'Work through pending todos',
          count: kpis.pendingTodos,
          link: '#agent-contact',
          description: `${kpis.pendingTodos} open${overdueTodosCount > 0 ? `, ${overdueTodosCount} overdue` : ''}`,
        },
        {
          label: 'Assign devices to reservations',
          count: deviceReservationCount,
          link: '/backoffice/sales-interaction',
          description: `${deviceReservationCount} waiting`,
        },
        {
          label: 'Call agents \u2014 follow up on overdue items',
        },
        {
          label: 'Call partners',
        },
      ],
    },
    {
      label: 'Hours 4\u20136',
      phase: 'Closing',
      items: [
        {
          label: 'Final device return check',
          link: '#device-management',
          count: kpis.overdueDevices,
        },
        {
          label: 'Verify all fund allocations recorded',
          count: kpis.todayAllocations,
          description: `${kpis.todayAllocations} recorded today`,
        },
        {
          label: 'Confirm fund allocations',
          count: unconfirmedCount,
          link: '#fund-verification',
          description: `${unconfirmedCount} unconfirmed`,
        },
        {
          label: "Check tomorrow's due dates",
          count: data?.tomorrowDueTodos ?? 0,
          description: `${data?.tomorrowDueTodos ?? 0} todo${(data?.tomorrowDueTodos ?? 0) !== 1 ? 's' : ''} due tomorrow`,
        },
      ],
    },
  ]

  // Motivation data
  const totalTodayTasks =
    kpis.pendingTodos +
    kpis.overdueDevices +
    kpis.deviceReservations +
    kpis.readyToApprove +
    kpis.unconfirmedAllocations
  const todayRemaining = totalTodayTasks
  const todayPct = totalTodayTasks === 0 ? 100 : Math.round(((0) / totalTodayTasks) * 100)

  const motivation: MotivationData = {
    streakDays: data?.streakDays ?? 0,
    longestStreak: data?.longestStreak ?? 0,
    yesterdayStats: data?.yesterdayStats ?? { todosCompleted: 0, clientsApproved: 0, fundsRecorded: 0 },
    todayProgress: {
      total: totalTodayTasks,
      remaining: todayRemaining,
      pct: todayPct,
    },
  }

  return (
    <ActionHubView
      userName={session.user.name ?? 'User'}
      userRole={session.user.role as string}
      kpis={kpis}
      motivation={motivation}
      dailyRundown={dailyRundown}
      todayAllocations={todayAllocations}
      yesterdayAllocCount={data?.yesterdayAllocCount ?? 0}
      overdueDevices={overdueDevices}
      deviceReservations={deviceReservations}
      verificationAllocations={verificationAllocations}
      unconfirmedAllocations={unconfirmedAllocations}
      discrepancyAllocations={discrepancyAllocations}
      lastGmailSync={data?.lastGmailSync ?? null}
      processedEmails={processedEmails}
      gmailMatchedCount={data?.gmailMatchedCount ?? 0}
      allTodos={allTodos}
      timeline={data?.recentTimeline ?? []}
      traderReportData={traderReportData}
    />
  )
}
