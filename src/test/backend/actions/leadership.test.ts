import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    quarterlySettlement: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

// Mock leadership service
const { mockCheckEligibility, mockPromote } = vi.hoisted(() => ({
  mockCheckEligibility: vi.fn(),
  mockPromote: vi.fn(),
}))
vi.mock('@/backend/services/leadership', () => ({
  checkLeadershipEligibility: mockCheckEligibility,
  promoteToLeadership: mockPromote,
}))

// Mock quarterly settlement service
const { mockCalculateSettlement } = vi.hoisted(() => ({
  mockCalculateSettlement: vi.fn(),
}))
vi.mock('@/backend/services/quarterly-settlement', () => ({
  calculateQuarterlySettlement: mockCalculateSettlement,
}))

import {
  checkAndPromoteLeadership,
  generateQuarterlySettlement,
  approveSettlement,
  markSettlementPaid,
} from '@/app/actions/leadership'

describe('checkAndPromoteLeadership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await checkAndPromoteLeadership('agent-1', 'ED')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    const result = await checkAndPromoteLeadership('agent-1', 'ED')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error when not eligible', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockCheckEligibility.mockResolvedValue({
      eligible: false,
      reason: 'Need 30 approved clients',
      ownClients: 10,
      qualifiedSubordinates: 0,
      directSubordinates: 0,
    })

    const result = await checkAndPromoteLeadership('agent-1', 'ED')
    expect(result.success).toBe(false)
    expect(result.error).toContain('30 approved clients')
  })

  it('promotes eligible agent', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockCheckEligibility.mockResolvedValue({
      eligible: true,
      ownClients: 35,
      qualifiedSubordinates: 2,
      directSubordinates: 3,
    })
    mockPromote.mockResolvedValue({ success: true, promotionBonus: 10_000 })

    const result = await checkAndPromoteLeadership('agent-1', 'ED')
    expect(result.success).toBe(true)
    expect(result.promotionBonus).toBe(10_000)
  })
})

describe('generateQuarterlySettlement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await generateQuarterlySettlement('leader-1', 2026, 1)
    expect(result.success).toBe(false)
  })

  it('rejects non-admin/finance users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await generateQuarterlySettlement('leader-1', 2026, 1)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('validates quarter range', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await generateQuarterlySettlement('leader-1', 2026, 5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Quarter')
  })

  it('generates settlement on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    mockCalculateSettlement.mockResolvedValue({
      success: true,
      settlementId: 'settlement-1',
      teamRevenue: 8000,
      commissionAmount: 400,
    })

    const result = await generateQuarterlySettlement('leader-1', 2026, 1)
    expect(result.success).toBe(true)
    expect(result.settlementId).toBe('settlement-1')
  })
})

describe('approveSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.quarterlySettlement.update.mockResolvedValue({})
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    const result = await approveSettlement('s1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('rejects if not in DRAFT status', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.quarterlySettlement.findUnique.mockResolvedValue({
      id: 's1',
      status: 'APPROVED',
    })

    const result = await approveSettlement('s1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('DRAFT')
  })

  it('approves DRAFT settlement', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.quarterlySettlement.findUnique.mockResolvedValue({
      id: 's1',
      status: 'DRAFT',
    })

    const result = await approveSettlement('s1')
    expect(result.success).toBe(true)
    expect(mockPrisma.quarterlySettlement.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'APPROVED' },
    })
  })
})

describe('markSettlementPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.quarterlySettlement.update.mockResolvedValue({})
  })

  it('rejects non-admin/finance', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await markSettlementPaid('s1')
    expect(result.success).toBe(false)
  })

  it('rejects if not APPROVED', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.quarterlySettlement.findUnique.mockResolvedValue({
      id: 's1',
      status: 'DRAFT',
    })

    const result = await markSettlementPaid('s1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('APPROVED')
  })

  it('marks APPROVED settlement as paid', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    mockPrisma.quarterlySettlement.findUnique.mockResolvedValue({
      id: 's1',
      status: 'APPROVED',
    })

    const result = await markSettlementPaid('s1')
    expect(result.success).toBe(true)
    expect(mockPrisma.quarterlySettlement.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'PAID' },
    })
  })
})
