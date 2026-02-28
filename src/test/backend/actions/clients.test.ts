import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    client: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

// Mock star level service
const { mockRecalc } = vi.hoisted(() => ({
  mockRecalc: vi.fn(),
}))
vi.mock('@/backend/services/star-level', () => ({
  recalculateAgentStarLevel: mockRecalc,
}))

// Mock bonus pool service
const { mockCreatePool } = vi.hoisted(() => ({
  mockCreatePool: vi.fn(),
}))
vi.mock('@/backend/services/bonus-pool', () => ({
  createAndDistributeBonusPool: mockCreatePool,
}))

import { createClient, approveClient } from '@/app/actions/clients'

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.create.mockResolvedValue({ id: 'client-new' })
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const fd = new FormData()
    fd.set('firstName', 'Test')
    fd.set('lastName', 'User')

    const result = await createClient(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    const fd = new FormData()
    fd.set('firstName', 'Test')
    fd.set('lastName', 'User')

    const result = await createClient(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('requires first name and last name', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const fd = new FormData()

    const result = await createClient(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })

  it('creates client on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const fd = new FormData()
    fd.set('firstName', 'John')
    fd.set('lastName', 'Doe')
    fd.set('email', 'john@test.com')

    const result = await createClient(fd)
    expect(result.success).toBe(true)
    expect(result.clientId).toBe('client-new')
    expect(mockPrisma.client.create).toHaveBeenCalledTimes(1)
  })

  it('uses session user as default closerId for AGENT', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1', role: 'AGENT' } })
    const fd = new FormData()
    fd.set('firstName', 'John')
    fd.set('lastName', 'Doe')

    await createClient(fd)

    const createCall = mockPrisma.client.create.mock.calls[0][0]
    expect(createCall.data.closerId).toBe('agent-1')
  })
})

describe('approveClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockRecalc.mockResolvedValue({ starLevel: 1, changed: true })
    mockCreatePool.mockResolvedValue({
      poolId: 'pool-1',
      distributedSlices: 4,
      recycledSlices: 0,
    })
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await approveClient('client-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await approveClient('client-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error for non-existent client', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.client.findUnique.mockResolvedValue(null)

    const result = await approveClient('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client not found')
  })

  it('returns error if already approved', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      status: 'APPROVED',
      closerId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    })

    const result = await approveClient('client-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client already approved')
  })

  it('approves client, recalculates star level, creates bonus pool', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      status: 'PENDING',
      closerId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    })
    const result = await approveClient('client-1')
    expect(result.success).toBe(true)
    expect(result.poolId).toBe('pool-1')
    expect(result.distributedSlices).toBe(4)
    expect(result.recycledSlices).toBe(0)

    // Verify the chain: update client → log event → recalculate → create pool
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { status: 'APPROVED', approvedAt: expect.any(Date) },
    })
    // 2 event logs: audit log + agent notification
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(2)
    expect(mockRecalc).toHaveBeenCalledWith('agent-1')
    expect(mockCreatePool).toHaveBeenCalledWith('client-1', 'agent-1')
  })
})
