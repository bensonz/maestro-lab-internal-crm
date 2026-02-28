import { MOCK_HIERARCHY } from '@/lib/mock-data'
import { EarningsView } from './_components/earnings-view'
import { requireAgent } from '../_require-agent'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { computeAgentKPIs } from '@/backend/services/agent-kpis'

export default async function EarningsPage() {
  const agent = await requireAgent()

  const [earningsData, kpis] = await Promise.all([
    getAgentEarnings(agent.id).catch(() => null),
    computeAgentKPIs(agent.id).catch(() => ({
      totalClients: 0, approvedClients: 0, rejectedClients: 0,
      inProgressClients: 0, delayedClients: 0, successRate: 0,
      delayRate: 0, extensionRate: 0, avgDaysToInitiate: null,
      avgDaysToConvert: null, pendingTodos: 0, overdueTodos: 0,
    })),
  ])

  // Build transactions from real allocations, or fall back to empty
  const transactions = earningsData
    ? earningsData.allocations.map((a) => ({
        id: a.id,
        client: a.agentName,
        description: a.type === 'DIRECT'
          ? 'Direct bonus'
          : a.type === 'STAR_SLICE'
            ? `Star slice (${a.slices} slices)`
            : `Backfill (${a.slices} slices)`,
        amount: a.amount,
        status: a.status === 'PAID' ? 'Paid' : 'Pending',
        date: a.paidAt
          ? new Date(a.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Pending',
        rawDate: a.paidAt?.toISOString() ?? new Date().toISOString(),
      }))
    : []

  // Compute this month's earnings from allocations created in current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth = earningsData
    ? earningsData.allocations
        .filter((a) => new Date(a.createdAt) >= startOfMonth)
        .reduce((sum, a) => sum + a.amount, 0)
    : 0

  const earnings = {
    totalEarnings: earningsData?.totalEarned ?? 0,
    pendingPayout: earningsData?.pendingAmount ?? 0,
    thisMonth,
    recentTransactions: transactions,
  }

  return <EarningsView earnings={earnings} kpis={kpis} hierarchy={MOCK_HIERARCHY} />
}
