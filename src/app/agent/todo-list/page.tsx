import { MOCK_TEAM_MEMBERS } from '@/lib/mock-data'
import { TodoPageClient } from './_components/todo-page-client'
import { requireAgent } from '../_require-agent'
import { getTodosByAgent } from '@/backend/data/todos'
import { getRecordsByCloser, getApprovedRecordsByCloser } from '@/backend/data/client-records'
import { getAgentEarnings } from '@/backend/data/bonus-pools'

export default async function TodoListPage() {
  const agent = await requireAgent()

  // Fetch real data from DB in parallel
  const [realTodosResult, realDrafts, realRecords, earningsResult] = await Promise.all([
    getTodosByAgent(agent.id).catch(() => []),
    getRecordsByCloser(agent.id).catch(() => []),
    getApprovedRecordsByCloser(agent.id).catch(() => []),
    getAgentEarnings(agent.id).catch(() => null),
  ])

  // Map real drafts and approved records to the shape expected by TodoPageClient
  const clientData = [
    ...realDrafts.map((d) => ({
      id: d.id,
      name: d.firstName && d.lastName
        ? `${d.firstName} ${d.lastName}`
        : d.firstName || 'Untitled Draft',
      intakeStatus: d.status === 'SUBMITTED' ? 'READY_FOR_APPROVAL' : 'IN_EXECUTION',
      nextTask: null as string | null,
      step: d.step,
      totalSteps: 4,
      deadline: null as string | null,
    })),
    ...realRecords
      .filter((r) => r.status !== 'DRAFT' && r.status !== 'SUBMITTED')
      .map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        intakeStatus: r.status === 'APPROVED' ? 'APPROVED' : r.status,
        nextTask: null as string | null,
        step: r.status === 'APPROVED' ? 1 : 0,
        totalSteps: 1,
        deadline: null as string | null,
      })),
  ]

  // Map real todos to pending tasks
  const now = Date.now()
  const pendingTasks = realTodosResult.map((t) => {
    const clientName = [
      t.clientRecord?.firstName,
      t.clientRecord?.lastName,
    ].filter(Boolean).join(' ') || 'Unknown'
    const daysUntil = Math.floor(
      (t.dueDate.getTime() - now) / (1000 * 60 * 60 * 24),
    )
    return {
      id: t.id,
      task: t.title,
      description: t.description || `${t.issueCategory} — ${clientName}`,
      client: clientName,
      clientId: t.clientRecordId ?? '',
      due: daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`,
      dueDate: t.dueDate.toISOString(),
      overdue: daysUntil < 0,
      stepNumber: t.clientRecord?.step ?? 1,
      createdAt: t.createdAt.toISOString(),
      extensionsUsed: 0,
      maxExtensions: 2,
      createdByName: t.createdBy.name,
      metadata: null,
    }
  })

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfDay)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const todoData = {
    todaysTasks: pendingTasks.filter((t) => new Date(t.dueDate) <= new Date(startOfDay.getTime() + 86400000)).length,
    thisWeek: pendingTasks.filter((t) => new Date(t.dueDate) <= endOfWeek).length,
    overdue: pendingTasks.filter((t) => t.overdue).length,
    completedToday: 0,
    pendingTasks,
  }

  // Build real earnings data
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const thisMonth = earningsResult
    ? earningsResult.allocations
        .filter((a) => new Date(a.createdAt) >= startOfMonth)
        .reduce((sum, a) => sum + a.amount, 0)
    : 0

  const formatEarningsDate = (d: Date) => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12 || 12
    return `${month}/${day}/${year} ${hours}${ampm}`
  }

  const earningsData = {
    totalEarnings: earningsResult?.totalEarned ?? 0,
    pendingPayout: earningsResult?.pendingAmount ?? 0,
    thisMonth,
    recentTransactions: earningsResult
      ? earningsResult.allocations.map((a) => {
          const clientName = a.clientName ?? 'Unknown'
          let description: string
          if (a.type === 'DIRECT') {
            description = `Direct bonus - ${clientName}`
          } else if (a.type === 'STAR_SLICE') {
            description = `Star slice - ${a.closerName ?? 'Unknown'} → ${clientName} (${a.slices} slices)`
          } else {
            description = `Backfill - ${a.closerName ?? 'Unknown'} → ${clientName} (${a.slices} slices)`
          }
          const status = a.status === 'PAID' ? 'Paid' : 'Issued'
          const date = formatEarningsDate(new Date(a.createdAt))
          return {
            id: a.id,
            client: clientName,
            description,
            amount: a.amount,
            status,
            date,
            rawDate: a.createdAt.toISOString?.() ?? new Date(a.createdAt).toISOString(),
          }
        })
      : [],
    commission: {
      totalEarned: earningsResult?.totalEarned ?? 0,
      pending: earningsResult?.pendingAmount ?? 0,
      paid: earningsResult?.paidAmount ?? 0,
      directBonuses: earningsResult?.directBonuses ?? 0,
      starSlices: earningsResult?.starSliceBonuses ?? 0,
    },
    overrides: { overrideTotal: 0, ownTotal: earningsResult?.totalEarned ?? 0 },
  }

  return (
    <TodoPageClient
      todoData={todoData}
      clients={clientData}
      agentName={agent.name ?? 'Agent'}
      agentStarLevel={(agent as { starLevel?: number }).starLevel ?? 0}
      earningsData={earningsData}
      teamMembers={MOCK_TEAM_MEMBERS}
    />
  )
}
