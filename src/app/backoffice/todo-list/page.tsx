import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getActionHubData } from '@/backend/data/action-hub'
import { ActionHubView } from './_components/action-hub-view'
import type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  ActionHubTodo,
  FundAllocationEntry,
} from '@/types/backend-types'

export default async function BackofficeActionHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Fetch all action hub data in parallel
  let data: Awaited<ReturnType<typeof getActionHubData>> | null = null
  try {
    data = await getActionHubData()
  } catch (e) {
    console.error('[action-hub] data fetch error:', e)
  }

  const now = new Date()

  // Compute KPIs from real data
  const overdueTodosCount = data?.pendingTodos.filter(
    (t) => new Date(t.dueDate) < now,
  ).length ?? 0

  const kpis: ActionHubKPIs = {
    pendingTodos: data?.pendingTodos.length ?? 0,
    overdueTodos: overdueTodosCount,
    overdueDevices: data?.overdueDevices.length ?? 0,
    todayAllocations: data?.todayAllocations.length ?? 0,
    readyToApprove: data?.submittedDrafts.length ?? 0,
    unconfirmedAllocations: data?.unconfirmedAllocations ?? 0,
  }

  // Map overdue devices
  const overdueDevices: OverdueDevice[] = (data?.overdueDevices ?? []).map((d) => {
    const dueAt = new Date(d.dueBackAt)
    const diffMs = now.getTime() - dueAt.getTime()
    const daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const clientName = [d.clientDraft?.firstName, d.clientDraft?.lastName].filter(Boolean).join(' ') || 'Unknown'
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

  // Map pending todos
  const pendingTodos: ActionHubTodo[] = (data?.pendingTodos ?? []).map((t) => {
    const dueDate = new Date(t.dueDate)
    const diffMs = dueDate.getTime() - now.getTime()
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const clientName = [
      t.clientDraft?.firstName ?? t.client?.firstName,
      t.clientDraft?.lastName ?? t.client?.lastName,
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
      draftId: t.clientDraftId ?? '',
      source: t.source,
    }
  })

  // Map fund allocations
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
  }))

  // Build daily rundown blocks with live counts
  const deviceReservationCount = data?.deviceReservations.length ?? 0
  const emailAutoTodosToday = pendingTodos.filter((t) => t.source === 'EMAIL_AUTO').length
  const unconfirmedCount = kpis.unconfirmedAllocations

  const dailyRundown: RundownBlock[] = [
    {
      label: 'Hours 1–2',
      phase: 'Opening',
      items: [
        {
          label: 'Check platform balances & record fund allocations',
          count: kpis.todayAllocations,
          description: `${kpis.todayAllocations} recorded today`,
        },
        {
          label: 'Review overdue devices',
          count: kpis.overdueDevices,
          link: '#overdue-devices',
          description: `${kpis.overdueDevices} agent${kpis.overdueDevices !== 1 ? 's' : ''} overdue`,
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
          link: '#pending-todos',
          description: `${emailAutoTodosToday} auto-created from email today`,
        },
      ],
    },
    {
      label: 'Hours 2–4',
      phase: 'Core Operations',
      items: [
        {
          label: 'Work through pending todos',
          count: kpis.pendingTodos,
          link: '#pending-todos',
          description: `${kpis.pendingTodos} open${overdueTodosCount > 0 ? `, ${overdueTodosCount} overdue` : ''}`,
        },
        {
          label: 'Assign devices to reservations',
          count: deviceReservationCount,
          link: '/backoffice/sales-interaction',
          description: `${deviceReservationCount} waiting`,
        },
        {
          label: 'Call agents — follow up on overdue items',
        },
        {
          label: 'Call partners',
        },
      ],
    },
    {
      label: 'Hours 4–6',
      phase: 'Closing',
      items: [
        {
          label: 'Final device return check',
          link: '#overdue-devices',
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
          description: `${unconfirmedCount} unconfirmed allocation${unconfirmedCount !== 1 ? 's' : ''}`,
        },
        {
          label: "Check tomorrow's due dates",
          count: data?.tomorrowDueTodos ?? 0,
          description: `${data?.tomorrowDueTodos ?? 0} todo${(data?.tomorrowDueTodos ?? 0) !== 1 ? 's' : ''} due tomorrow`,
        },
      ],
    },
  ]

  return (
    <ActionHubView
      userName={session.user.name ?? 'User'}
      userRole={session.user.role as string}
      kpis={kpis}
      dailyRundown={dailyRundown}
      overdueDevices={overdueDevices}
      pendingTodos={pendingTodos}
      todayAllocations={todayAllocations}
      yesterdayAllocCount={data?.yesterdayAllocCount ?? 0}
      timeline={data?.recentTimeline ?? []}
    />
  )
}
