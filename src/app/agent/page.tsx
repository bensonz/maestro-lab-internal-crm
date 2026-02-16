import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import {
  getAgentDashboardStats,
  getAgentClientStats,
  getAgentPriorityActions,
  getAgentTeamRanking,
} from '@/backend/data/agent'
import { getCommissionTierInfo } from '@/backend/services/commission'
import { getAgentKPIs } from '@/backend/services/agent-kpis'
import { HeroBanner } from './_components/dashboard/hero-banner'
import { DoNow } from './_components/dashboard/do-now'
import { Pipeline, Scorecard } from './_components/dashboard/pipeline-scorecard'

// ── Page ─────────────────────────────────────────────────────────────────

export default async function AgentDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = session.user.id

  const [stats, tierInfo, clientStats, priorityActions, kpis, ranking] =
    await Promise.all([
      getAgentDashboardStats(userId),
      getCommissionTierInfo(userId),
      getAgentClientStats(userId),
      getAgentPriorityActions(userId),
      getAgentKPIs(userId),
      getAgentTeamRanking(userId),
    ])

  return (
    <div className="space-y-5 p-6 animate-fade-in" data-testid="agent-dashboard">
      {/* ── Hero Banner: Money + Level ── */}
      <HeroBanner
        totalEarnings={stats.earnings}
        pendingPayout={stats.pendingPayout}
        thisMonthEarnings={stats.thisMonthEarnings}
        earningsChange={stats.earningsChange}
        starLevel={tierInfo.starLevel}
        approvedClients={tierInfo.approvedCount}
        clientsToNextTier={tierInfo.clientsToNextTier}
        successRate={kpis.successRate}
        percentile={ranking.percentile}
      />

      {/* ── Do Now: Urgent Actions ── */}
      <DoNow actions={priorityActions} />

      {/* ── Pipeline + Scorecard ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Pipeline
          prequal={clientStats.prequal}
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
          <span className="font-mono">Agent #{session.user.id.slice(-4)}</span>
          <span>&bull;</span>
          <span>{clientStats.total} clients</span>
          <span>&bull;</span>
          <span>{stats.pendingTasks} pending tasks</span>
        </div>
      </footer>
    </div>
  )
}
