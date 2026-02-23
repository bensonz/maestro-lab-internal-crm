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
