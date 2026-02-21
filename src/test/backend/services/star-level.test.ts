import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateStarLevel, getTierForStarLevel } from '@/backend/services/star-level'

// Mock Prisma for recalculateAgentStarLevel tests
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    promotionLog: {
      create: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { recalculateAgentStarLevel } from '@/backend/services/star-level'

describe('calculateStarLevel (pure)', () => {
  it('returns 0 for 0 clients', () => {
    expect(calculateStarLevel(0)).toBe(0)
  })

  it('returns 0 for 1-2 clients (Rookie)', () => {
    expect(calculateStarLevel(1)).toBe(0)
    expect(calculateStarLevel(2)).toBe(0)
  })

  it('returns 1 for 3-6 clients (1★)', () => {
    expect(calculateStarLevel(3)).toBe(1)
    expect(calculateStarLevel(6)).toBe(1)
  })

  it('returns 2 for 7-12 clients (2★)', () => {
    expect(calculateStarLevel(7)).toBe(2)
    expect(calculateStarLevel(12)).toBe(2)
  })

  it('returns 3 for 13-20 clients (3★)', () => {
    expect(calculateStarLevel(13)).toBe(3)
    expect(calculateStarLevel(20)).toBe(3)
  })

  it('returns 4 for 21+ clients (4★)', () => {
    expect(calculateStarLevel(21)).toBe(4)
    expect(calculateStarLevel(100)).toBe(4)
  })

  it('handles boundary transitions correctly', () => {
    expect(calculateStarLevel(2)).toBe(0)
    expect(calculateStarLevel(3)).toBe(1)
    expect(calculateStarLevel(6)).toBe(1)
    expect(calculateStarLevel(7)).toBe(2)
    expect(calculateStarLevel(12)).toBe(2)
    expect(calculateStarLevel(13)).toBe(3)
    expect(calculateStarLevel(20)).toBe(3)
    expect(calculateStarLevel(21)).toBe(4)
  })
})

describe('getTierForStarLevel', () => {
  it('returns rookie for 0', () => {
    expect(getTierForStarLevel(0)).toBe('rookie')
  })

  it('returns N-star for levels 1-4', () => {
    expect(getTierForStarLevel(1)).toBe('1-star')
    expect(getTierForStarLevel(2)).toBe('2-star')
    expect(getTierForStarLevel(3)).toBe('3-star')
    expect(getTierForStarLevel(4)).toBe('4-star')
  })
})

describe('recalculateAgentStarLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.promotionLog.create.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('returns null for non-existent agent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await recalculateAgentStarLevel('nonexistent')
    expect(result).toBeNull()
  })

  it('returns null for non-AGENT role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      starLevel: 0,
      leadershipTier: 'NONE',
      role: 'ADMIN',
    })
    const result = await recalculateAgentStarLevel('u1')
    expect(result).toBeNull()
  })

  it('skips leadership-tier agents', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      starLevel: 4,
      leadershipTier: 'ED',
      role: 'AGENT',
    })
    const result = await recalculateAgentStarLevel('u1')
    expect(result).toBeNull()
  })

  it('returns unchanged when level stays the same', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      starLevel: 1,
      leadershipTier: 'NONE',
      role: 'AGENT',
    })
    mockPrisma.client.count.mockResolvedValue(5) // still 1★

    const result = await recalculateAgentStarLevel('u1')
    expect(result).toEqual({ starLevel: 1, changed: false })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('promotes agent and creates logs when level changes', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      starLevel: 1,
      leadershipTier: 'NONE',
      role: 'AGENT',
    })
    mockPrisma.client.count.mockResolvedValue(7) // 2★

    const result = await recalculateAgentStarLevel('u1')
    expect(result).toEqual({ starLevel: 2, changed: true })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { starLevel: 2, tier: '2-star' },
    })
    expect(mockPrisma.promotionLog.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})
