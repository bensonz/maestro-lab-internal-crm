import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: {
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    bonusPool: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bonusAllocation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '@/backend/prisma/client'
import {
  recalculateStarLevel,
  createBonusPool,
  distributeStarPool,
  getAgentCommissionSummary,
} from '@/backend/services/commission'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeAgent(overrides: {
  id: string
  starLevel: number
  supervisorId?: string | null
}) {
  return {
    id: overrides.id,
    name: `Agent ${overrides.id}`,
    email: `${overrides.id}@test.com`,
    role: 'AGENT',
    starLevel: overrides.starLevel,
    tier: overrides.starLevel === 0 ? 'rookie' : `${overrides.starLevel}-star`,
    supervisorId: overrides.supervisorId ?? null,
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makePool(overrides: {
  id: string
  closerId: string
  closer: ReturnType<typeof makeAgent>
  status?: string
}) {
  return {
    id: overrides.id,
    clientId: 'client-1',
    closerId: overrides.closerId,
    closer: overrides.closer,
    totalAmount: 400,
    directAmount: 200,
    starPoolAmount: 200,
    totalSlices: 4,
    sliceValue: 50,
    distributedSlices: 0,
    recycledSlices: 0,
    status: overrides.status ?? 'pending',
    hierarchySnapshot: null,
    createdAt: new Date(),
  }
}

// ── recalculateStarLevel ────────────────────────────────────────────────────

describe('recalculateStarLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
  })

  const cases: [number, string, number][] = [
    [0, 'rookie', 0],
    [2, 'rookie', 0],
    [3, '1-star', 1],
    [6, '1-star', 1],
    [7, '2-star', 2],
    [12, '2-star', 2],
    [13, '3-star', 3],
    [20, '3-star', 3],
    [21, '4-star', 4],
    [30, '4-star', 4],
    [50, '4-star', 4],
  ]

  it.each(cases)(
    'with %i approved clients → tier=%s, starLevel=%i',
    async (count, expectedTier, expectedLevel) => {
      vi.mocked(prisma.client.count).mockResolvedValueOnce(count as never)

      const result = await recalculateStarLevel('agent-1')

      expect(result).toEqual({ tier: expectedTier, starLevel: expectedLevel })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: { tier: expectedTier, starLevel: expectedLevel },
      })
    },
  )
})

// ── distributeStarPool ──────────────────────────────────────────────────────

describe('distributeStarPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock $transaction to execute all operations passed to it
    vi.mocked(prisma.$transaction).mockImplementation(
      async (ops: unknown[]) => {
        // The ops array contains promise-returning calls that were
        // already invoked before being passed. Just resolve them.
        return Promise.all(ops as Promise<unknown>[])
      },
    )
    vi.mocked(prisma.bonusAllocation.create).mockResolvedValue({} as never)
    vi.mocked(prisma.bonusPool.update).mockResolvedValue({} as never)
  })

  it('skips distribution if pool is already distributed', async () => {
    const closer = makeAgent({ id: 'closer', starLevel: 0 })
    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({
        id: 'pool-1',
        closerId: 'closer',
        closer,
        status: 'distributed',
      }) as never,
    )

    await distributeStarPool('pool-1')

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // Test 1: Solo rookie (0★) closes
  it('solo rookie: $200 direct, 0 star slices, 4 recycled', async () => {
    const closer = makeAgent({ id: 'closer', starLevel: 0 })
    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    await distributeStarPool('pool-1')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]

    // 1 direct allocation + 1 pool update = 2 operations
    expect(txOps).toHaveLength(2)

    // Verify direct bonus allocation
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bonusPoolId: 'pool-1',
        agentId: 'closer',
        type: 'direct',
        slices: 0,
        amount: 200,
        starLevelAtTime: 0,
      }),
    })

    // Verify pool update with 4 recycled slices
    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        status: 'distributed',
        distributedSlices: 0,
        recycledSlices: 4,
      }),
    })
  })

  // Test 2: Solo 1★ closes, no upstream
  it('solo 1-star: $200 direct + $50 (1 slice), 3 recycled', async () => {
    const closer = makeAgent({ id: 'closer', starLevel: 1 })
    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    await distributeStarPool('pool-1')

    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]
    // 1 direct + 1 star_slice + 1 pool update = 3
    expect(txOps).toHaveLength(3)

    // Direct bonus
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'direct',
        amount: 200,
      }),
    })

    // Star slice
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    // Pool: 1 distributed, 3 recycled
    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        distributedSlices: 1,
        recycledSlices: 3,
      }),
    })
  })

  // Test 3: Chain 4★ → 3★ → 2★ → 1★ (1★ closes)
  it('4★→3★→2★→1★ chain: all 4 slices distributed, 0 recycled', async () => {
    const star4 = makeAgent({ id: 'star4', starLevel: 4 })
    const star3 = makeAgent({
      id: 'star3',
      starLevel: 3,
      supervisorId: 'star4',
    })
    const star2 = makeAgent({
      id: 'star2',
      starLevel: 2,
      supervisorId: 'star3',
    })
    const closer = makeAgent({
      id: 'closer',
      starLevel: 1,
      supervisorId: 'star2',
    })

    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    // Hierarchy walk: closer(1★) → star2(2★) → star3(3★) → star4(4★)
    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(star2 as never) // supervisor of closer
      .mockResolvedValueOnce(star3 as never) // supervisor of star2
      .mockResolvedValueOnce(star4 as never) // supervisor of star3

    await distributeStarPool('pool-1')

    // 1 direct + 3 star_slices + 1 pool update = 5
    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]
    expect(txOps).toHaveLength(5)

    // closer: 1 slice
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    // star2: 2 slices
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'star2',
        type: 'star_slice',
        slices: 2,
        amount: 100,
      }),
    })

    // star3: 1 remaining slice (not 3, only 1 left)
    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'star3',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    // 0 recycled
    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        distributedSlices: 4,
        recycledSlices: 0,
      }),
    })
  })

  // Test 4: Chain 4★ → 2★ (2★ closes) — backfill
  it('4★→2★ chain: 2★ takes 2, 4★ backfills 2, 0 recycled', async () => {
    const star4 = makeAgent({ id: 'star4', starLevel: 4 })
    const closer = makeAgent({
      id: 'closer',
      starLevel: 2,
      supervisorId: 'star4',
    })

    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce(
      star4 as never,
    )

    await distributeStarPool('pool-1')

    // 1 direct + 1 star_slice(closer) + 1 star_slice(star4:2) + 1 backfill(star4:2) + 1 pool update
    // Wait — closer takes 2 slices, star4 takes remaining 2 slices via star_slice, no backfill needed
    // Actually: closer=2 slices, 2 remain. star4 can take min(4, 2) = 2 slices. 0 remain.
    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]
    expect(txOps).toHaveLength(4) // 1 direct + 1 star_slice(closer) + 1 star_slice(star4) + 1 pool update

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'star_slice',
        slices: 2,
        amount: 100,
      }),
    })

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'star4',
        type: 'star_slice',
        slices: 2,
        amount: 100,
      }),
    })

    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        distributedSlices: 4,
        recycledSlices: 0,
      }),
    })
  })

  // Test 5: Chain 4★ → 1★ → 1★ (bottom 1★ closes)
  it('4★→1★→1★ chain: each 1★ takes 1 slice, 4★ takes 2, 0 recycled', async () => {
    const star4 = makeAgent({ id: 'star4', starLevel: 4 })
    const middle = makeAgent({
      id: 'middle',
      starLevel: 1,
      supervisorId: 'star4',
    })
    const closer = makeAgent({
      id: 'closer',
      starLevel: 1,
      supervisorId: 'middle',
    })

    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(middle as never)
      .mockResolvedValueOnce(star4 as never)

    await distributeStarPool('pool-1')

    // 1 direct + 3 star_slices + 1 pool update = 5
    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]
    expect(txOps).toHaveLength(5)

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'middle',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'star4',
        type: 'star_slice',
        slices: 2,
        amount: 100,
      }),
    })

    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        distributedSlices: 4,
        recycledSlices: 0,
      }),
    })
  })

  // Test 6: Chain 2★ → 1★ (1★ closes) — partial recycle
  it('2★→1★ chain: 1★ takes 1, 2★ takes 2, 1 slice recycled', async () => {
    const star2 = makeAgent({ id: 'star2', starLevel: 2 })
    const closer = makeAgent({
      id: 'closer',
      starLevel: 1,
      supervisorId: 'star2',
    })

    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      makePool({ id: 'pool-1', closerId: 'closer', closer }) as never,
    )

    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce(
      star2 as never,
    )

    await distributeStarPool('pool-1')

    // 1 direct + 2 star_slices + 1 pool update = 4
    const txOps = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[]
    expect(txOps).toHaveLength(4)

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'closer',
        type: 'star_slice',
        slices: 1,
        amount: 50,
      }),
    })

    expect(prisma.bonusAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'star2',
        type: 'star_slice',
        slices: 2,
        amount: 100,
      }),
    })

    // 3 distributed (1 + 2), 1 recycled
    expect(prisma.bonusPool.update).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      data: expect.objectContaining({
        distributedSlices: 3,
        recycledSlices: 1,
      }),
    })
  })
})

// ── createBonusPool ─────────────────────────────────────────────────────────

describe('createBonusPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(
      async (ops: unknown[]) => {
        return Promise.all(ops as Promise<unknown>[])
      },
    )
    vi.mocked(prisma.bonusAllocation.create).mockResolvedValue({} as never)
    vi.mocked(prisma.bonusPool.update).mockResolvedValue({} as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.client.count).mockResolvedValue(0 as never)
  })

  // Test 7: Duplicate pool prevention
  it('returns existing pool if one already exists for the client', async () => {
    const existingPool = {
      id: 'existing-pool',
      clientId: 'client-1',
      closerId: 'agent-1',
      status: 'distributed',
    }

    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce({
      id: 'client-1',
      agentId: 'agent-1',
      agent: makeAgent({ id: 'agent-1', starLevel: 1 }),
    } as never)

    vi.mocked(prisma.bonusPool.findUnique).mockResolvedValueOnce(
      existingPool as never,
    )

    const result = await createBonusPool('client-1')

    expect(result).toEqual(existingPool)
    expect(prisma.bonusPool.create).not.toHaveBeenCalled()
  })

  it('creates pool and distributes when no existing pool', async () => {
    const closer = makeAgent({ id: 'agent-1', starLevel: 0 })
    const newPool = {
      id: 'new-pool',
      clientId: 'client-1',
      closerId: 'agent-1',
      status: 'pending',
      closer,
    }

    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce({
      id: 'client-1',
      agentId: 'agent-1',
      agent: closer,
    } as never)

    vi.mocked(prisma.bonusPool.findUnique).mockResolvedValueOnce(null as never)
    vi.mocked(prisma.bonusPool.create).mockResolvedValueOnce(
      newPool as never,
    )

    // distributeStarPool will call findUniqueOrThrow for the pool
    vi.mocked(prisma.bonusPool.findUniqueOrThrow).mockResolvedValueOnce(
      newPool as never,
    )

    await createBonusPool('client-1')

    expect(prisma.bonusPool.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        closerId: 'agent-1',
      },
    })

    // distributeStarPool should have been called
    expect(prisma.$transaction).toHaveBeenCalled()

    // recalculateStarLevel should have been called
    expect(prisma.client.count).toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalled()
  })
})

// ── getAgentCommissionSummary ───────────────────────────────────────────────

describe('getAgentCommissionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct summary for mixed allocations', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce([
      {
        id: 'a1',
        agentId: 'agent-1',
        type: 'direct',
        slices: 0,
        amount: 200,
        status: 'paid',
        bonusPool: { closer: { name: 'Agent 1' } },
      },
      {
        id: 'a2',
        agentId: 'agent-1',
        type: 'star_slice',
        slices: 2,
        amount: 100,
        status: 'pending',
        bonusPool: { closer: { name: 'Agent 2' } },
      },
      {
        id: 'a3',
        agentId: 'agent-1',
        type: 'backfill',
        slices: 1,
        amount: 50,
        status: 'pending',
        bonusPool: { closer: { name: 'Agent 3' } },
      },
    ] as never)

    const result = await getAgentCommissionSummary('agent-1')

    expect(result.totalEarned).toBe(350)
    expect(result.paid).toBe(200)
    expect(result.pending).toBe(150)
    expect(result.directBonuses).toBe(1)
    expect(result.starSlices).toBe(3) // 2 + 1
  })

  it('returns zeros for agent with no allocations', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce(
      [] as never,
    )

    const result = await getAgentCommissionSummary('agent-1')

    expect(result.totalEarned).toBe(0)
    expect(result.paid).toBe(0)
    expect(result.pending).toBe(0)
    expect(result.directBonuses).toBe(0)
    expect(result.starSlices).toBe(0)
  })
})
