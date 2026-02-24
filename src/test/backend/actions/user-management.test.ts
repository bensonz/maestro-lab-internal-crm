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
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import {
  createUser,
  updateUser,
  updateAgentField,
  toggleUserActive,
  resetUserPassword,
} from '@/app/actions/user-management'

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'user-new' })
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('email', 'test@test.com')
    fd.set('password', 'password123')
    fd.set('role', 'AGENT')

    const result = await createUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', name: 'A' } })
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('email', 'test@test.com')
    fd.set('password', 'password123')
    fd.set('role', 'AGENT')

    const result = await createUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('requires all fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const fd = new FormData()

    const result = await createUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })

  it('rejects duplicate email', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })

    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('email', 'existing@test.com')
    fd.set('password', 'password123')
    fd.set('role', 'AGENT')

    const result = await createUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })

  it('creates user on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })

    const fd = new FormData()
    fd.set('name', 'New Agent')
    fd.set('email', 'new@test.com')
    fd.set('password', 'password123')
    fd.set('role', 'AGENT')

    const result = await createUser(fd)
    expect(result.success).toBe(true)
    expect(result.userId).toBe('user-new')
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)
  })
})

describe('updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Old Name',
      email: 'old@test.com',
    })
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await updateUser('user-1', new FormData())
    expect(result.success).toBe(false)
  })

  it('rejects non-admin users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE', name: 'BO' } })
    const result = await updateUser('user-1', new FormData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('returns error for non-existent user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await updateUser('user-nonexistent', new FormData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('User not found')
  })

  it('updates user on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })

    const fd = new FormData()
    fd.set('name', 'New Name')

    const result = await updateUser('user-1', fd)
    expect(result.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
  })
})

describe('toggleUserActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await toggleUserActive('user-1')
    expect(result.success).toBe(false)
  })

  it('toggles active status', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      isActive: true,
    })

    const result = await toggleUserActive('user-1')
    expect(result.success).toBe(true)
    expect(result.isActive).toBe(false)

    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect(updateCall.data.isActive).toBe(false)
  })
})

describe('resetUserPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await resetUserPassword('user-1', 'newpass123')
    expect(result.success).toBe(false)
  })

  it('requires minimum password length', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const result = await resetUserPassword('user-1', 'short')
    expect(result.success).toBe(false)
    expect(result.error).toContain('8 characters')
  })

  it('resets password on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Test' })

    const result = await resetUserPassword('user-1', 'newpassword123')
    expect(result.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
  })
})

describe('updateAgentField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'agent-1', name: 'Marcus Rivera' })
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await updateAgentField('agent-1', 'companyPhone', '111', '222')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-admin/backoffice users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', name: 'Agent' } })
    const result = await updateAgentField('agent-1', 'companyPhone', '111', '222')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authorized')
  })

  it('allows ADMIN users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const result = await updateAgentField('agent-1', 'companyPhone', '111', '222')
    expect(result.success).toBe(true)
  })

  it('allows BACKOFFICE users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE', name: 'BO' } })
    const result = await updateAgentField('agent-1', 'companyPhone', '111', '222')
    expect(result.success).toBe(true)
  })

  it('rejects non-whitelisted fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const result = await updateAgentField('agent-1', 'email', 'old@test.com', 'new@test.com')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not editable')
  })

  it('returns error for non-existent agent', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await updateAgentField('nonexistent', 'companyPhone', '111', '222')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Agent not found')
  })

  it('updates the correct DB column and creates event log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Sarah Chen' } })

    const result = await updateAgentField('agent-1', 'companyPhone', '917-979-2293', '917-898-2222')
    expect(result.success).toBe(true)

    // Check user update with correct column
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { companyPhone: '917-898-2222' },
    })

    // Check event log has field details
    const logCall = mockPrisma.eventLog.create.mock.calls[0][0]
    expect(logCall.data.eventType).toBe('USER_UPDATED')
    expect(logCall.data.description).toContain('Company Phone')
    expect(logCall.data.description).toContain('917-979-2293')
    expect(logCall.data.description).toContain('917-898-2222')
    expect(logCall.data.userId).toBe('u1')
    expect(logCall.data.metadata).toEqual({
      updatedUserId: 'agent-1',
      field: 'companyPhone',
      oldValue: '917-979-2293',
      newValue: '917-898-2222',
    })
  })

  it('trims whitespace from new value', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })

    await updateAgentField('agent-1', 'zelle', 'old@zelle.com', '  new@zelle.com  ')

    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect(updateCall.data.zelle).toBe('new@zelle.com')
  })

  it('sets field to null when new value is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })

    await updateAgentField('agent-1', 'carrier', 'T-Mobile', '  ')

    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect(updateCall.data.carrier).toBeNull()
  })

  it('works for all whitelisted fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })

    const fields = [
      'companyPhone', 'carrier', 'personalEmail', 'personalPhone',
      'zelle', 'address', 'loginAccount', 'idNumber', 'citizenship',
    ]

    for (const field of fields) {
      vi.clearAllMocks()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'agent-1', name: 'Test' })
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.eventLog.create.mockResolvedValue({})

      const result = await updateAgentField('agent-1', field, 'old', 'new')
      expect(result.success).toBe(true)
    }
  })
})
