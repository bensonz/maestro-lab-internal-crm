import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    fundAllocation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    systemConfig: {
      findMany: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { matchFundAllocation } from '@/lib/gmail/matcher'
import type { EmailDetection } from '@/lib/gmail/types'

function makeDetection(overrides: Partial<EmailDetection['data']> = {}): EmailDetection {
  return {
    type: 'FUND_DEPOSIT',
    confidence: 0.8,
    data: {
      platform: 'fanduel',
      amount: 100,
      direction: 'DEPOSIT',
      ...overrides,
    },
  }
}

describe('matchFundAllocation', () => {
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.fundAllocation.update.mockResolvedValue({})
    // Return empty config so getConfig uses defaults
    mockPrisma.systemConfig.findMany.mockResolvedValue([])
  })

  it('returns no match when no platform provided', async () => {
    const detection = makeDetection({ platform: undefined })
    const result = await matchFundAllocation(detection, now)
    expect(result.matched).toBe(false)
  })

  it('returns no match when direction is UNKNOWN', async () => {
    const detection = makeDetection({ direction: 'UNKNOWN' })
    const result = await matchFundAllocation(detection, now)
    expect(result.matched).toBe(false)
  })

  it('returns no match when no candidates found', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([])
    const detection = makeDetection()
    const result = await matchFundAllocation(detection, now)
    expect(result.matched).toBe(false)
  })

  it('auto-confirms exact amount match', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([
      { id: 'alloc-1', amount: 100, confirmationStatus: 'UNCONFIRMED' },
    ])
    const detection = makeDetection({ amount: 100 })
    const result = await matchFundAllocation(detection, now)

    expect(result.matched).toBe(true)
    expect(result.autoConfirmed).toBe(true)
    expect(result.discrepancy).toBe(false)
    expect(result.allocationId).toBe('alloc-1')
    expect(mockPrisma.fundAllocation.update).toHaveBeenCalledWith({
      where: { id: 'alloc-1' },
      data: expect.objectContaining({
        confirmationStatus: 'CONFIRMED',
      }),
    })
  })

  it('auto-confirms within 5% tolerance', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([
      { id: 'alloc-1', amount: 100, confirmationStatus: 'UNCONFIRMED' },
    ])
    // 104 is within 5% of 100
    const detection = makeDetection({ amount: 104 })
    const result = await matchFundAllocation(detection, now)

    expect(result.matched).toBe(true)
    expect(result.autoConfirmed).toBe(true)
    expect(result.discrepancy).toBe(false)
  })

  it('flags discrepancy for amount mismatch within 25%', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([
      { id: 'alloc-1', amount: 100, confirmationStatus: 'UNCONFIRMED' },
    ])
    // 80 is 20% off (within 25% tolerance) but outside 5%
    const detection = makeDetection({ amount: 80 })
    const result = await matchFundAllocation(detection, now)

    expect(result.matched).toBe(true)
    expect(result.autoConfirmed).toBe(false)
    expect(result.discrepancy).toBe(true)
    expect(mockPrisma.fundAllocation.update).toHaveBeenCalledWith({
      where: { id: 'alloc-1' },
      data: expect.objectContaining({
        confirmationStatus: 'DISCREPANCY',
        confirmedAmount: 80,
      }),
    })
  })

  it('returns no match when amount is way off', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([
      { id: 'alloc-1', amount: 100, confirmationStatus: 'UNCONFIRMED' },
    ])
    // 50 is 50% off (outside 25% tolerance)
    const detection = makeDetection({ amount: 50 })
    const result = await matchFundAllocation(detection, now)

    expect(result.matched).toBe(false)
  })

  it('matches when no amount extracted but candidate exists', async () => {
    mockPrisma.fundAllocation.findMany.mockResolvedValue([
      { id: 'alloc-1', amount: 200, confirmationStatus: 'UNCONFIRMED' },
    ])
    const detection = makeDetection({ amount: null })
    const result = await matchFundAllocation(detection, now)

    expect(result.matched).toBe(true)
    expect(result.autoConfirmed).toBe(false)
    expect(result.recordedAmount).toBe(200)
  })
})
