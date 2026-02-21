import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('$2a$12$mockhash'),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      create: vi.fn(),
    },
    agentApplication: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { approveApplication, rejectApplication } from '@/app/actions/application-review'

const MOCK_APP = {
  id: 'app-1',
  status: 'PENDING',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '(555) 123-4567',
  password: '$2a$12$hashedpw',
  gender: 'Male',
  dateOfBirth: new Date('1995-01-01'),
  citizenship: 'US',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'US',
  idDocument: '/uploads/id.jpg',
  addressDocument: '/uploads/address-proof.jpg',
  idNumber: 'DL-123',
  idExpiry: new Date('2029-01-01'),
  zelle: 'john@zelle.com',
  referredByName: 'Marcus',
}

describe('approveApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.agentApplication.findUnique.mockResolvedValue(MOCK_APP)
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-new',
      name: 'John Doe',
      email: 'john@example.com',
    })
    mockPrisma.agentApplication.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await approveApplication('app-1', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin/backoffice users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', name: 'A' } })
    const result = await approveApplication('app-1', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error for non-existent application', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.agentApplication.findUnique.mockResolvedValue(null)

    const result = await approveApplication('app-nonexistent', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Application not found')
  })

  it('returns error for already reviewed application', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.agentApplication.findUnique.mockResolvedValue({
      ...MOCK_APP,
      status: 'APPROVED',
    })

    const result = await approveApplication('app-1', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Application has already been reviewed')
  })

  it('creates user and updates application on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' } })

    const result = await approveApplication('app-1', {
      supervisorId: 'sup-1',
      tier: 'rising',
      notes: 'Good candidate',
    })

    expect(result.success).toBe(true)
    expect(result.user).toEqual({
      id: 'user-new',
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Verify user creation
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1)
    const userCreate = mockPrisma.user.create.mock.calls[0][0]
    expect(userCreate.data.email).toBe('john@example.com')
    expect(userCreate.data.role).toBe('AGENT')
    expect(userCreate.data.supervisorId).toBe('sup-1')
    expect(userCreate.data.tier).toBe('rising')
    expect(userCreate.data.idDocument).toBe('/uploads/id.jpg')
    expect(userCreate.data.addressDocument).toBe('/uploads/address-proof.jpg')

    // Verify application update
    expect(mockPrisma.agentApplication.update).toHaveBeenCalledTimes(1)
    const appUpdate = mockPrisma.agentApplication.update.mock.calls[0][0]
    expect(appUpdate.data.status).toBe('APPROVED')
    expect(appUpdate.data.reviewedById).toBe('admin-1')
    expect(appUpdate.data.resultUserId).toBe('user-new')

    // Verify event log
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })

  it('allows BACKOFFICE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'bo-1', role: 'BACKOFFICE', name: 'BO' } })

    const result = await approveApplication('app-1', {})
    expect(result.success).toBe(true)
  })
})

describe('rejectApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.agentApplication.findUnique.mockResolvedValue(MOCK_APP)
    mockPrisma.agentApplication.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await rejectApplication('app-1', 'Bad candidate')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin/backoffice users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', name: 'A' } })
    const result = await rejectApplication('app-1', 'Bad')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('requires a reason', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const result = await rejectApplication('app-1', '')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Rejection reason is required')
  })

  it('returns error for already reviewed application', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.agentApplication.findUnique.mockResolvedValue({
      ...MOCK_APP,
      status: 'REJECTED',
    })

    const result = await rejectApplication('app-1', 'Bad candidate')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Application has already been reviewed')
  })

  it('updates application and logs event on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' } })

    const result = await rejectApplication('app-1', 'Failed background check')

    expect(result.success).toBe(true)

    expect(mockPrisma.agentApplication.update).toHaveBeenCalledTimes(1)
    const update = mockPrisma.agentApplication.update.mock.calls[0][0]
    expect(update.data.status).toBe('REJECTED')
    expect(update.data.reviewNotes).toBe('Failed background check')
    expect(update.data.reviewedById).toBe('admin-1')

    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})
