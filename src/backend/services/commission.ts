import prisma from '@/backend/prisma/client'
import { IntakeStatus } from '@/types'

// ── Star Level Calculation ──────────────────────────────────────────────────

export async function recalculateStarLevel(
  agentId: string,
): Promise<{ tier: string; starLevel: number }> {
  const count = await prisma.client.count({
    where: { agentId, intakeStatus: IntakeStatus.APPROVED },
  })

  let tier: string
  let starLevel: number

  if (count <= 2) {
    tier = 'rookie'
    starLevel = 0
  } else if (count <= 6) {
    tier = '1-star'
    starLevel = 1
  } else if (count <= 12) {
    tier = '2-star'
    starLevel = 2
  } else if (count <= 20) {
    tier = '3-star'
    starLevel = 3
  } else {
    tier = '4-star'
    starLevel = 4
  }

  await prisma.user.update({
    where: { id: agentId },
    data: { tier, starLevel },
  })

  return { tier, starLevel }
}

// ── Bonus Pool Creation ─────────────────────────────────────────────────────

export async function createBonusPool(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: { agent: true },
  })

  // Don't create duplicate pools
  const existing = await prisma.bonusPool.findUnique({ where: { clientId } })
  if (existing) return existing

  const pool = await prisma.bonusPool.create({
    data: {
      clientId,
      closerId: client.agentId,
    },
  })

  // Distribute immediately
  await distributeStarPool(pool.id)

  // Recalculate closer's star level (new approved client)
  await recalculateStarLevel(client.agentId)

  return pool
}

// ── Star Pool Distribution Algorithm ────────────────────────────────────────

export async function distributeStarPool(bonusPoolId: string): Promise<void> {
  const pool = await prisma.bonusPool.findUniqueOrThrow({
    where: { id: bonusPoolId },
    include: { closer: true },
  })

  if (pool.status !== 'pending') return // Already distributed

  const allocations: Array<{
    agentId: string
    type: string
    slices: number
    amount: number
    starLevelAtTime: number
  }> = []

  // Step 1: Direct bonus — $200 to closer (always)
  allocations.push({
    agentId: pool.closerId,
    type: 'direct',
    slices: 0,
    amount: 200,
    starLevelAtTime: pool.closer.starLevel,
  })

  // Step 2: Star pool — walk UP hierarchy from closer
  let remainingSlices = 4
  let currentAgent: { id: string; starLevel: number; supervisorId: string | null } =
    pool.closer
  const visited: Array<{
    agentId: string
    starLevel: number
    slicesGiven: number
  }> = []
  let highestStarAgent: { id: string; starLevel: number } | null = null

  while (currentAgent && remainingSlices > 0) {
    const canTake = Math.min(currentAgent.starLevel, remainingSlices)
    if (canTake > 0) {
      allocations.push({
        agentId: currentAgent.id,
        type: 'star_slice',
        slices: canTake,
        amount: canTake * 50,
        starLevelAtTime: currentAgent.starLevel,
      })
      remainingSlices -= canTake
      visited.push({
        agentId: currentAgent.id,
        starLevel: currentAgent.starLevel,
        slicesGiven: canTake,
      })
    }

    if (
      !highestStarAgent ||
      currentAgent.starLevel > highestStarAgent.starLevel
    ) {
      highestStarAgent = {
        id: currentAgent.id,
        starLevel: currentAgent.starLevel,
      }
    }

    // Move up
    if (currentAgent.supervisorId) {
      currentAgent = await prisma.user.findUniqueOrThrow({
        where: { id: currentAgent.supervisorId },
      })
    } else {
      break
    }
  }

  // Step 3: Backfill — remaining slices go to highest-star ancestor
  if (
    remainingSlices > 0 &&
    highestStarAgent &&
    highestStarAgent.starLevel > 0
  ) {
    const alreadyGiven =
      visited.find((v) => v.agentId === highestStarAgent!.id)?.slicesGiven || 0
    const maxCanTake = highestStarAgent.starLevel - alreadyGiven
    const backfillSlices = Math.min(maxCanTake, remainingSlices)

    if (backfillSlices > 0) {
      allocations.push({
        agentId: highestStarAgent.id,
        type: 'backfill',
        slices: backfillSlices,
        amount: backfillSlices * 50,
        starLevelAtTime: highestStarAgent.starLevel,
      })
      remainingSlices -= backfillSlices
    }
  }

  // Step 4: Save everything in a transaction
  const recycledSlices = remainingSlices
  const distributedSlices = 4 - recycledSlices

  await prisma.$transaction([
    // Create all allocations
    ...allocations.map((a) =>
      prisma.bonusAllocation.create({
        data: {
          bonusPoolId,
          agentId: a.agentId,
          type: a.type,
          slices: a.slices,
          amount: a.amount,
          starLevelAtTime: a.starLevelAtTime,
        },
      }),
    ),
    // Update pool status
    prisma.bonusPool.update({
      where: { id: bonusPoolId },
      data: {
        status: 'distributed',
        distributedSlices,
        recycledSlices,
        hierarchySnapshot: visited,
      },
    }),
  ])
}

// ── Commission Summary Query ────────────────────────────────────────────────

export async function getAgentCommissionSummary(agentId: string) {
  const allocations = await prisma.bonusAllocation.findMany({
    where: { agentId },
    include: { bonusPool: { include: { closer: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalEarned = allocations.reduce(
    (sum, a) => sum + Number(a.amount),
    0,
  )
  const pending = allocations
    .filter((a) => a.status === 'pending')
    .reduce((sum, a) => sum + Number(a.amount), 0)
  const paid = allocations
    .filter((a) => a.status === 'paid')
    .reduce((sum, a) => sum + Number(a.amount), 0)

  return {
    allocations,
    totalEarned,
    pending,
    paid,
    directBonuses: allocations.filter((a) => a.type === 'direct').length,
    starSlices: allocations
      .filter((a) => a.type === 'star_slice' || a.type === 'backfill')
      .reduce((sum, a) => sum + a.slices, 0),
  }
}
