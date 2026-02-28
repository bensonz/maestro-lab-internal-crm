import prisma from '@/backend/prisma/client'
import type {
  CommissionOverviewData,
  AgentEarningsData,
  AgentLeaderboardEntry,
  AllocationLine,
  BonusPoolData,
} from '@/types/backend-types'

export async function getCommissionOverview(): Promise<CommissionOverviewData> {
  const pools = await prisma.bonusPool.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { firstName: true, lastName: true } },
      closer: { select: { id: true, name: true } },
      allocations: {
        include: {
          agent: { select: { id: true, name: true } },
        },
      },
    },
  })

  const poolData: BonusPoolData[] = pools.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    clientName: `${p.client.firstName} ${p.client.lastName}`,
    closerId: p.closerId,
    closerName: p.closer.name,
    closerStarLevel: p.closerStarLevel,
    totalAmount: p.totalAmount,
    directAmount: p.directAmount,
    starPoolAmount: p.starPoolAmount,
    distributedSlices: p.distributedSlices,
    recycledSlices: p.recycledSlices,
    status: p.status,
    distributedAt: p.distributedAt,
    allocations: p.allocations.map(
      (a): AllocationLine => ({
        id: a.id,
        agentId: a.agentId,
        agentName: a.agent.name,
        agentStarLevel: a.agentStarLevel,
        type: a.type,
        slices: a.slices,
        amount: a.amount,
        status: a.status,
        paidAt: a.paidAt,
        createdAt: a.createdAt,
        clientName: `${p.client.firstName} ${p.client.lastName}`,
        closerName: p.closer.name,
      }),
    ),
  }))

  const totalDistributed = poolData.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPending = poolData
    .flatMap((p) => p.allocations)
    .filter((a) => a.status === 'PENDING')
    .reduce((sum, a) => sum + a.amount, 0)
  const totalRecycled = poolData.reduce(
    (sum, p) => sum + p.recycledSlices * 50,
    0,
  )

  return {
    totalPools: poolData.length,
    totalDistributed,
    totalPending,
    totalRecycled,
    pools: poolData,
  }
}

export async function getAgentEarnings(
  agentId: string,
): Promise<AgentEarningsData | null> {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      starLevel: true,
      leadershipTier: true,
    },
  })

  if (!agent) return null

  const allocations = await prisma.bonusAllocation.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { id: true, name: true } },
      pool: {
        select: {
          client: { select: { firstName: true, lastName: true } },
          closer: { select: { id: true, name: true } },
        },
      },
    },
  })

  const lines: AllocationLine[] = allocations.map((a) => ({
    id: a.id,
    agentId: a.agentId,
    agentName: a.agent.name,
    agentStarLevel: a.agentStarLevel,
    type: a.type,
    slices: a.slices,
    amount: a.amount,
    status: a.status,
    paidAt: a.paidAt,
    createdAt: a.createdAt,
    clientName: `${a.pool.client.firstName} ${a.pool.client.lastName}`,
    closerName: a.pool.closer.name,
  }))

  const totalEarned = lines.reduce((s, a) => s + a.amount, 0)
  const paidAmount = lines
    .filter((a) => a.status === 'PAID')
    .reduce((s, a) => s + a.amount, 0)
  const pendingAmount = totalEarned - paidAmount

  const byType = (type: string) =>
    lines.filter((a) => a.type === type).reduce((s, a) => s + a.amount, 0)

  return {
    agentId: agent.id,
    agentName: agent.name,
    starLevel: agent.starLevel,
    leadershipTier: agent.leadershipTier,
    totalEarned,
    pendingAmount,
    paidAmount,
    directBonuses: byType('DIRECT'),
    starSliceBonuses: byType('STAR_SLICE'),
    backfillBonuses: byType('BACKFILL'),
    allocations: lines,
  }
}

export async function getSupervisorChain(
  agentId: string,
): Promise<{ id: string; starLevel: number }[]> {
  const chain: { id: string; starLevel: number }[] = []
  let currentId: string | null = agentId

  // Walk up the hierarchy — limit to 10 levels to prevent infinite loops
  for (let i = 0; i < 10; i++) {
    const current: { supervisorId: string | null } | null =
      await prisma.user.findUnique({
        where: { id: currentId! },
        select: { supervisorId: true },
      })

    if (!current?.supervisorId) break

    const supervisor: { id: string; starLevel: number } | null =
      await prisma.user.findUnique({
        where: { id: current.supervisorId },
        select: { id: true, starLevel: true },
      })

    if (!supervisor) break

    chain.push({ id: supervisor.id, starLevel: supervisor.starLevel })
    currentId = supervisor.id
  }

  return chain
}

export async function getAgentLeaderboard(): Promise<AgentLeaderboardEntry[]> {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    select: {
      id: true,
      name: true,
      starLevel: true,
      _count: { select: { closedClients: { where: { status: 'APPROVED' } } } },
      allocations: { select: { amount: true } },
    },
    orderBy: { starLevel: 'desc' },
  })

  return agents.map((a) => ({
    agentId: a.id,
    agentName: a.name,
    starLevel: a.starLevel,
    approvedClients: a._count.closedClients,
    totalEarned: a.allocations.reduce((s, al) => s + al.amount, 0),
  }))
}

export async function getPendingPayouts() {
  return prisma.bonusAllocation.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      agent: { select: { id: true, name: true } },
      pool: {
        select: {
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })
}

export async function getAllocationsByAgent(agentId: string) {
  return prisma.bonusAllocation.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: {
      pool: {
        select: {
          client: { select: { firstName: true, lastName: true } },
          closerStarLevel: true,
        },
      },
    },
  })
}
