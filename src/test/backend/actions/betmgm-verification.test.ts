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

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import {
  verifyBetmgmManual,
  checkBetmgmStatus,
} from '@/app/actions/betmgm-verification'

const mockedAuth = auth as unknown as MockedAuth

describe('verifyBetmgmManual', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(false)
    expect(result.message).toBe('You must be logged in')
  })

  it('rejects non-backoffice users', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'AGENT',
    } as never)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'Only backoffice or admin can verify BetMGM accounts',
    )
  })

  it('returns error when platform not found', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'BACKOFFICE' },
      expires: '',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'BACKOFFICE',
    } as never)

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue(null)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(false)
    expect(result.message).toBe('BetMGM platform record not found')
  })

  it('returns success if already verified', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'BACKOFFICE' },
      expires: '',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'BACKOFFICE',
    } as never)

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'VERIFIED',
    } as never)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(true)
    expect(result.message).toBe('BetMGM is already verified')
  })

  it('verifies BetMGM and creates event log', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'BACKOFFICE' },
      expires: '',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'BACKOFFICE',
    } as never)

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'PENDING_REVIEW',
    } as never)

    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(true)
    expect(result.message).toBe('BetMGM account verified successfully')

    expect(prisma.clientPlatform.update).toHaveBeenCalledWith({
      where: { id: 'platform-123' },
      data: expect.objectContaining({
        status: 'VERIFIED',
        reviewedBy: 'user-123',
      }),
    })

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'PLATFORM_STATUS_CHANGE',
        clientId: 'client-123',
        oldValue: 'PENDING_REVIEW',
        newValue: 'VERIFIED',
      }),
    })
  })

  it('allows ADMIN role to verify', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'admin-123', role: 'ADMIN' },
      expires: '',
    })

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
    } as never)

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'platform-123',
      status: 'PENDING_REVIEW',
    } as never)

    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await verifyBetmgmManual('client-123')

    expect(result.success).toBe(true)
  })
})

describe('checkBetmgmStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns NOT_STARTED when not authenticated', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await checkBetmgmStatus('client-123')

    expect(result.status).toBe('NOT_STARTED')
    expect(result.verified).toBe(false)
  })

  it('returns NOT_STARTED when platform not found', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue(null)

    const result = await checkBetmgmStatus('client-123')

    expect(result.status).toBe('NOT_STARTED')
    expect(result.verified).toBe(false)
  })

  it('returns PENDING_REVIEW status', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      status: 'PENDING_REVIEW',
      retryAfter: null,
      retryCount: 0,
      reviewNotes: null,
    } as never)

    const result = await checkBetmgmStatus('client-123')

    expect(result.status).toBe('PENDING_REVIEW')
    expect(result.verified).toBe(false)
  })

  it('returns verified true when VERIFIED', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      status: 'VERIFIED',
      retryAfter: null,
      retryCount: 0,
      reviewNotes: null,
    } as never)

    const result = await checkBetmgmStatus('client-123')

    expect(result.status).toBe('VERIFIED')
    expect(result.verified).toBe(true)
  })

  it('returns retry info for RETRY_PENDING status', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-123', role: 'AGENT' },
      expires: '',
    })

    const retryDate = new Date('2025-12-31')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      status: 'RETRY_PENDING',
      retryAfter: retryDate,
      retryCount: 1,
      reviewNotes: 'Bad screenshots',
    } as never)

    const result = await checkBetmgmStatus('client-123')

    expect(result.status).toBe('RETRY_PENDING')
    expect(result.verified).toBe(false)
    expect(result.retryAfter).toBe(retryDate.toISOString())
    expect(result.retryCount).toBe(1)
    expect(result.rejectionReason).toBe('Bad screenshots')
  })
})
