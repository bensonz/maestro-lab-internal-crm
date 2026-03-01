import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    fundAllocation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { confirmFundAllocation, flagDiscrepancy } from '@/app/actions/fund-confirmations'

describe('confirmFundAllocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.fundAllocation.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await confirmFundAllocation('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await confirmFundAllocation('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('allows ADMIN role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.fundAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      amount: 100.00,
      platform: 'FanDuel',
      direction: 'DEPOSIT',
      confirmationStatus: 'UNCONFIRMED',
      recordedBy: { name: 'Admin' },
    })

    const result = await confirmFundAllocation('alloc-1')
    expect(result.success).toBe(true)
  })

  it('allows FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    mockPrisma.fundAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      amount: 50.00,
      platform: 'DraftKings',
      direction: 'WITHDRAWAL',
      confirmationStatus: 'UNCONFIRMED',
      recordedBy: { name: 'Staff' },
    })

    const result = await confirmFundAllocation('alloc-1')
    expect(result.success).toBe(true)
  })

  it('returns error for already confirmed allocation', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.fundAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      amount: 100.00,
      confirmationStatus: 'CONFIRMED',
      recordedBy: { name: 'Admin' },
    })

    const result = await confirmFundAllocation('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Allocation already confirmed')
  })

  it('sets CONFIRMED status and creates event log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    mockPrisma.fundAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      amount: 250.50,
      platform: 'FanDuel',
      direction: 'DEPOSIT',
      confirmationStatus: 'UNCONFIRMED',
      recordedBy: { name: 'Staff' },
    })

    await confirmFundAllocation('alloc-1')

    expect(mockPrisma.fundAllocation.update).toHaveBeenCalledWith({
      where: { id: 'alloc-1' },
      data: expect.objectContaining({
        confirmationStatus: 'CONFIRMED',
        confirmedAt: expect.any(Date),
        confirmedById: 'u1',
      }),
    })

    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FUND_CONFIRMED',
      }),
    })
  })
})

describe('flagDiscrepancy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.fundAllocation.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await flagDiscrepancy('alloc-1', 100, 'note')
    expect(result.success).toBe(false)
  })

  it('sets DISCREPANCY status with amounts and notes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.fundAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      amount: 250.00,
      platform: 'PayPal',
      direction: 'DEPOSIT',
      confirmationStatus: 'UNCONFIRMED',
      recordedBy: { name: 'Staff' },
    })

    await flagDiscrepancy('alloc-1', 200.00, 'Amount differs')

    expect(mockPrisma.fundAllocation.update).toHaveBeenCalledWith({
      where: { id: 'alloc-1' },
      data: expect.objectContaining({
        confirmationStatus: 'DISCREPANCY',
        confirmedAmount: 200.00,
        discrepancyNotes: 'Amount differs',
      }),
    })

    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FUND_DISCREPANCY_FLAGGED',
        description: expect.stringContaining('250'),
      }),
    })
  })
})
