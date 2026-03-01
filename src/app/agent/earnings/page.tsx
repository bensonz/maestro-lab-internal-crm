import { EarningsView } from './_components/earnings-view'
import { requireAgent } from '../_require-agent'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { getAgentHierarchy } from '@/backend/data/users'
import { computeAgentKPIs } from '@/backend/services/agent-kpis'

export default async function EarningsPage() {
  const agent = await requireAgent()

  const [earningsData, kpis, hierarchy] = await Promise.all([
    getAgentEarnings(agent.id).catch(() => null),
    computeAgentKPIs(agent.id).catch(() => ({
      totalClients: 0, approvedClients: 0, rejectedClients: 0,
      inProgressClients: 0, delayedClients: 0, successRate: 0,
      delayRate: 0, extensionRate: 0, avgDaysToInitiate: null,
      avgDaysToConvert: null, pendingTodos: 0, overdueTodos: 0,
    })),
    getAgentHierarchy(agent.id).catch(() => null),
  ])

  // Build transactions from real allocations, or fall back to empty
  const formatEarningsDate = (d: Date) => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12 || 12
    return `${month}/${day}/${year} ${hours}${ampm}`
  }

  const transactions = earningsData
    ? earningsData.allocations.map((a) => {
        const clientName = a.clientName ?? 'Unknown'
        // Description: show client name for DIRECT, team member + client for STAR_SLICE/BACKFILL
        let description: string
        if (a.type === 'DIRECT') {
          description = `Direct bonus - ${clientName}`
        } else if (a.type === 'STAR_SLICE') {
          description = `Star slice - ${a.closerName ?? 'Unknown'} → ${clientName} (${a.slices} slices)`
        } else {
          description = `Backfill - ${a.closerName ?? 'Unknown'} → ${clientName} (${a.slices} slices)`
        }
        // Status: PAID → 'Paid', PENDING → 'Issued' (Withdrawable when ready)
        const status = a.status === 'PAID' ? 'Paid' : 'Issued'
        // Date: always show createdAt in "2/28/2026 12am" format
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

  return <EarningsView earnings={earnings} kpis={kpis} hierarchy={hierarchy ?? null} />
}
