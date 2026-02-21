import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    client: { count: vi.fn() },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    promotionLog: { create: vi.fn() },
    eventLog: { create: vi.fn() },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import {
  checkLeadershipEligibility,
  promoteToLeadership,
  getEffectiveTeamIds,
} from '@/backend/services/leadership'

describe('checkLeadershipEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ineligible when agent lacks enough clients', async () => {
    mockPrisma.client.count.mockResolvedValue(10) // ED needs 30

    const result = await checkLeadershipEligibility('agent-1', 'ED')
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('30 approved clients')
    expect(result.ownClients).toBe(10)
  })

  it('returns ineligible when agent lacks qualified subordinates', async () => {
    mockPrisma.client.count.mockResolvedValue(35)
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 's1', starLevel: 3 }, // not 4★
      { id: 's2', starLevel: 2 },
    ])

    const result = await checkLeadershipEligibility('agent-1', 'ED')
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('subordinates with 4★')
    expect(result.qualifiedSubordinates).toBe(0)
  })

  it('returns ineligible when not enough direct reports', async () => {
    mockPrisma.client.count.mockResolvedValue(35)
    mockPrisma.user.findMany.mockResolvedValue([]) // 0 direct reports but ED needs 1

    const result = await checkLeadershipEligibility('agent-1', 'ED')
    expect(result.eligible).toBe(false)
  })

  it('returns eligible when all ED requirements met', async () => {
    mockPrisma.client.count.mockResolvedValue(35)
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 's1', starLevel: 4 },
      { id: 's2', starLevel: 4 },
      { id: 's3', starLevel: 2 },
    ])

    const result = await checkLeadershipEligibility('agent-1', 'ED')
    expect(result.eligible).toBe(true)
    expect(result.ownClients).toBe(35)
    expect(result.qualifiedSubordinates).toBe(2)
    expect(result.directSubordinates).toBe(3)
  })

  it('returns error for invalid tier', async () => {
    const result = await checkLeadershipEligibility('agent-1', 'INVALID' as 'ED')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('Invalid tier')
  })
})

describe('promoteToLeadership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.promotionLog.create.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('returns error for non-existent agent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await promoteToLeadership('nonexistent', 'ED')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Agent not found')
  })

  it('promotes eligible agent and returns bonus', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'agent-1',
      starLevel: 4,
      leadershipTier: 'NONE',
    })
    mockPrisma.client.count
      .mockResolvedValueOnce(35) // eligibility check
      .mockResolvedValueOnce(35) // for promotion log
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 's1', starLevel: 4 },
      { id: 's2', starLevel: 4 },
    ])

    const result = await promoteToLeadership('agent-1', 'ED')
    expect(result.success).toBe(true)
    expect(result.promotionBonus).toBe(10_000)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { leadershipTier: 'ED' },
    })
    expect(mockPrisma.promotionLog.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })

  it('rejects ineligible agent', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'agent-1',
      starLevel: 2,
      leadershipTier: 'NONE',
    })
    mockPrisma.client.count.mockResolvedValue(5) // not enough

    const result = await promoteToLeadership('agent-1', 'ED')
    expect(result.success).toBe(false)
    expect(result.error).toContain('approved clients')
  })
})

describe('getEffectiveTeamIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty for leader with no subordinates', async () => {
    mockPrisma.user.findMany.mockResolvedValue([])

    const result = await getEffectiveTeamIds('leader-1')
    expect(result).toEqual([])
  })

  it('returns direct subordinates', async () => {
    // First call: subordinates of leader
    mockPrisma.user.findMany
      .mockResolvedValueOnce([{ id: 'sub-1' }, { id: 'sub-2' }])
      .mockResolvedValueOnce([]) // sub-1 has no subordinates
      .mockResolvedValueOnce([]) // sub-2 has no subordinates

    // When checking leadership tier of sub-1 and sub-2
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ leadershipTier: 'NONE' })
      .mockResolvedValueOnce({ leadershipTier: 'NONE' })

    const result = await getEffectiveTeamIds('leader-1')
    expect(result).toContain('sub-1')
    expect(result).toContain('sub-2')
    expect(result).toHaveLength(2)
  })

  it('stops at ED+ subordinates (team independence)', async () => {
    // leader → [sub-1(ED), sub-2(NONE)]
    mockPrisma.user.findMany
      .mockResolvedValueOnce([{ id: 'sub-ed' }, { id: 'sub-none' }])
      .mockResolvedValueOnce([]) // sub-none has no subordinates

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ leadershipTier: 'ED' }) // sub-ed: stop here
      .mockResolvedValueOnce({ leadershipTier: 'NONE' }) // sub-none: include

    const result = await getEffectiveTeamIds('leader-1')
    expect(result).not.toContain('sub-ed')
    expect(result).toContain('sub-none')
  })
})
