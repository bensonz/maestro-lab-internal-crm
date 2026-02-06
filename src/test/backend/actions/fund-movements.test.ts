import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    fundMovement: {
      create: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/platforms', () => ({
  PLATFORM_INFO: {
    BANK: { name: 'Bank', abbrev: 'BNK', category: 'financial' },
    PAYPAL: { name: 'PayPal', abbrev: 'PP', category: 'financial' },
    EDGEBOOST: { name: 'EdgeBoost', abbrev: 'EB', category: 'financial' },
    DRAFTKINGS: { name: 'DraftKings', abbrev: 'DK', category: 'sports' },
    FANDUEL: { name: 'FanDuel', abbrev: 'FD', category: 'sports' },
    BETMGM: { name: 'BetMGM', abbrev: 'MGM', category: 'sports' },
    CAESARS: { name: 'Caesars', abbrev: 'CZR', category: 'sports' },
    FANATICS: { name: 'Fanatics', abbrev: 'FAN', category: 'sports' },
    BALLYBET: { name: 'Bally Bet', abbrev: 'BB', category: 'sports' },
    BETRIVERS: { name: 'BetRivers', abbrev: 'BR', category: 'sports' },
    BET365: { name: 'Bet365', abbrev: '365', category: 'sports' },
  },
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { recordFundMovement } from '@/app/actions/fund-movements'

function mockAuth(userId: string | null, role?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId
      ? ({ user: { id: userId, role } } as never)
      : null
  )
}

function mockUserRole(role: string) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ role } as never)
}

function mockClientExists(id: string) {
  vi.mocked(prisma.client.findUnique).mockResolvedValue({ id } as never)
}

const validData = {
  type: 'internal' as const,
  flowType: 'same_client' as const,
  fromClientId: 'client-1',
  fromPlatform: 'Bank',
  toPlatform: 'DraftKings',
  amount: 100,
}

describe('recordFundMovement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when unauthenticated', async () => {
    mockAuth(null)

    const result = await recordFundMovement(validData)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user has wrong role', async () => {
    mockAuth('user-1')
    mockUserRole('AGENT')

    const result = await recordFundMovement(validData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin or backoffice role required')
  })

  it('returns error for zero amount', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, amount: 0 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Amount must be greater than 0')
  })

  it('returns error for negative amount', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, amount: -50 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Amount must be greater than 0')
  })

  it('returns error for invalid source platform', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, fromPlatform: 'InvalidPlatform' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid source platform')
  })

  it('returns error for invalid destination platform', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, toPlatform: 'InvalidPlatform' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid destination platform')
  })

  it('returns error when source client does not exist', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)

    const result = await recordFundMovement(validData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Source client not found')
  })

  it('succeeds for valid same_client flow', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')
    mockClientExists('client-1')
    vi.mocked(prisma.fundMovement.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await recordFundMovement(validData)

    expect(result.success).toBe(true)
    expect(prisma.fundMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'internal',
        flowType: 'same_client',
        fromClientId: 'client-1',
        toClientId: 'client-1',
        fromPlatform: 'Bank',
        toPlatform: 'DraftKings',
        amount: 100,
        recordedById: 'user-1',
      }),
    })
  })

  it('succeeds for valid different_clients flow', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    // First call for fromClient, second for toClient
    vi.mocked(prisma.client.findUnique)
      .mockResolvedValueOnce({ id: 'client-1' } as never)
      .mockResolvedValueOnce({ id: 'client-2' } as never)

    vi.mocked(prisma.fundMovement.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await recordFundMovement({
      ...validData,
      flowType: 'different_clients',
      toClientId: 'client-2',
    })

    expect(result.success).toBe(true)
    expect(prisma.fundMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        flowType: 'different_clients',
        fromClientId: 'client-1',
        toClientId: 'client-2',
      }),
    })
  })

  it('returns error when destination client missing for different_clients flow', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')
    mockClientExists('client-1')

    const result = await recordFundMovement({
      ...validData,
      flowType: 'different_clients',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Destination client is required')
  })

  it('returns error when destination client does not exist', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    vi.mocked(prisma.client.findUnique)
      .mockResolvedValueOnce({ id: 'client-1' } as never)
      .mockResolvedValueOnce(null)

    const result = await recordFundMovement({
      ...validData,
      flowType: 'different_clients',
      toClientId: 'nonexistent',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Destination client not found')
  })

  it('allows ADMIN role', async () => {
    mockAuth('admin-1')
    mockUserRole('ADMIN')
    mockClientExists('client-1')
    vi.mocked(prisma.fundMovement.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const result = await recordFundMovement(validData)

    expect(result.success).toBe(true)
  })

  it('returns error for missing fromClientId', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, fromClientId: '' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Source client is required')
  })

  it('returns error for invalid transfer method', async () => {
    mockAuth('user-1')
    mockUserRole('BACKOFFICE')

    const result = await recordFundMovement({ ...validData, method: 'bitcoin' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid transfer method')
  })
})
