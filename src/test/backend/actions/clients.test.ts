import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// Mock the auth module
vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

// Type for mocked auth function
type MockedAuth = Mock<
  () => Promise<{ user: { id: string; role: string }; expires: string } | null>
>

// Mock the prisma client
vi.mock('@/backend/prisma/client', () => ({
  default: {
    $transaction: vi.fn(),
    client: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    clientPlatform: {
      createMany: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
    applicationDraft: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// Mock redirect (throws to stop execution)
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { redirect } from 'next/navigation'
import { createClient, deleteClient } from '@/app/actions/clients'
import { saveDraft, deleteDraft } from '@/app/actions/drafts'

const mockedAuth = auth as unknown as MockedAuth

describe('createClient', () => {
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

  const validFormData = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-123-4567',
    email: 'john@example.com',
    primaryAddress: '123 Main St',
    primaryCity: 'Austin',
    primaryState: 'TX',
    primaryZip: '78701',
    questionnaire: '{}',
    agentConfirmsSuitable: 'true',
  }

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData(validFormData)
    const result = await createClient({}, formData)

    expect(result.message).toBe('You must be logged in to create a client')
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
      phone: '555-1234',
      primaryAddress: '123 Main St',
      primaryCity: 'Austin',
      primaryState: 'TX',
      primaryZip: '78701',
      agentConfirmsSuitable: 'true',
    })

    const result = await createClient({}, formData)

    expect(result.errors?.firstName).toBeDefined()
  })

  it('returns validation error when agent confirmation is false', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const formData = createFormData({
      ...validFormData,
      agentConfirmsSuitable: 'false',
    })

    const result = await createClient({}, formData)

    expect(result.errors?.agentConfirmsSuitable).toBeDefined()
  })

  it('creates client and redirects on success', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    // Mock transaction to execute the callback
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

    const formData = createFormData(validFormData)

    // createClient should redirect on success, which throws
    await expect(createClient({}, formData)).rejects.toThrow(
      'REDIRECT:/agent/clients',
    )

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/agent/clients')
  })

  it('creates 11 platform records for new client', async () => {
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

    const formData = createFormData(validFormData)

    try {
      await createClient({}, formData)
    } catch {
      // Expected redirect throw
    }

    expect(platformCount).toBe(11)
  })
})

describe('saveDraft', () => {
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

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const formData = createFormData({ firstName: 'John' })
    const result = await saveDraft({}, formData)

    expect(result.message).toBe('You must be logged in to save a draft')
  })

  it('creates new draft when no draftId provided', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.create).mockResolvedValue({
      id: 'draft-123',
      formData: {},
      agentId: 'user-123',
      clientId: null,
      phase: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const formData = createFormData({
      firstName: 'John',
      lastName: 'Doe',
    })

    const result = await saveDraft({}, formData)

    expect(result.message).toBe('Draft saved successfully')
    expect(prisma.applicationDraft.create).toHaveBeenCalledWith({
      data: {
        formData: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
        agentId: 'user-123',
        clientId: null,
        phase: 1,
      },
    })
  })

  it('updates existing draft when draftId provided', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.update).mockResolvedValue({
      id: 'draft-123',
      formData: {},
      agentId: 'user-123',
      clientId: null,
      phase: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const formData = createFormData({
      draftId: 'draft-123',
      firstName: 'John',
      lastName: 'Doe',
    })

    const result = await saveDraft({}, formData)

    expect(result.message).toBe('Draft saved successfully')
    expect(prisma.applicationDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-123', agentId: 'user-123' },
      data: {
        formData: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
        clientId: null,
        phase: 1,
      },
    })
  })

  it('returns error message on database failure', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.create).mockRejectedValue(
      new Error('Database error'),
    )

    const formData = createFormData({ firstName: 'John' })
    const result = await saveDraft({}, formData)

    expect(result.message).toBe('Failed to save draft')
  })
})

describe('deleteDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success false when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await deleteDraft('draft-123')

    expect(result.success).toBe(false)
  })

  it('deletes draft and returns success', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.delete).mockResolvedValue({
      id: 'draft-123',
      formData: {},
      agentId: 'user-123',
      clientId: null,
      phase: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await deleteDraft('draft-123')

    expect(result.success).toBe(true)
    expect(prisma.applicationDraft.delete).toHaveBeenCalledWith({
      where: { id: 'draft-123', agentId: 'user-123' },
    })
  })

  it('only deletes drafts owned by the authenticated user', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-456', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.delete).mockResolvedValue({
      id: 'draft-123',
      formData: {},
      agentId: 'user-456',
      clientId: null,
      phase: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await deleteDraft('draft-123')

    expect(prisma.applicationDraft.delete).toHaveBeenCalledWith({
      where: { id: 'draft-123', agentId: 'user-456' },
    })
  })

  it('returns success false on database error', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.applicationDraft.delete).mockRejectedValue(
      new Error('Not found'),
    )

    const result = await deleteDraft('draft-123')

    expect(result.success).toBe(false)
  })
})

describe('deleteClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when user is not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await deleteClient('client-123')

    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(prisma.client.delete).not.toHaveBeenCalled()
  })

  it('returns error when client is not found', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)

    const result = await deleteClient('nonexistent')

    expect(result).toEqual({ success: false, error: 'Client not found' })
    expect(prisma.client.delete).not.toHaveBeenCalled()
  })

  it('returns error when agent does not own the client', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'other-agent',
      intakeStatus: 'PENDING',
    } as never)

    const result = await deleteClient('client-123')

    expect(result).toEqual({ success: false, error: 'Not your client' })
    expect(prisma.client.delete).not.toHaveBeenCalled()
  })

  it('returns error when client is not PENDING', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'user-123',
      intakeStatus: 'APPROVED',
    } as never)

    const result = await deleteClient('client-123')

    expect(result).toEqual({
      success: false,
      error: 'Only pending clients can be deleted',
    })
    expect(prisma.client.delete).not.toHaveBeenCalled()
  })

  it('deletes PENDING client owned by the agent', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'user-123',
      intakeStatus: 'PENDING',
    } as never)
    vi.mocked(prisma.client.delete).mockResolvedValue({} as never)

    const result = await deleteClient('client-123')

    expect(result).toEqual({ success: true })
    expect(prisma.client.delete).toHaveBeenCalledWith({
      where: { id: 'client-123' },
    })
  })

  it('blocks deletion for non-PENDING statuses', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    for (const status of [
      'PHONE_ISSUED',
      'IN_EXECUTION',
      'READY_FOR_APPROVAL',
      'APPROVED',
      'REJECTED',
    ]) {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        agentId: 'user-123',
        intakeStatus: status,
      } as never)

      const result = await deleteClient('client-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only pending clients can be deleted')
    }

    expect(prisma.client.delete).not.toHaveBeenCalled()
  })
})
