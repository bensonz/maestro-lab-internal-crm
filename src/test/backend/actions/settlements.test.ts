import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    fundMovement: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'
import {
  confirmSettlement,
  rejectSettlement,
  bulkConfirmSettlements,
} from '@/app/actions/settlements'

function mockAuth(userId: string | null, role?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId ? ({ user: { id: userId, role } } as never) : null,
  )
}

function mockMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mov-1',
    settlementStatus: 'PENDING_REVIEW',
    fromClientId: 'client-1',
    amount: 100,
    fromPlatform: 'Bank',
    toPlatform: 'DraftKings',
    ...overrides,
  }
}

describe('confirmSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when unauthenticated', async () => {
    mockAuth(null)

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error when user has AGENT role', async () => {
    mockAuth('user-1', 'AGENT')

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('returns error when user has FINANCE role', async () => {
    mockAuth('user-1', 'FINANCE')

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('returns error when movementId is empty', async () => {
    mockAuth('user-1', 'ADMIN')

    const result = await confirmSettlement({ movementId: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Movement ID is required')
  })

  it('returns error when movement not found', async () => {
    mockAuth('user-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(null)

    const result = await confirmSettlement({ movementId: 'nonexistent' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Fund movement not found')
  })

  it('returns error when movement is already CONFIRMED', async () => {
    mockAuth('user-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement({ settlementStatus: 'CONFIRMED' }) as never,
    )

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot confirm')
    expect(result.error).toContain('CONFIRMED')
  })

  it('returns error when movement is already REJECTED', async () => {
    mockAuth('user-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement({ settlementStatus: 'REJECTED' }) as never,
    )

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot confirm')
    expect(result.error).toContain('REJECTED')
  })

  it('succeeds for ADMIN role with valid PENDING_REVIEW movement', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement() as never,
    )
    vi.mocked(prisma.fundMovement.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await confirmSettlement({
      movementId: 'mov-1',
      notes: 'Verified with bank',
    })

    expect(result.success).toBe(true)
    expect(prisma.fundMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov-1' },
      data: expect.objectContaining({
        settlementStatus: 'CONFIRMED',
        reviewedById: 'admin-1',
        reviewNotes: 'Verified with bank',
      }),
    })
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        userId: 'admin-1',
        clientId: 'client-1',
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-settlement')
  })

  it('succeeds for BACKOFFICE role', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement() as never,
    )
    vi.mocked(prisma.fundMovement.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await confirmSettlement({ movementId: 'mov-1' })

    expect(result.success).toBe(true)
    expect(prisma.fundMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov-1' },
      data: expect.objectContaining({
        settlementStatus: 'CONFIRMED',
        reviewedById: 'bo-1',
      }),
    })
  })

  it('stores null notes when not provided', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement() as never,
    )
    vi.mocked(prisma.fundMovement.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    await confirmSettlement({ movementId: 'mov-1' })

    expect(prisma.fundMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov-1' },
      data: expect.objectContaining({
        reviewNotes: null,
      }),
    })
  })
})

describe('rejectSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when unauthenticated', async () => {
    mockAuth(null)

    const result = await rejectSettlement({
      movementId: 'mov-1',
      notes: 'Reason',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error when user has AGENT role', async () => {
    mockAuth('user-1', 'AGENT')

    const result = await rejectSettlement({
      movementId: 'mov-1',
      notes: 'Reason',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('returns error when movementId is empty', async () => {
    mockAuth('user-1', 'ADMIN')

    const result = await rejectSettlement({ movementId: '', notes: 'Reason' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Movement ID is required')
  })

  it('returns error when notes are empty', async () => {
    mockAuth('user-1', 'ADMIN')

    const result = await rejectSettlement({ movementId: 'mov-1', notes: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Rejection reason is required')
  })

  it('returns error when notes are only whitespace', async () => {
    mockAuth('user-1', 'ADMIN')

    const result = await rejectSettlement({
      movementId: 'mov-1',
      notes: '   ',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Rejection reason is required')
  })

  it('returns error when movement not found', async () => {
    mockAuth('user-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(null)

    const result = await rejectSettlement({
      movementId: 'nonexistent',
      notes: 'Reason',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Fund movement not found')
  })

  it('returns error when movement is not PENDING_REVIEW', async () => {
    mockAuth('user-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement({ settlementStatus: 'CONFIRMED' }) as never,
    )

    const result = await rejectSettlement({
      movementId: 'mov-1',
      notes: 'Reason',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot reject')
  })

  it('succeeds with valid data', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement() as never,
    )
    vi.mocked(prisma.fundMovement.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await rejectSettlement({
      movementId: 'mov-1',
      notes: '  Amount mismatch  ',
    })

    expect(result.success).toBe(true)
    expect(prisma.fundMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov-1' },
      data: expect.objectContaining({
        settlementStatus: 'REJECTED',
        reviewedById: 'admin-1',
        reviewNotes: 'Amount mismatch',
      }),
    })
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        metadata: expect.objectContaining({
          reason: 'Amount mismatch',
        }),
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-settlement')
  })

  it('trims notes in the update', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.findUnique).mockResolvedValue(
      mockMovement() as never,
    )
    vi.mocked(prisma.fundMovement.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    await rejectSettlement({
      movementId: 'mov-1',
      notes: '  Trimmed reason  ',
    })

    expect(prisma.fundMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov-1' },
      data: expect.objectContaining({
        reviewNotes: 'Trimmed reason',
      }),
    })
  })
})

describe('bulkConfirmSettlements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when unauthenticated', async () => {
    mockAuth(null)

    const result = await bulkConfirmSettlements({ movementIds: ['mov-1'] })

    expect(result.success).toBe(false)
    expect(result.confirmed).toBe(0)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error when user has AGENT role', async () => {
    mockAuth('user-1', 'AGENT')

    const result = await bulkConfirmSettlements({ movementIds: ['mov-1'] })

    expect(result.success).toBe(false)
    expect(result.confirmed).toBe(0)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('returns error when movementIds is empty', async () => {
    mockAuth('user-1', 'ADMIN')

    const result = await bulkConfirmSettlements({ movementIds: [] })

    expect(result.success).toBe(false)
    expect(result.confirmed).toBe(0)
    expect(result.error).toBe('No movements selected')
  })

  it('succeeds and returns count of confirmed movements', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.updateMany).mockResolvedValue({
      count: 3,
    } as never)

    const result = await bulkConfirmSettlements({
      movementIds: ['mov-1', 'mov-2', 'mov-3'],
      notes: 'Batch approved',
    })

    expect(result.success).toBe(true)
    expect(result.confirmed).toBe(3)
    expect(prisma.fundMovement.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['mov-1', 'mov-2', 'mov-3'] },
        settlementStatus: 'PENDING_REVIEW',
      },
      data: expect.objectContaining({
        settlementStatus: 'CONFIRMED',
        reviewedById: 'admin-1',
        reviewNotes: 'Batch approved',
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-settlement')
  })

  it('only confirms movements that are PENDING_REVIEW', async () => {
    mockAuth('admin-1', 'ADMIN')
    // Only 2 out of 4 were actually PENDING_REVIEW
    vi.mocked(prisma.fundMovement.updateMany).mockResolvedValue({
      count: 2,
    } as never)

    const result = await bulkConfirmSettlements({
      movementIds: ['mov-1', 'mov-2', 'mov-3', 'mov-4'],
    })

    expect(result.success).toBe(true)
    expect(result.confirmed).toBe(2)
  })

  it('stores null notes when not provided', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.fundMovement.updateMany).mockResolvedValue({
      count: 1,
    } as never)

    await bulkConfirmSettlements({ movementIds: ['mov-1'] })

    expect(prisma.fundMovement.updateMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      data: expect.objectContaining({
        reviewNotes: null,
      }),
    })
  })
})
