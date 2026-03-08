import prisma from '@/backend/prisma/client'
import { DIRECT_BONUS, BONUS_POOL_TOTAL, STAR_POOL_TOTAL } from '@/lib/commission-constants'
import { distributeStarPool } from '@/backend/services/star-pool-distribution'
import { getSupervisorChain } from '@/backend/data/bonus-pools'

/**
 * Creates a BonusPool for an approved client and distributes the $400 bonus:
 * - $200 direct bonus to the closer
 * - $200 star pool distributed via the star-slice algorithm
 *
 * All writes happen inside a single Prisma transaction.
 */
export async function createAndDistributeBonusPool(
  clientRecordId: string,
  closerId: string,
): Promise<{ poolId: string; distributedSlices: number; recycledSlices: number }> {
  // Snapshot closer's current star level
  const closer = await prisma.user.findUniqueOrThrow({
    where: { id: closerId },
    select: { id: true, starLevel: true },
  })

  // Build supervisor chain
  const supervisorChain = await getSupervisorChain(closerId)

  // Run pure distribution algorithm
  const { allocations, distributedSlices, recycledSlices } = distributeStarPool(
    { id: closer.id, starLevel: closer.starLevel },
    supervisorChain,
  )

  // Build allocation records for the transaction
  const allocationRecords = [
    // Direct bonus to closer
    {
      agentId: closerId,
      agentStarLevel: closer.starLevel,
      type: 'DIRECT' as const,
      slices: 0,
      amount: DIRECT_BONUS,
    },
    // Star pool slices
    ...allocations.map((a) => ({
      agentId: a.agentId,
      agentStarLevel: a.starLevel,
      type: a.type as 'STAR_SLICE' | 'BACKFILL',
      slices: a.slices,
      amount: a.amount,
    })),
  ]

  // Execute everything in a transaction
  const pool = await prisma.$transaction(async (tx) => {
    const bonusPool = await tx.bonusPool.create({
      data: {
        clientRecordId,
        closerId,
        closerStarLevel: closer.starLevel,
        totalAmount: BONUS_POOL_TOTAL,
        directAmount: DIRECT_BONUS,
        starPoolAmount: STAR_POOL_TOTAL,
        distributedSlices,
        recycledSlices,
        status: 'DISTRIBUTED',
        distributedAt: new Date(),
        allocations: {
          create: allocationRecords,
        },
      },
    })

    // Log events
    await tx.eventLog.create({
      data: {
        eventType: 'BONUS_POOL_CREATED',
        description: `Bonus pool created for client record ${clientRecordId}`,
        userId: closerId,
        metadata: {
          poolId: bonusPool.id,
          clientRecordId,
          closerStarLevel: closer.starLevel,
        },
      },
    })

    await tx.eventLog.create({
      data: {
        eventType: 'BONUS_POOL_DISTRIBUTED',
        description: `Bonus pool distributed: ${distributedSlices} slices, ${recycledSlices} recycled`,
        userId: closerId,
        metadata: {
          poolId: bonusPool.id,
          distributedSlices,
          recycledSlices,
          allocationCount: allocationRecords.length,
        },
      },
    })

    return bonusPool
  })

  return {
    poolId: pool.id,
    distributedSlices,
    recycledSlices,
  }
}
