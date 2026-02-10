import prisma from '@/backend/prisma/client'
import { UserRole } from '@/types'

export async function getCommissionOverview() {
  const [
    totalPools,
    totalDistributed,
    recycledAgg,
    pendingAgg,
  ] = await Promise.all([
    prisma.bonusPool.count(),
    prisma.bonusPool.count({ where: { status: 'distributed' } }),
    prisma.bonusPool.aggregate({ _sum: { recycledSlices: true } }),
    prisma.bonusAllocation.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    }),
  ])

  // Agent tier breakdown
  const tierBreakdown = await prisma.user.groupBy({
    by: ['tier'],
    where: { role: UserRole.AGENT, isActive: true },
    _count: true,
  })

  // Recent bonus pools with allocations
  const recentPools = await prisma.bonusPool.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { firstName: true, lastName: true } },
      closer: { select: { name: true, starLevel: true } },
      allocations: {
        include: { agent: { select: { name: true, starLevel: true } } },
        orderBy: { amount: 'desc' },
      },
    },
  })

  // Pending payouts by agent
  const pendingPayouts = await prisma.bonusAllocation.findMany({
    where: { status: 'pending' },
    include: {
      agent: { select: { id: true, name: true, starLevel: true } },
      bonusPool: {
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Agent leaderboard (top 10 by total earned)
  const agentTotals = await prisma.bonusAllocation.groupBy({
    by: ['agentId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 10,
  })

  // Fetch agent names for leaderboard
  const agentIds = agentTotals.map((a) => a.agentId)
  const agents = agentIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, starLevel: true, tier: true },
      })
    : []

  const agentMap = new Map(agents.map((a) => [a.id, a]))
  const leaderboard = agentTotals.map((a) => ({
    agentId: a.agentId,
    name: agentMap.get(a.agentId)?.name ?? 'Unknown',
    starLevel: agentMap.get(a.agentId)?.starLevel ?? 0,
    tier: agentMap.get(a.agentId)?.tier ?? 'rookie',
    totalEarned: Number(a._sum.amount ?? 0),
  }))

  return {
    totalPools,
    totalDistributed,
    totalRecycled: recycledAgg._sum.recycledSlices ?? 0,
    totalPending: Number(pendingAgg._sum.amount ?? 0),
    tierBreakdown: tierBreakdown.map((t) => ({
      tier: t.tier,
      count: t._count,
    })),
    recentPools: recentPools.map((p) => ({
      id: p.id,
      clientName: `${p.client.firstName} ${p.client.lastName}`,
      closerName: p.closer.name,
      closerStarLevel: p.closer.starLevel,
      status: p.status,
      distributedSlices: p.distributedSlices,
      recycledSlices: p.recycledSlices,
      createdAt: p.createdAt.toISOString(),
      allocations: p.allocations.map((a) => ({
        id: a.id,
        agentName: a.agent.name,
        agentStarLevel: a.agent.starLevel,
        type: a.type,
        slices: a.slices,
        amount: Number(a.amount),
        status: a.status,
      })),
    })),
    pendingPayouts: pendingPayouts.map((a) => ({
      id: a.id,
      agentId: a.agent.id,
      agentName: a.agent.name,
      agentStarLevel: a.agent.starLevel,
      clientName: `${a.bonusPool.client.firstName} ${a.bonusPool.client.lastName}`,
      type: a.type,
      slices: a.slices,
      amount: Number(a.amount),
      createdAt: a.createdAt.toISOString(),
    })),
    leaderboard,
  }
}
