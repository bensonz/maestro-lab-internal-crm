import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    bonusAllocation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'
import { markAllocationPaid, bulkMarkPaid } from '@/app/actions/commission'

function mockAuth(userId: string | null, role?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId
      ? ({ user: { id: userId, role } } as never)
      : null,
  )
}

// ── markAllocationPaid ──────────────────────────────────────────────────

describe('markAllocationPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await markAllocationPaid('alloc-1')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await markAllocationPaid('alloc-1')
    expect(result).toEqual({ success: false, error: 'Insufficient permissions' })
  })

  it('rejects FINANCE role', async () => {
    mockAuth('user-1', 'FINANCE')
    const result = await markAllocationPaid('alloc-1')
    expect(result).toEqual({ success: false, error: 'Insufficient permissions' })
  })

  it('rejects empty allocation ID', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await markAllocationPaid('')
    expect(result).toEqual({ success: false, error: 'Allocation ID is required' })
  })

  it('returns error if allocation not found', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.bonusAllocation.findUnique).mockResolvedValueOnce(null as never)

    const result = await markAllocationPaid('nonexistent')
    expect(result).toEqual({ success: false, error: 'Allocation not found' })
  })

  it('returns error if allocation already paid', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.bonusAllocation.findUnique).mockResolvedValueOnce({
      id: 'alloc-1',
      status: 'paid',
    } as never)

    const result = await markAllocationPaid('alloc-1')
    expect(result).toEqual({ success: false, error: 'Allocation is already paid' })
  })

  it('updates allocation to paid for ADMIN', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.bonusAllocation.findUnique).mockResolvedValueOnce({
      id: 'alloc-1',
      status: 'pending',
    } as never)
    vi.mocked(prisma.bonusAllocation.update).mockResolvedValueOnce({} as never)

    const result = await markAllocationPaid('alloc-1')

    expect(result).toEqual({ success: true })
    expect(prisma.bonusAllocation.update).toHaveBeenCalledWith({
      where: { id: 'alloc-1' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/commissions')
  })

  it('updates allocation to paid for BACKOFFICE', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    vi.mocked(prisma.bonusAllocation.findUnique).mockResolvedValueOnce({
      id: 'alloc-1',
      status: 'pending',
    } as never)
    vi.mocked(prisma.bonusAllocation.update).mockResolvedValueOnce({} as never)

    const result = await markAllocationPaid('alloc-1')

    expect(result).toEqual({ success: true })
    expect(prisma.bonusAllocation.update).toHaveBeenCalled()
  })
})

// ── bulkMarkPaid ────────────────────────────────────────────────────────

describe('bulkMarkPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await bulkMarkPaid(['alloc-1'])
    expect(result).toEqual({ success: false, updated: 0, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await bulkMarkPaid(['alloc-1'])
    expect(result).toEqual({ success: false, updated: 0, error: 'Insufficient permissions' })
  })

  it('rejects empty allocation IDs', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await bulkMarkPaid([])
    expect(result).toEqual({ success: false, updated: 0, error: 'No allocations selected' })
  })

  it('updates multiple pending allocations for ADMIN', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.bonusAllocation.updateMany).mockResolvedValueOnce({
      count: 3,
    } as never)

    const result = await bulkMarkPaid(['a1', 'a2', 'a3'])

    expect(result).toEqual({ success: true, updated: 3 })
    expect(prisma.bonusAllocation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2', 'a3'] }, status: 'pending' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/commissions')
  })

  it('only updates pending allocations (not already paid)', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    // 2 out of 3 were pending
    vi.mocked(prisma.bonusAllocation.updateMany).mockResolvedValueOnce({
      count: 2,
    } as never)

    const result = await bulkMarkPaid(['a1', 'a2', 'a3'])

    expect(result.updated).toBe(2)
    // Verify the where clause filters by status: 'pending'
    expect(prisma.bonusAllocation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2', 'a3'] }, status: 'pending' },
      data: expect.objectContaining({ status: 'paid' }),
    })
  })
})
