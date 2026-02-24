import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    bonusAllocation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { markAllocationPaid, bulkMarkPaid } from '@/app/actions/commission'

describe('markAllocationPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.bonusAllocation.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await markAllocationPaid('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin/finance users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await markAllocationPaid('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error for non-existent allocation', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.bonusAllocation.findUnique.mockResolvedValue(null)

    const result = await markAllocationPaid('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Allocation not found')
  })

  it('returns error if already paid', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.bonusAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      status: 'PAID',
      agentId: 'agent-1',
      amount: 200,
    })

    const result = await markAllocationPaid('alloc-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Already paid')
  })

  it('marks allocation as paid on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    mockPrisma.bonusAllocation.findUnique.mockResolvedValue({
      id: 'alloc-1',
      status: 'PENDING',
      agentId: 'agent-1',
      amount: 200,
    })

    const result = await markAllocationPaid('alloc-1')
    expect(result.success).toBe(true)
    expect(mockPrisma.bonusAllocation.update).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})

describe('bulkMarkPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.bonusAllocation.updateMany.mockResolvedValue({ count: 3 })
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await bulkMarkPaid(['a', 'b'])
    expect(result.success).toBe(false)
  })

  it('rejects non-admin/finance users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    const result = await bulkMarkPaid(['a'])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error for empty array', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await bulkMarkPaid([])
    expect(result.success).toBe(false)
    expect(result.error).toBe('No allocations specified')
  })

  it('bulk marks allocations as paid', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })

    const result = await bulkMarkPaid(['a', 'b', 'c'])
    expect(result.success).toBe(true)
    expect(result.paidCount).toBe(3)
    expect(mockPrisma.bonusAllocation.updateMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})
