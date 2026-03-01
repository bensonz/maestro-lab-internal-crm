import { HeroBanner } from './_components/dashboard/hero-banner'
import { DoNow } from './_components/dashboard/do-now'
import { Pipeline, Scorecard } from './_components/dashboard/pipeline-scorecard'
import { requireAgent } from './_require-agent'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { countApprovedClients } from '@/backend/data/clients'
import prisma from '@/backend/prisma/client'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import { computeAgentKPIs } from '@/backend/services/agent-kpis'
import { getDraftsByCloser } from '@/backend/data/client-drafts'
import { getTodosByAgent } from '@/backend/data/todos'
import type { PriorityAction } from '@/types/backend-types'

// ── Page ─────────────────────────────────────────────────────────────────

export default async function AgentDashboard() {
  const agent = await requireAgent()

  // Fetch all real data in parallel
  const [earningsData, approvedCount, kpis, user, drafts, todos] = await Promise.all([
    getAgentEarnings(agent.id).catch(() => null),
    countApprovedClients(agent.id).catch(() => 0),
    computeAgentKPIs(agent.id).catch(() => ({
      totalClients: 0, approvedClients: 0, rejectedClients: 0,
      inProgressClients: 0, delayedClients: 0, successRate: 0,
      delayRate: 0, extensionRate: 0, avgDaysToInitiate: null as number | null,
      avgDaysToConvert: null as number | null, pendingTodos: 0, overdueTodos: 0,
    })),
    prisma.user.findUnique({
      where: { id: agent.id },
      select: { starLevel: true },
    }).catch(() => null),
    getDraftsByCloser(agent.id).catch(() => [] as Awaited<ReturnType<typeof getDraftsByCloser>>),
    getTodosByAgent(agent.id).catch(() => [] as Awaited<ReturnType<typeof getTodosByAgent>>),
  ])

  const starLevel = user?.starLevel ?? 0
  const nextThreshold = STAR_THRESHOLDS[Math.min(starLevel + 1, 4)]
  const clientsToNextTier = starLevel >= 4 ? null : Math.max(0, nextThreshold.min - approvedCount)

  // Compute this month's earnings from allocations
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEarnings = earningsData
    ? earningsData.allocations
        .filter((a) => new Date(a.createdAt) >= startOfMonth)
        .reduce((sum, a) => sum + a.amount, 0)
    : 0

  // Build real priority actions from todos
  const priorityActions: PriorityAction[] = todos.map((t) => {
    const clientName = [t.clientDraft?.firstName, t.clientDraft?.lastName].filter(Boolean).join(' ') || 'Unknown'
    const daysUntil = Math.floor((t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    let type: PriorityAction['type'] = 'needs-info'
    if (daysUntil < 0) type = 'overdue'
    else if (daysUntil === 0) type = 'due-today'
    else if (daysUntil <= 2) type = 'deadline-approaching'
    return {
      type,
      title: t.title,
      clientName,
      clientId: t.clientDraftId,
      link: '/agent/todo-list',
      createdAt: t.createdAt,
    }
  })

  // Compute client pipeline stats from real data
  const draftCount = drafts.length
  const submittedCount = drafts.filter((d) => d.status === 'SUBMITTED').length
  const inProgressDraftCount = draftCount - submittedCount

  const ranking = { percentile: 0 }

  return (
    <div className="space-y-5 p-6 animate-fade-in" data-testid="agent-dashboard">
      {/* ── Hero Banner: Money + Level ── */}
      <HeroBanner
        totalEarnings={earningsData?.totalEarned ?? 0}
        pendingPayout={earningsData?.pendingAmount ?? 0}
        thisMonthEarnings={thisMonthEarnings}
        earningsChange={0}
        starLevel={starLevel}
        approvedClients={approvedCount}
        clientsToNextTier={clientsToNextTier}
        successRate={kpis.successRate}
        percentile={ranking.percentile}
      />

      {/* ── Do Now: Urgent Actions ── */}
      <DoNow actions={priorityActions} />

      {/* ── Pipeline + Scorecard ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Pipeline
          pending={submittedCount}
          phoneIssued={0}
          inExecution={inProgressDraftCount}
          readyForApproval={submittedCount}
          approved={approvedCount}
          rejected={kpis.rejectedClients}
        />
        <Scorecard
          successRate={kpis.successRate}
          avgDaysToConvert={kpis.avgDaysToConvert ?? 0}
          overdueTodos={kpis.overdueTodos}
          totalClients={kpis.totalClients + draftCount}
          percentile={ranking.percentile}
        />
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border pt-4" data-testid="agent-footer">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Agent #{agent.id.slice(-4)}</span>
          <span>&bull;</span>
          <span>{kpis.totalClients + draftCount} clients</span>
          <span>&bull;</span>
          <span>{kpis.pendingTodos} pending tasks</span>
        </div>
      </footer>
    </div>
  )
}
