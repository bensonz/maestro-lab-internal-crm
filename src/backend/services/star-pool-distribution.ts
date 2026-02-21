import { TOTAL_SLICES, SLICE_VALUE } from '@/lib/commission-constants'

export interface ChainAgent {
  id: string
  starLevel: number
}

export interface SliceAllocation {
  agentId: string
  starLevel: number
  type: 'STAR_SLICE' | 'BACKFILL'
  slices: number
  amount: number
}

export interface DistributionResult {
  allocations: SliceAllocation[]
  distributedSlices: number
  recycledSlices: number
}

/**
 * Pure function that distributes 4 slices ($50 each) of the star pool.
 *
 * Algorithm:
 * 1. Build fullChain = [closer, ...supervisorChain]
 * 2. Walk: each agent takes min(starLevel, remaining) → type STAR_SLICE
 * 3. If remaining > 0: find highest-star supervisor (NOT closer) for backfill
 * 4. Backfill = min(supervisor.starLevel - alreadyTaken, remaining) → type BACKFILL
 * 5. Any still remaining → recycled
 */
export function distributeStarPool(
  closer: ChainAgent,
  supervisorChain: ChainAgent[],
): DistributionResult {
  const fullChain = [closer, ...supervisorChain]
  const allocations: SliceAllocation[] = []
  const takenByAgent = new Map<string, number>()
  let remaining = TOTAL_SLICES

  // Step 1: Walk the chain — each agent takes min(starLevel, remaining)
  for (const agent of fullChain) {
    if (remaining <= 0) break
    const take = Math.min(agent.starLevel, remaining)
    if (take > 0) {
      allocations.push({
        agentId: agent.id,
        starLevel: agent.starLevel,
        type: 'STAR_SLICE',
        slices: take,
        amount: take * SLICE_VALUE,
      })
      takenByAgent.set(agent.id, take)
      remaining -= take
    }
  }

  // Step 2: Backfill — find highest-star supervisor (not closer)
  if (remaining > 0 && supervisorChain.length > 0) {
    const bestSupervisor = supervisorChain.reduce((best, s) =>
      s.starLevel > best.starLevel ? s : best,
    )

    const alreadyTaken = takenByAgent.get(bestSupervisor.id) || 0
    const capacity = bestSupervisor.starLevel - alreadyTaken
    const backfill = Math.min(capacity, remaining)

    if (backfill > 0) {
      allocations.push({
        agentId: bestSupervisor.id,
        starLevel: bestSupervisor.starLevel,
        type: 'BACKFILL',
        slices: backfill,
        amount: backfill * SLICE_VALUE,
      })
      remaining -= backfill
    }
  }

  const distributedSlices = TOTAL_SLICES - remaining
  return {
    allocations,
    distributedSlices,
    recycledSlices: remaining,
  }
}
