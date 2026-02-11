import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// Mock the auth module
vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

type MockedAuth = Mock<
  () => Promise<{ user: { id: string; role: string }; expires: string } | null>
>

// Mock the prisma client
vi.mock('@/backend/prisma/client', () => ({
  default: {
    $transaction: vi.fn(),
    client: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    clientPlatform: {
      createMany: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))

// Mock notifications
vi.mock('@/backend/services/notifications', () => ({
  notifyRole: vi.fn(),
}))

// Mock logger
vi.mock('@/backend/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import {
  submitPrequalification,
  updateGmailCredentials,
} from '@/app/actions/prequal'

const mockedAuth = auth as unknown as MockedAuth

describe('submitPrequalification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: stale session check passes
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as never)
  })

  const createFormData = (data: Record<string, string>): FormData => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return formData
  }

  const validPrequalData = {
    firstName: 'John',
    lastName: 'Doe',
    gmailAccount: 'john.doe@gmail.com',
    gmailPassword: 'SecurePass123',
    phone: '(555) 123-4567',
    agentConfirmsId: 'true',
  }

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData(validPrequalData)
    const result = await submitPrequalification({}, formData)

    expect(result.message).toBe(
      'You must be logged in to submit pre-qualification',
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns validation errors for missing required fields', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      firstName: '',
      lastName: 'Doe',
      gmailAccount: 'john@gmail.com',
      gmailPassword: 'pass',
      agentConfirmsId: 'true',
    })

    const result = await submitPrequalification({}, formData)

    expect(result.errors?.firstName).toBeDefined()
  })

  it('returns validation error when agentConfirmsId is false', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      ...validPrequalData,
      agentConfirmsId: 'false',
    })

    const result = await submitPrequalification({}, formData)

    expect(result.errors?.agentConfirmsId).toBeDefined()
  })

  it('returns validation error for invalid gmail', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      ...validPrequalData,
      gmailAccount: 'not-an-email',
    })

    const result = await submitPrequalification({}, formData)

    expect(result.errors?.gmailAccount).toBeDefined()
  })

  it('blocks submission when ID is expired', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      ...validPrequalData,
      idExpiry: '2020-01-01',
    })

    const result = await submitPrequalification({}, formData)

    expect(result.message).toBe('Cannot submit — ID is expired')
  })

  it('creates client with BetMGM PENDING_REVIEW on success', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    let createdPlatforms: { platformType: string; status: string }[] = []

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        client: {
          create: vi.fn().mockResolvedValue({ id: 'client-123' }),
        },
        clientPlatform: {
          createMany: vi.fn().mockImplementation(({ data }) => {
            createdPlatforms = data
            return { count: data.length }
          }),
        },
        eventLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx as never)
    })

    const formData = createFormData(validPrequalData)
    const result = await submitPrequalification({}, formData)

    expect(result.clientId).toBe('client-123')
    expect(prisma.$transaction).toHaveBeenCalled()

    // Verify BetMGM gets PENDING_REVIEW, others get NOT_STARTED
    const betmgm = createdPlatforms.find(
      (p) => p.platformType === 'BETMGM',
    )
    expect(betmgm?.status).toBe('PENDING_REVIEW')

    const others = createdPlatforms.filter(
      (p) => p.platformType !== 'BETMGM',
    )
    others.forEach((p) => {
      expect(p.status).toBe('NOT_STARTED')
    })
  })

  it('creates 11 platform records', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    let platformCount = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        client: {
          create: vi.fn().mockResolvedValue({ id: 'client-123' }),
        },
        clientPlatform: {
          createMany: vi.fn().mockImplementation(({ data }) => {
            platformCount = data.length
            return { count: data.length }
          }),
        },
        eventLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx as never)
    })

    const formData = createFormData(validPrequalData)
    await submitPrequalification({}, formData)

    expect(platformCount).toBe(11)
  })

  it('does NOT redirect after success (stays on page)', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        client: {
          create: vi.fn().mockResolvedValue({ id: 'client-123' }),
        },
        clientPlatform: {
          createMany: vi.fn().mockResolvedValue({ count: 11 }),
        },
        eventLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx as never)
    })

    const formData = createFormData(validPrequalData)
    const result = await submitPrequalification({}, formData)

    // Should return clientId, NOT redirect
    expect(result.clientId).toBe('client-123')
    expect(result.message).toBeUndefined()
  })
})

describe('updateGmailCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createFormData = (data: Record<string, string>): FormData => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return formData
  }

  it('returns error when not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData({
      clientId: 'client-123',
      gmailAccount: 'new@gmail.com',
      gmailPassword: 'newpass',
    })

    const result = await updateGmailCredentials({}, formData)

    expect(result.success).toBe(false)
    expect(result.message).toBe('You must be logged in')
  })

  it('validates required fields', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      clientId: 'client-123',
      gmailAccount: '',
      gmailPassword: 'pass',
    })

    const result = await updateGmailCredentials({}, formData)

    expect(result.success).toBe(false)
  })

  it('updates gmail credentials on success', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.update).mockResolvedValue({} as never)

    const formData = createFormData({
      clientId: 'client-123',
      gmailAccount: 'updated@gmail.com',
      gmailPassword: 'newpass123',
    })

    const result = await updateGmailCredentials({}, formData)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Gmail credentials updated')
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-123', agentId: 'user-123' },
      data: {
        gmailAccount: 'updated@gmail.com',
        gmailPassword: 'newpass123',
      },
    })
  })
})
