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
    client: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    clientPlatform: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { notifyRole } from '@/backend/services/notifications'
import { retryBetmgmSubmission } from '@/app/actions/betmgm-retry'

const mockedAuth = auth as unknown as MockedAuth

describe('retryBetmgmSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(false)
    expect(result.message).toBe('You must be logged in')
  })

  it('returns error when client not found', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(false)
    expect(result.message).toBe('Client not found')
  })

  it('returns error when agent doesn\'t own client', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'other-agent-456',
      firstName: 'John',
      lastName: 'Doe',
    } as never)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(false)
    expect(result.message).toBe('You are not assigned to this client')
  })

  it('returns error when BetMGM is not RETRY_PENDING', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-123',
      firstName: 'John',
      lastName: 'Doe',
    } as never)

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'PENDING_REVIEW',
      retryAfter: null,
      retryCount: 0,
    } as never)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(false)
    expect(result.message).toBe('BetMGM is not in retry-pending state')
  })

  it('returns error when cooldown has not passed', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-123',
      firstName: 'John',
      lastName: 'Doe',
    } as never)

    // retryAfter in the future
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'RETRY_PENDING',
      retryAfter: futureDate,
      retryCount: 1,
    } as never)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(false)
    expect(result.message).toBe('Retry cooldown has not expired yet')
  })

  it('returns error when no screenshots provided', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-123',
      firstName: 'John',
      lastName: 'Doe',
    } as never)

    const pastDate = new Date(Date.now() - 60 * 60 * 1000)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'RETRY_PENDING',
      retryAfter: pastDate,
      retryCount: 1,
    } as never)

    const result = await retryBetmgmSubmission('client-123', 'success', [])

    expect(result.success).toBe(false)
    expect(result.message).toBe('At least one screenshot is required')
  })

  it('successfully resubmits BetMGM', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'agent-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-123',
      firstName: 'John',
      lastName: 'Doe',
    } as never)

    const pastDate = new Date(Date.now() - 60 * 60 * 1000)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'RETRY_PENDING',
      retryAfter: pastDate,
      retryCount: 1,
    } as never)

    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await retryBetmgmSubmission('client-123', 'success', ['url1'])

    expect(result.success).toBe(true)

    expect(prisma.clientPlatform.update).toHaveBeenCalledWith({
      where: { id: 'platform-123' },
      data: expect.objectContaining({
        status: 'PENDING_REVIEW',
        retryCount: 2,
        screenshots: ['url1'],
        agentResult: 'success',
      }),
    })

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'PLATFORM_STATUS_CHANGE',
        clientId: 'client-123',
        oldValue: 'RETRY_PENDING',
        newValue: 'PENDING_REVIEW',
      }),
    })

    expect(notifyRole).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'BetMGM resubmitted for review',
      }),
    )
  })
})
