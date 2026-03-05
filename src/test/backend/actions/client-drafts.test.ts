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
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
    phoneAssignment: {
      deleteMany: vi.fn(),
    },
    todo: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import {
  createClientRecord,
  saveClientRecord,
  submitClientRecord,
  deleteClientRecord,
} from '@/app/actions/client-records'

describe('createClientRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.clientRecord.create.mockResolvedValue({ id: 'draft-1' })
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await createClientRecord()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('creates a draft and logs event', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    const result = await createClientRecord()

    expect(result.success).toBe(true)
    expect(result.draftId).toBe('draft-1')
    expect(mockPrisma.clientRecord.create).toHaveBeenCalledWith({
      data: {
        closerId: 'agent-1',
        step: 1,
        status: 'DRAFT',
      },
    })
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})

describe('saveClientRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.clientRecord.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await saveClientRecord('draft-1', { firstName: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error if draft not found (ownership check)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue(null)

    const result = await saveClientRecord('draft-999', { firstName: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft not found')
  })

  it('returns error if draft already submitted', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'SUBMITTED',
    })

    const result = await saveClientRecord('draft-1', { firstName: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft already submitted')
  })

  it('updates draft with allowed fields only', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
    })

    const result = await saveClientRecord('draft-1', {
      firstName: 'John',
      lastName: 'Doe',
      dangerousField: 'should-be-ignored',
    })

    expect(result.success).toBe(true)
    const updateCall = mockPrisma.clientRecord.update.mock.calls[0][0]
    expect(updateCall.data.firstName).toBe('John')
    expect(updateCall.data.lastName).toBe('Doe')
    expect(updateCall.data.dangerousField).toBeUndefined()
  })

  it('converts idExpiry string to Date', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
    })

    await saveClientRecord('draft-1', { idExpiry: '2028-06-15' })

    const updateCall = mockPrisma.clientRecord.update.mock.calls[0][0]
    expect(updateCall.data.idExpiry).toBeInstanceOf(Date)
  })

  it('converts dateOfBirth string to Date', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
    })

    await saveClientRecord('draft-1', { dateOfBirth: '1990-05-15' })

    const updateCall = mockPrisma.clientRecord.update.mock.calls[0][0]
    expect(updateCall.data.dateOfBirth).toBeInstanceOf(Date)
  })

  it('saves new Step 1 fields (gmailPassword, gmailScreenshot, betmgm credentials + screenshots, address)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
    })

    await saveClientRecord('draft-1', {
      gmailPassword: 'secret123',
      gmailScreenshot: '/uploads/gmail.png',
      betmgmLogin: 'john@gmail.com',
      betmgmPassword: 'B3tMGM!',
      betmgmRegScreenshot: '/uploads/betmgm-reg.png',
      betmgmLoginScreenshot: '/uploads/betmgm-login.png',
      address: '123 Main St',
    })

    const updateCall = mockPrisma.clientRecord.update.mock.calls[0][0]
    expect(updateCall.data.gmailPassword).toBe('secret123')
    expect(updateCall.data.gmailScreenshot).toBe('/uploads/gmail.png')
    expect(updateCall.data.betmgmLogin).toBe('john@gmail.com')
    expect(updateCall.data.betmgmPassword).toBe('B3tMGM!')
    expect(updateCall.data.betmgmRegScreenshot).toBe('/uploads/betmgm-reg.png')
    expect(updateCall.data.betmgmLoginScreenshot).toBe('/uploads/betmgm-login.png')
    expect(updateCall.data.address).toBe('123 Main St')
  })

  it('saves discoveredAddresses as JSON field', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
    })

    const addresses = [
      { address: '123 Main St, LA, CA', source: 'ID', confirmedByAgent: true },
      { address: '456 Oak Ave, Brooklyn, NY', source: 'PAYPAL' },
    ]
    await saveClientRecord('draft-1', { discoveredAddresses: addresses })

    const updateCall = mockPrisma.clientRecord.update.mock.calls[0][0]
    expect(updateCall.data.discoveredAddresses).toEqual(addresses)
  })
})

describe('submitClientRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.clientRecord.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await submitClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error if draft not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue(null)

    const result = await submitClientRecord('draft-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft not found')
  })

  it('returns error if draft already submitted', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'SUBMITTED',
    })

    const result = await submitClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft already submitted')
  })

  it('returns validation error if required fields missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
      firstName: null,
      lastName: null,
      contractDocument: null,
    })

    const result = await submitClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('marks record as submitted on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '555-0001',
      contractDocument: '/uploads/contract.pdf',
      agentConfidenceLevel: 'high',
    })

    const result = await submitClientRecord('draft-1')

    expect(result.success).toBe(true)

    expect(mockPrisma.clientRecord.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: {
        status: 'SUBMITTED',
      },
    })

    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})

describe('deleteClientRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.clientRecord.delete.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await deleteClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error if draft not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue(null)

    const result = await deleteClientRecord('draft-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Draft not found')
  })

  it('returns error if draft already submitted', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'SUBMITTED',
      idDocument: null,
    })

    const result = await deleteClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot delete submitted draft')
  })

  it('returns error if ID document has been uploaded', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
      idDocument: '/uploads/id-doc.jpg',
    })

    const result = await deleteClientRecord('draft-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot delete draft after ID has been uploaded')
    expect(mockPrisma.clientRecord.delete).not.toHaveBeenCalled()
  })

  it('deletes draft on success when no ID uploaded', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'agent-1' } })
    mockPrisma.clientRecord.findFirst.mockResolvedValue({
      id: 'draft-1',
      status: 'DRAFT',
      idDocument: null,
    })

    const result = await deleteClientRecord('draft-1')
    expect(result.success).toBe(true)
    expect(mockPrisma.clientRecord.delete).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
    })
  })
})
