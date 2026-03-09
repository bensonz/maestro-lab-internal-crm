import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    clientRecord: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    phoneAssignment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
    systemConfig: {
      findMany: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import {
  assignAndSignOutDevice,
  returnDevice,
  reissueDevice,
} from '@/app/actions/phone-assignments'

describe('assignAndSignOutDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockPrisma.systemConfig.findMany.mockResolvedValue([])
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await assignAndSignOutDevice('draft-1', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await assignAndSignOutDevice('draft-1', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    const result = await assignAndSignOutDevice('draft-1', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error for empty phone number', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await assignAndSignOutDevice('draft-1', '  ')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Phone number is required')
  })

  it('returns error if draft not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientRecord.findUnique.mockResolvedValue(null)
    const result = await assignAndSignOutDevice('draft-999', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft not found')
  })

  it('returns error if draft has no deviceReservationDate', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientRecord.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      deviceReservationDate: null,
      firstName: 'Test',
      lastName: 'User',
    })
    const result = await assignAndSignOutDevice('draft-1', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft has no device reservation date')
  })

  it('returns error if draft already has active assignment', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientRecord.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      deviceReservationDate: '2026-02-20',
      firstName: 'Test',
      lastName: 'User',
    })
    mockPrisma.phoneAssignment.findFirst.mockResolvedValue({ id: 'pa-1' })
    const result = await assignAndSignOutDevice('draft-1', '555-1234')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft already has an active device assignment')
  })

  it('creates assignment with dueBackAt +3 days on success (ADMIN)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'bo-1', role: 'ADMIN' } })
    mockPrisma.clientRecord.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      deviceReservationDate: '2026-02-20',
      firstName: 'Sarah',
      lastName: 'Martinez',
    })
    mockPrisma.phoneAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.phoneAssignment.create.mockResolvedValue({ id: 'pa-new' })
    mockPrisma.clientRecord.update.mockResolvedValue({})

    const result = await assignAndSignOutDevice('draft-1', '(555) 123-4567', 'T-Mobile', 'IMEI-123')

    expect(result.success).toBe(true)
    expect(result.assignmentId).toBe('pa-new')

    // Verify creation call
    const createCall = mockPrisma.phoneAssignment.create.mock.calls[0][0]
    expect(createCall.data.phoneNumber).toBe('(555) 123-4567')
    expect(createCall.data.carrier).toBe('T-Mobile')
    expect(createCall.data.deviceId).toBe('IMEI-123')
    expect(createCall.data.clientRecordId).toBe('draft-1')
    expect(createCall.data.agentId).toBe('agent-1')
    expect(createCall.data.signedOutById).toBe('bo-1')
    expect(createCall.data.status).toBe('SIGNED_OUT')

    // dueBackAt should be ~3 days from now
    const dueBack = new Date(createCall.data.dueBackAt)
    const now = new Date()
    const diffHours = (dueBack.getTime() - now.getTime()) / (1000 * 60 * 60)
    expect(diffHours).toBeGreaterThan(71) // close to 72 hours
    expect(diffHours).toBeLessThan(73)

    // Verify draft auto-advanced to step 3
    expect(mockPrisma.clientRecord.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { step: 3 },
    })

    // Verify event logs (STEP_ADVANCED + DEVICE_SIGNED_OUT)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(2)
    const stepAdvancedCall = mockPrisma.eventLog.create.mock.calls[0][0]
    expect(stepAdvancedCall.data.eventType).toBe('STEP_ADVANCED')
    const logCall = mockPrisma.eventLog.create.mock.calls[1][0]
    expect(logCall.data.eventType).toBe('DEVICE_SIGNED_OUT')
    expect(logCall.data.userId).toBe('bo-1')
  })

  it('works for BACKOFFICE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'bo-1', role: 'BACKOFFICE' } })
    mockPrisma.clientRecord.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      deviceReservationDate: '2026-02-20',
      firstName: 'Test',
      lastName: 'User',
    })
    mockPrisma.phoneAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.phoneAssignment.create.mockResolvedValue({ id: 'pa-new' })
    mockPrisma.clientRecord.update.mockResolvedValue({})

    const result = await assignAndSignOutDevice('draft-1', '555-9999')
    expect(result.success).toBe(true)
  })
})

describe('returnDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockPrisma.phoneAssignment.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await returnDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await returnDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    const result = await returnDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error if assignment not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue(null)
    const result = await returnDevice('pa-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Assignment not found')
  })

  it('returns error if already returned', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue({
      id: 'pa-1',
      status: 'RETURNED',
      phoneNumber: '555-1234',
      clientRecordId: 'draft-1',
      agentId: 'agent-1',
      clientRecord: { firstName: 'Test', lastName: 'User' },
    })
    const result = await returnDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Device already returned')
  })

  it('marks assignment as RETURNED and logs event', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'bo-1', role: 'BACKOFFICE' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue({
      id: 'pa-1',
      status: 'SIGNED_OUT',
      phoneNumber: '(555) 123-4567',
      clientRecordId: 'draft-1',
      agentId: 'agent-1',
      clientRecord: { firstName: 'Sarah', lastName: 'Martinez' },
    })

    const result = await returnDevice('pa-1')

    expect(result.success).toBe(true)

    // Verify update call
    const updateCall = mockPrisma.phoneAssignment.update.mock.calls[0][0]
    expect(updateCall.where.id).toBe('pa-1')
    expect(updateCall.data.status).toBe('RETURNED')
    expect(updateCall.data.returnedAt).toBeInstanceOf(Date)

    // Verify event log
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
    const logCall = mockPrisma.eventLog.create.mock.calls[0][0]
    expect(logCall.data.eventType).toBe('DEVICE_RETURNED')
    expect(logCall.data.userId).toBe('bo-1')
    expect(logCall.data.description).toContain('Sarah Martinez')
  })
})

describe('reissueDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockPrisma.phoneAssignment.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await reissueDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await reissueDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
    const result = await reissueDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error if assignment not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue(null)
    const result = await reissueDevice('pa-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Assignment not found')
  })

  it('returns error if device is not RETURNED', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue({
      id: 'pa-1',
      status: 'SIGNED_OUT',
      phoneNumber: '555-1234',
      clientRecordId: 'draft-1',
      agentId: 'agent-1',
      clientRecord: { firstName: 'Test', lastName: 'User' },
    })
    const result = await reissueDevice('pa-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Device is not in RETURNED status')
  })

  it('sets assignment back to SIGNED_OUT, clears returnedAt, preserves original dueBackAt, and logs event', async () => {
    const originalDueBack = new Date('2026-02-27T12:00:00Z')
    mockAuth.mockResolvedValue({ user: { id: 'bo-1', role: 'BACKOFFICE' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue({
      id: 'pa-1',
      status: 'RETURNED',
      phoneNumber: '(555) 123-4567',
      clientRecordId: 'draft-1',
      agentId: 'agent-1',
      dueBackAt: originalDueBack,
      clientRecord: { firstName: 'Sarah', lastName: 'Martinez' },
    })

    const result = await reissueDevice('pa-1')

    expect(result.success).toBe(true)

    // Verify update call — status restored, returnedAt cleared, dueBackAt NOT changed
    const updateCall = mockPrisma.phoneAssignment.update.mock.calls[0][0]
    expect(updateCall.where.id).toBe('pa-1')
    expect(updateCall.data.status).toBe('SIGNED_OUT')
    expect(updateCall.data.returnedAt).toBeNull()
    expect(updateCall.data.dueBackAt).toBeUndefined()

    // Verify event log
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
    const logCall = mockPrisma.eventLog.create.mock.calls[0][0]
    expect(logCall.data.eventType).toBe('DEVICE_REISSUED')
    expect(logCall.data.userId).toBe('bo-1')
    expect(logCall.data.description).toContain('Sarah Martinez')
  })

  it('works for ADMIN role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockPrisma.phoneAssignment.findUnique.mockResolvedValue({
      id: 'pa-1',
      status: 'RETURNED',
      phoneNumber: '555-9999',
      clientRecordId: 'draft-1',
      agentId: 'agent-1',
      clientRecord: { firstName: 'Test', lastName: 'User' },
    })

    const result = await reissueDevice('pa-1')
    expect(result.success).toBe(true)
  })
})
