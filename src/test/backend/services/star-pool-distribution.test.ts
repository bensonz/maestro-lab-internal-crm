import { describe, it, expect } from 'vitest'
import { distributeStarPool } from '@/backend/services/star-pool-distribution'

describe('distributeStarPool', () => {
  // Scenario A: [1★, 2★, 3★, 4★] → 1+2+1+0 = 4, recycled = 0
  it('Scenario A: distributes to chain [1★, 2★, 3★, 4★]', () => {
    const result = distributeStarPool(
      { id: 'a', starLevel: 1 },
      [
        { id: 'b', starLevel: 2 },
        { id: 'c', starLevel: 3 },
        { id: 'd', starLevel: 4 },
      ],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    const byAgent = new Map(result.allocations.map((a) => [a.agentId, a]))
    expect(byAgent.get('a')?.slices).toBe(1)
    expect(byAgent.get('b')?.slices).toBe(2)
    expect(byAgent.get('c')?.slices).toBe(1) // 3★ but only 1 remaining
    expect(byAgent.has('d')).toBe(false) // nothing left for 4★
  })

  // Scenario B: [2★, 4★] → 2+2 = 4, recycled = 0
  it('Scenario B: distributes to chain [2★, 4★]', () => {
    const result = distributeStarPool(
      { id: 'a', starLevel: 2 },
      [{ id: 'b', starLevel: 4 }],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    const slices = Object.fromEntries(
      result.allocations.map((a) => [a.agentId, a.slices]),
    )
    expect(slices['a']).toBe(2)
    expect(slices['b']).toBe(2)
  })

  // Scenario C: [1★, 1★, 4★] → 1+1+2 = 4, recycled = 0
  // Closer (1★) gets 1 STAR_SLICE, sup1 (1★) gets 1, sup2 (4★) gets 2 remaining
  it('Scenario C: distributes to chain [1★, 1★, 4★]', () => {
    const result = distributeStarPool(
      { id: 'closer', starLevel: 1 },
      [
        { id: 'sup1', starLevel: 1 },
        { id: 'sup2', starLevel: 4 },
      ],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    const starSlices = result.allocations.filter((a) => a.type === 'STAR_SLICE')
    const byAgent = new Map(starSlices.map((a) => [a.agentId, a.slices]))
    expect(byAgent.get('closer')).toBe(1)
    expect(byAgent.get('sup1')).toBe(1)
    expect(byAgent.get('sup2')).toBe(2)
  })

  // Scenario D: [1★, 2★] → 1+2 = 3, backfill: 2★ capacity = 0, recycled = 1
  it('Scenario D: distributes to chain [1★, 2★] with recycled slice', () => {
    const result = distributeStarPool(
      { id: 'closer', starLevel: 1 },
      [{ id: 'sup', starLevel: 2 }],
    )

    expect(result.distributedSlices).toBe(3)
    expect(result.recycledSlices).toBe(1)

    const starSlices = result.allocations.filter((a) => a.type === 'STAR_SLICE')
    expect(starSlices).toHaveLength(2)
    expect(starSlices[0].slices).toBe(1) // closer: 1★
    expect(starSlices[1].slices).toBe(2) // sup: 2★

    // Backfill: sup already took 2 of 2★ capacity → 0 backfill
    const backfills = result.allocations.filter((a) => a.type === 'BACKFILL')
    expect(backfills).toHaveLength(0)
  })

  it('handles solo rookie (0★ closer, no supervisors)', () => {
    const result = distributeStarPool(
      { id: 'rookie', starLevel: 0 },
      [],
    )

    expect(result.distributedSlices).toBe(0)
    expect(result.recycledSlices).toBe(4)
    expect(result.allocations).toHaveLength(0)
  })

  it('handles chain of all 1★ agents', () => {
    const result = distributeStarPool(
      { id: 'a', starLevel: 1 },
      [
        { id: 'b', starLevel: 1 },
        { id: 'c', starLevel: 1 },
        { id: 'd', starLevel: 1 },
      ],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    const starSlices = result.allocations.filter((a) => a.type === 'STAR_SLICE')
    expect(starSlices).toHaveLength(4)
    for (const s of starSlices) {
      expect(s.slices).toBe(1)
    }
  })

  it('handles 4★ closer with no supervisors — takes all 4', () => {
    const result = distributeStarPool(
      { id: 'star4', starLevel: 4 },
      [],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].slices).toBe(4)
    expect(result.allocations[0].amount).toBe(200)
  })

  it('backfills to highest-star supervisor when remaining after walk', () => {
    // [1★ closer, 1★ sup1, 3★ sup2]
    // Walk: closer=1, sup1=1, sup2=2 → distributed=4
    // But wait — 3★ takes min(3,2)=2 in walk, so no backfill needed
    // Let's try: [0★ closer, 1★ sup1, 3★ sup2]
    // Walk: closer=0, sup1=1, sup2=3 → distributed=4
    const result = distributeStarPool(
      { id: 'closer', starLevel: 0 },
      [
        { id: 'sup1', starLevel: 1 },
        { id: 'sup2', starLevel: 3 },
      ],
    )

    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)
  })

  it('backfills correctly when walk leaves gap', () => {
    // [0★ closer, 1★ sup1, 2★ sup2]
    // Walk: closer=0, sup1=1, sup2=2 → distributed=3, remaining=1
    // Backfill: best sup = sup2 (2★), already took 2, capacity = 0
    // Next: sup1 (1★), already took 1, capacity = 0 — but we pick highest-star
    // Result: recycled=1
    const result = distributeStarPool(
      { id: 'closer', starLevel: 0 },
      [
        { id: 'sup1', starLevel: 1 },
        { id: 'sup2', starLevel: 2 },
      ],
    )

    expect(result.distributedSlices).toBe(3)
    expect(result.recycledSlices).toBe(1)
  })

  it('calculates correct dollar amounts', () => {
    const result = distributeStarPool(
      { id: 'a', starLevel: 2 },
      [{ id: 'b', starLevel: 4 }],
    )

    const byAgent = new Map(result.allocations.map((a) => [a.agentId, a]))
    expect(byAgent.get('a')?.amount).toBe(100) // 2 slices × $50
    expect(byAgent.get('b')?.amount).toBe(100) // 2 slices × $50
  })
})
