import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    profitShareRule: {
      create: vi.fn(),
      update: vi.fn(),
    },
    profitShareDetail: {
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
import {
  createProfitShareRule,
  deactivateRule,
  markProfitSharePaid,
  bulkMarkProfitSharePaid,
} from '@/app/actions/profit-sharing'

function mockAuth(userId: string | null, role?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId ? ({ user: { id: userId, role } } as never) : null,
  )
}

// ── createProfitShareRule ──────────────────────────────────────────

describe('createProfitShareRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.profitShareRule.create).mockResolvedValue({} as never)
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await createProfitShareRule({
      partnerId: 'p1',
      name: 'Rule',
    })
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await createProfitShareRule({
      partnerId: 'p1',
      name: 'Rule',
    })
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    })
  })

  it('requires name', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createProfitShareRule({
      partnerId: 'p1',
      name: '',
    })
    expect(result).toEqual({
      success: false,
      error: 'Rule name is required',
    })
  })

  it('requires partnerId', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createProfitShareRule({
      partnerId: '',
      name: 'Rule',
    })
    expect(result).toEqual({ success: false, error: 'Partner is required' })
  })

  it('rejects percentages exceeding 100', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createProfitShareRule({
      partnerId: 'p1',
      name: 'Rule',
      splitType: 'percentage',
      partnerPercent: 60,
      companyPercent: 50,
    })
    expect(result).toEqual({
      success: false,
      error: 'Partner % + Company % cannot exceed 100%',
    })
  })

  it('creates rule on happy path', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createProfitShareRule({
      partnerId: 'p1',
      name: 'Standard Split',
      partnerPercent: 30,
      companyPercent: 70,
    })

    expect(result).toEqual({ success: true })
    expect(prisma.profitShareRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'p1',
        name: 'Standard Split',
        partnerPercent: 30,
        companyPercent: 70,
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/profit-sharing')
  })
})

// ── markProfitSharePaid ────────────────────────────────────────────

describe('markProfitSharePaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.profitShareDetail.update).mockResolvedValue({} as never)
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await markProfitSharePaid('detail-1')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await markProfitSharePaid('detail-1')
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    })
  })

  it('updates status and paidAt', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await markProfitSharePaid('detail-1')

    expect(result).toEqual({ success: true })
    expect(prisma.profitShareDetail.update).toHaveBeenCalledWith({
      where: { id: 'detail-1' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/profit-sharing')
  })

  it('rejects empty detail ID', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await markProfitSharePaid('')
    expect(result).toEqual({ success: false, error: 'Detail ID is required' })
  })
})

// ── bulkMarkProfitSharePaid ────────────────────────────────────────

describe('bulkMarkProfitSharePaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await bulkMarkProfitSharePaid(['d1'])
    expect(result).toEqual({
      success: false,
      updated: 0,
      error: 'Not authenticated',
    })
  })

  it('rejects empty detail IDs', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await bulkMarkProfitSharePaid([])
    expect(result).toEqual({
      success: false,
      updated: 0,
      error: 'No details selected',
    })
  })

  it('updates multiple pending details', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.profitShareDetail.updateMany).mockResolvedValueOnce({
      count: 3,
    } as never)

    const result = await bulkMarkProfitSharePaid(['d1', 'd2', 'd3'])

    expect(result).toEqual({ success: true, updated: 3 })
    expect(prisma.profitShareDetail.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['d1', 'd2', 'd3'] }, status: 'pending' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    })
  })
})

// ── deactivateRule ─────────────────────────────────────────────────

describe('deactivateRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.profitShareRule.update).mockResolvedValue({} as never)
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await deactivateRule('rule-1')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('sets rule status to inactive', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await deactivateRule('rule-1')

    expect(result).toEqual({ success: true })
    expect(prisma.profitShareRule.update).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
      data: { status: 'inactive' },
    })
  })
})
