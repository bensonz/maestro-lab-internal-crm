import {
  MOCK_CLIENT_STATS,
  MOCK_PRIORITY_ACTIONS,
  MOCK_KPIS,
  MOCK_RANKING,
} from '@/lib/mock-data'
import { HeroBanner } from './_components/dashboard/hero-banner'
import { DoNow } from './_components/dashboard/do-now'
import { Pipeline, Scorecard } from './_components/dashboard/pipeline-scorecard'
import { requireAgent } from './_require-agent'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { countApprovedClients } from '@/backend/data/clients'
import prisma from '@/backend/prisma/client'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'

// ── Page ─────────────────────────────────────────────────────────────────

export default async function AgentDashboard() {
  const agent = await requireAgent()

  // Fetch real earnings + star level from DB
  let earningsData = await getAgentEarnings(agent.id).catch(() => null)
  let approvedCount = await countApprovedClients(agent.id).catch(() => 0)
  let starLevel = 0

  try {
    const user = await prisma.user.findUnique({
      where: { id: agent.id },
      select: { starLevel: true },
    })
    starLevel = user?.starLevel ?? 0
  } catch {
    // DB not available
  }

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

  // Use real data for earnings, mock for everything else
  const clientStats = MOCK_CLIENT_STATS
  const priorityActions = MOCK_PRIORITY_ACTIONS
  const kpis = MOCK_KPIS
  const ranking = MOCK_RANKING

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
          pending={clientStats.pending}
          phoneIssued={clientStats.phoneIssued}
          inExecution={clientStats.inExecution}
          readyForApproval={clientStats.readyForApproval}
          approved={clientStats.approved}
          rejected={clientStats.rejected}
        />
        <Scorecard
          successRate={kpis.successRate}
          avgDaysToConvert={kpis.avgDaysToConvert}
          overdueTodos={kpis.overdueTodos}
          totalClients={clientStats.total}
          percentile={ranking.percentile}
        />
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border pt-4" data-testid="agent-footer">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Agent #{agent.id.slice(-4)}</span>
          <span>&bull;</span>
          <span>{clientStats.total} clients</span>
          <span>&bull;</span>
          <span>{kpis.pendingTodos} pending tasks</span>
        </div>
      </footer>
    </div>
  )
}
