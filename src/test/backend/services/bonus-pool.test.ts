import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const { mockPrisma, mockTx } = vi.hoisted(() => {
  const mockTx = {
    bonusPool: { create: vi.fn() },
    eventLog: { create: vi.fn() },
  }
  const mockPrisma = {
    user: { findUniqueOrThrow: vi.fn() },
    bonusAllocation: {},
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  }
  return { mockPrisma, mockTx }
})
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

// Mock getSupervisorChain
const { mockGetSupervisorChain } = vi.hoisted(() => ({
  mockGetSupervisorChain: vi.fn(),
}))
vi.mock('@/backend/data/bonus-pools', () => ({
  getSupervisorChain: mockGetSupervisorChain,
}))

import { createAndDistributeBonusPool } from '@/backend/services/bonus-pool'

describe('createAndDistributeBonusPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTx.bonusPool.create.mockResolvedValue({ id: 'pool-1' })
    mockTx.eventLog.create.mockResolvedValue({})
  })

  it('creates pool with direct bonus and star slices for 2★ closer with 4★ supervisor', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'closer-1',
      starLevel: 2,
    })
    mockGetSupervisorChain.mockResolvedValue([
      { id: 'sup-1', starLevel: 4 },
    ])

    const result = await createAndDistributeBonusPool('client-1', 'closer-1')

    expect(result.poolId).toBe('pool-1')
    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    // Verify bonusPool.create was called with correct allocations
    const createCall = mockTx.bonusPool.create.mock.calls[0][0]
    expect(createCall.data.closerId).toBe('closer-1')
    expect(createCall.data.totalAmount).toBe(400)
    expect(createCall.data.directAmount).toBe(200)
    expect(createCall.data.status).toBe('DISTRIBUTED')

    // Should have 3 allocations: 1 DIRECT + 2 STAR_SLICE
    const allocs = createCall.data.allocations.create
    expect(allocs).toHaveLength(3)

    const direct = allocs.find((a: { type: string }) => a.type === 'DIRECT')
    expect(direct.amount).toBe(200)
    expect(direct.agentId).toBe('closer-1')

    const starSlices = allocs.filter((a: { type: string }) => a.type === 'STAR_SLICE')
    expect(starSlices).toHaveLength(2)
  })

  it('creates pool with recycled slices for low-star chain', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'closer-1',
      starLevel: 1,
    })
    mockGetSupervisorChain.mockResolvedValue([
      { id: 'sup-1', starLevel: 2 },
    ])

    const result = await createAndDistributeBonusPool('client-1', 'closer-1')

    expect(result.distributedSlices).toBe(3) // 1+2=3
    expect(result.recycledSlices).toBe(1)
  })

  it('creates pool for rookie closer with no supervisors', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'rookie',
      starLevel: 0,
    })
    mockGetSupervisorChain.mockResolvedValue([])

    const result = await createAndDistributeBonusPool('client-1', 'rookie')

    expect(result.distributedSlices).toBe(0)
    expect(result.recycledSlices).toBe(4)

    const createCall = mockTx.bonusPool.create.mock.calls[0][0]
    // 1 DIRECT + 0 star slices
    expect(createCall.data.allocations.create).toHaveLength(1)
    expect(createCall.data.allocations.create[0].type).toBe('DIRECT')
  })

  it('logs two events: BONUS_POOL_CREATED and BONUS_POOL_DISTRIBUTED', async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'closer-1',
      starLevel: 2,
    })
    mockGetSupervisorChain.mockResolvedValue([])

    await createAndDistributeBonusPool('client-1', 'closer-1')

    expect(mockTx.eventLog.create).toHaveBeenCalledTimes(2)
    const events = mockTx.eventLog.create.mock.calls.map(
      (c: [{ data: { eventType: string } }]) => c[0].data.eventType,
    )
    expect(events).toContain('BONUS_POOL_CREATED')
    expect(events).toContain('BONUS_POOL_DISTRIBUTED')
  })
})
