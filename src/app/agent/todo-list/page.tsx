import { MOCK_TEAM_MEMBERS } from '@/lib/mock-data'
import { TodoPageClient } from './_components/todo-page-client'
import { requireAgent } from '../_require-agent'
import { getTodosByAgent } from '@/backend/data/todos'
import { getDraftsByCloser } from '@/backend/data/client-drafts'
import { getClientsByCloser } from '@/backend/data/clients'
import { getAgentEarnings } from '@/backend/data/bonus-pools'

export default async function TodoListPage() {
  const agent = await requireAgent()

  // Fetch real data from DB in parallel
  const [realTodosResult, realDrafts, realClients, earningsResult] = await Promise.all([
    getTodosByAgent(agent.id).catch(() => []),
    getDraftsByCloser(agent.id).catch(() => []),
    getClientsByCloser(agent.id).catch(() => []),
    getAgentEarnings(agent.id).catch(() => null),
  ])

  // Map real drafts and clients to the shape expected by TodoPageClient
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
    ...realClients
      .filter((c) => c.status !== 'PENDING')
      .map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        intakeStatus: c.status === 'APPROVED' ? 'APPROVED' : c.status,
        nextTask: null as string | null,
        step: c.status === 'APPROVED' ? 1 : 0,
        totalSteps: 1,
        deadline: null as string | null,
      })),
  ]

  // Map real todos to pending tasks
  const now = Date.now()
  const pendingTasks = realTodosResult.map((t) => {
    const clientName = [t.clientDraft.firstName, t.clientDraft.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown'
    const daysUntil = Math.floor(
      (t.dueDate.getTime() - now) / (1000 * 60 * 60 * 24),
    )
    return {
      id: t.id,
      task: t.title,
      description: t.description || `${t.issueCategory} — ${clientName}`,
      client: clientName,
      clientId: t.clientDraftId,
      due: daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`,
      dueDate: t.dueDate.toISOString(),
      overdue: daysUntil < 0,
      stepNumber: t.clientDraft.step,
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

  const earningsData = {
    totalEarnings: earningsResult?.totalEarned ?? 0,
    pendingPayout: earningsResult?.pendingAmount ?? 0,
    thisMonth,
    recentTransactions: earningsResult
      ? earningsResult.allocations.map((a) => ({
          id: a.id,
          client: a.agentName,
          description: a.type === 'DIRECT'
            ? 'Direct bonus'
            : a.type === 'STAR_SLICE'
              ? `Star slice (${a.slices} slices)`
              : `Backfill (${a.slices} slices)`,
          amount: a.amount,
          status: a.status === 'PAID' ? 'paid' : 'pending',
          date: a.paidAt
            ? new Date(a.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Pending',
          rawDate: a.paidAt?.toISOString() ?? new Date().toISOString(),
        }))
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
