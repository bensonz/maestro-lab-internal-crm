import { requireAdmin } from '../_require-admin'
import { CommissionsView } from './_components/commissions-view'
import { getCommissionOverview, getPendingPayouts, getAgentLeaderboard } from '@/backend/data/bonus-pools'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import prisma from '@/backend/prisma/client'

export default async function CommissionsPage() {
  await requireAdmin()

  let overview = { totalPools: 0, totalDistributed: 0, totalPending: 0, totalRecycled: 0, pools: [] as Awaited<ReturnType<typeof getCommissionOverview>>['pools'] }
  let pendingPayoutsRaw: Awaited<ReturnType<typeof getPendingPayouts>> = []
  let leaderboardRaw: Awaited<ReturnType<typeof getAgentLeaderboard>> = []
  let tierBreakdown: { tier: string; count: number }[] = []

  try {
    ;[overview, pendingPayoutsRaw, leaderboardRaw] = await Promise.all([
      getCommissionOverview(),
      getPendingPayouts(),
      getAgentLeaderboard(),
    ])

    // Build tier breakdown from all agents
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT', isActive: true },
      select: { starLevel: true },
    })
    const tierCounts = new Map<number, number>()
    for (const a of agents) {
      tierCounts.set(a.starLevel, (tierCounts.get(a.starLevel) || 0) + 1)
    }
    tierBreakdown = Array.from(tierCounts.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, count]) => ({
        tier: level === 0 ? 'rookie' : `${level}-star`,
        count,
      }))
  } catch {
    // Database not available — continue with empty data
  }

  // Map pools to the view's expected shape
  const recentPools = overview.pools.slice(0, 20).map((p) => ({
    id: p.id,
    clientName: p.clientName,
    closerName: p.closerName,
    closerStarLevel: p.closerStarLevel,
    status: p.status,
    distributedSlices: p.distributedSlices,
    recycledSlices: p.recycledSlices,
    createdAt: p.distributedAt?.toISOString() ?? new Date().toISOString(),
    allocations: p.allocations.map((a) => ({
      id: a.id,
      agentName: a.agentName,
      agentStarLevel: a.agentStarLevel,
      type: a.type,
      slices: a.slices,
      amount: a.amount,
      status: a.status,
    })),
  }))

  // Map pending payouts
  const pendingPayouts = pendingPayoutsRaw.map((a) => ({
    id: a.id,
    agentId: a.agentId,
    agentName: a.agent.name,
    agentStarLevel: a.agentStarLevel,
    clientName: `${a.pool.client.firstName} ${a.pool.client.lastName}`,
    type: a.type,
    slices: a.slices,
    amount: a.amount,
    createdAt: a.createdAt.toISOString(),
  }))

  // Map leaderboard
  const leaderboard = leaderboardRaw.slice(0, 10).map((e) => ({
    agentId: e.agentId,
    name: e.agentName,
    starLevel: e.starLevel,
    tier: e.starLevel === 0 ? 'rookie' : `${e.starLevel}-star`,
    totalEarned: e.totalEarned,
  }))

  const data = {
    totalPools: overview.totalPools,
    totalDistributed: overview.totalDistributed,
    totalRecycled: overview.totalRecycled,
    totalPending: overview.totalPending,
    tierBreakdown,
    recentPools,
    pendingPayouts,
    leaderboard,
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in" data-testid="commissions-page">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Commissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission rules, bonus pool history, agent tiers, and payout management
        </p>
      </div>

      <CommissionsView data={data} />
    </div>
  )
}
