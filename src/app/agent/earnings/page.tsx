import { MOCK_HIERARCHY } from '@/lib/mock-data'
import { EarningsView } from './_components/earnings-view'
import { requireAgent } from '../_require-agent'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { computeAgentKPIs } from '@/backend/services/agent-kpis'
import type { AllocationLine } from '@/types/backend-types'

function formatEarningsDate(d: Date): string {
  const month = d.getMonth() + 1
  const day = d.getDate()
  const year = d.getFullYear()
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${month}/${day}/${year} ${hours}${ampm}`
}

function buildDescription(a: AllocationLine): string {
  const clientShort = a.clientName
    ? `${a.clientName.split(' ')[0]} ${(a.clientName.split(' ')[1] ?? '')[0] ?? ''}`.trim()
    : 'Unknown'
  if (a.type === 'DIRECT') {
    return `Direct bonus - ${clientShort}`
  }
  const closerShort = a.closerName ?? 'Unknown'
  if (a.type === 'STAR_SLICE') {
    return `Star slice - ${closerShort} → ${clientShort} (${a.slices} slices)`
  }
  return `Backfill - ${closerShort} → ${clientShort} (${a.slices} slices)`
}

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
        client: a.clientName ?? 'Unknown',
        description: buildDescription(a),
        amount: a.amount,
        status: a.status === 'PAID' ? 'Paid' : 'Issued',
        date: formatEarningsDate(new Date(a.createdAt)),
        rawDate: a.createdAt.toISOString?.() ?? new Date(a.createdAt).toISOString(),
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
