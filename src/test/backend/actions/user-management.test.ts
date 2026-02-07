import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// Mock the auth module
vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

type MockedAuth = Mock<() => Promise<{ user: { id: string; role: string }; expires: string } | null>>

// Mock the prisma client
vi.mock('@/backend/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    agentMetrics: {
      create: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn((password: string) => `hashed_${password}`),
  },
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import {
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
} from '@/app/actions/user-management'

const mockedAuth = auth as unknown as MockedAuth

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData({ name: 'Test', email: 'test@test.com', password: 'password123', role: 'AGENT' })
    const result = await createUser(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user has insufficient permissions', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'AGENT' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'AGENT',
    } as never)

    const formData = createFormData({ name: 'Test', email: 'test@test.com', password: 'password123', role: 'AGENT' })
    const result = await createUser(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('creates user with valid data', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never) // current user lookup
      .mockResolvedValueOnce(null as never) // email uniqueness check
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-1',
      email: 'test@test.com',
      role: 'BACKOFFICE',
    } as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const formData = createFormData({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123',
      role: 'BACKOFFICE',
      phone: '555-1234',
    })

    const result = await createUser(formData)

    expect(result.success).toBe(true)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test User',
        email: 'test@test.com',
        passwordHash: 'hashed_password123',
        role: 'BACKOFFICE',
        phone: '555-1234',
      }),
    })
  })

  it('returns error for duplicate email', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never) // current user
      .mockResolvedValueOnce({ id: 'existing' } as never) // email already taken

    const formData = createFormData({
      name: 'Test',
      email: 'taken@test.com',
      password: 'password123',
      role: 'AGENT',
    })

    const result = await createUser(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Email is already in use')
  })

  it('BACKOFFICE user cannot create ADMIN account', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      role: 'BACKOFFICE',
    } as never)

    const formData = createFormData({
      name: 'Admin Attempt',
      email: 'admin@test.com',
      password: 'password123',
      role: 'ADMIN',
    })

    const result = await createUser(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Backoffice users can only create Agent accounts')
  })

  it('creates AgentMetrics when role is AGENT', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce(null as never)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'agent-new',
      email: 'agent@test.com',
      role: 'AGENT',
    } as never)
    vi.mocked(prisma.agentMetrics.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const formData = createFormData({
      name: 'New Agent',
      email: 'agent@test.com',
      password: 'password123',
      role: 'AGENT',
    })

    const result = await createUser(formData)

    expect(result.success).toBe(true)
    expect(prisma.agentMetrics.create).toHaveBeenCalledWith({
      data: { agentId: 'agent-new' },
    })
  })

  it('does not create AgentMetrics for non-AGENT roles', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce(null as never)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'bo-new',
      email: 'bo@test.com',
      role: 'BACKOFFICE',
    } as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const formData = createFormData({
      name: 'BO User',
      email: 'bo@test.com',
      password: 'password123',
      role: 'BACKOFFICE',
    })

    await createUser(formData)

    expect(prisma.agentMetrics.create).not.toHaveBeenCalled()
  })

  it('returns error for password too short', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      role: 'ADMIN',
    } as never)

    const formData = createFormData({
      name: 'Test',
      email: 'test@test.com',
      password: 'short',
      role: 'AGENT',
    })

    const result = await createUser(formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Password must be at least 8 characters')
  })
})

describe('updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData({ name: 'Test', email: 'test@test.com' })
    const result = await updateUser('user-1', formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('updates user with valid data', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never) // current user
      .mockResolvedValueOnce({ id: 'user-1', role: 'AGENT', email: 'old@test.com' } as never) // target user
      .mockResolvedValueOnce(null as never) // email uniqueness check (new email not taken)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const formData = createFormData({
      name: 'Updated Name',
      email: 'new@test.com',
      role: 'AGENT',
      phone: '555-9999',
    })

    const result = await updateUser('user-1', formData)

    expect(result.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: 'Updated Name',
        email: 'new@test.com',
      }),
    })
  })

  it('cannot change own role', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' } as never)

    const formData = createFormData({
      name: 'Admin',
      email: 'admin@test.com',
      role: 'BACKOFFICE', // trying to change own role
    })

    const result = await updateUser('admin-1', formData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot change your own role')
  })
})

describe('toggleUserActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toggles user active to inactive', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce({ id: 'user-1', isActive: true, email: 'user@test.com' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await toggleUserActive('user-1')

    expect(result.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isActive: false },
    })
  })

  it('toggles user inactive to active', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce({ id: 'user-1', isActive: false, email: 'user@test.com' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await toggleUserActive('user-1')

    expect(result.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isActive: true },
    })
  })

  it('cannot deactivate yourself', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      role: 'ADMIN',
    } as never)

    const result = await toggleUserActive('admin-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot deactivate yourself')
  })

  it('only ADMIN can toggle user status', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      role: 'BACKOFFICE',
    } as never)

    const result = await toggleUserActive('user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins can toggle user status')
  })
})

describe('resetUserPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resets password with valid data', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never)
      .mockResolvedValueOnce({ id: 'user-1', role: 'AGENT', email: 'user@test.com' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const result = await resetUserPassword('user-1', 'newpassword123')

    expect(result.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'hashed_newpassword123' },
    })
  })

  it('returns error for password too short', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      role: 'ADMIN',
    } as never)

    const result = await resetUserPassword('user-1', 'short')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Password must be at least 8 characters')
  })

  it('BACKOFFICE can only reset AGENT passwords', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'BACKOFFICE' } as never) // current user
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' } as never) // target is ADMIN

    const result = await resetUserPassword('admin-1', 'newpassword123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Backoffice users can only reset Agent passwords')
  })

  it('BACKOFFICE can reset AGENT passwords', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
      expires: '',
    })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'BACKOFFICE' } as never)
      .mockResolvedValueOnce({ id: 'agent-1', role: 'AGENT', email: 'agent@test.com' } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const result = await resetUserPassword('agent-1', 'newpassword123')

    expect(result.success).toBe(true)
  })
})
