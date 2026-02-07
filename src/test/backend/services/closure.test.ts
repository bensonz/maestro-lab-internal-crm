import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
    toDo: {
      updateMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { verifyZeroBalances, closeClient } from '@/backend/services/closure'
import { closeClientAction, checkBalancesAction } from '@/app/actions/closure'
import { IntakeStatus, TransactionType } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<{
  id: string
  intakeStatus: IntakeStatus
  closedAt: Date | null
  closureReason: string | null
  closureProof: string[]
  closedById: string | null
}> = {}) {
  return {
    id: overrides.id ?? 'client-1',
    intakeStatus: overrides.intakeStatus ?? IntakeStatus.APPROVED,
    closedAt: overrides.closedAt ?? null,
    closureReason: overrides.closureReason ?? null,
    closureProof: overrides.closureProof ?? [],
    closedById: overrides.closedById ?? null,
  }
}

function makeTransaction(overrides: {
  type: TransactionType
  amount: number
  platformType?: string
}) {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 8),
    type: overrides.type,
    amount: overrides.amount,
    platformType: overrides.platformType ?? 'DRAFTKINGS',
    status: 'completed',
  }
}

// ── verifyZeroBalances ───────────────────────────────────────────────────────

describe('verifyZeroBalances', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns allZero: true when all platforms have zero balance', async () => {
    // Two deposits and matching withdrawals across platforms
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 100, platformType: 'DRAFTKINGS' }),
      makeTransaction({ type: TransactionType.WITHDRAWAL, amount: 100, platformType: 'DRAFTKINGS' }),
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 50, platformType: 'FANDUEL' }),
      makeTransaction({ type: TransactionType.WITHDRAWAL, amount: 50, platformType: 'FANDUEL' }),
    ] as never)

    const result = await verifyZeroBalances('client-1')

    expect(result.allZero).toBe(true)
    expect(result.breakdown.DRAFTKINGS.balance).toBeCloseTo(0, 2)
    expect(result.breakdown.FANDUEL.balance).toBeCloseTo(0, 2)
  })

  it('returns allZero: false when some platforms have non-zero balances', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 100, platformType: 'DRAFTKINGS' }),
      makeTransaction({ type: TransactionType.WITHDRAWAL, amount: 50, platformType: 'DRAFTKINGS' }),
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 200, platformType: 'FANDUEL' }),
      makeTransaction({ type: TransactionType.WITHDRAWAL, amount: 200, platformType: 'FANDUEL' }),
    ] as never)

    const result = await verifyZeroBalances('client-1')

    expect(result.allZero).toBe(false)
    expect(result.breakdown.DRAFTKINGS.balance).toBeCloseTo(50, 2)
    expect(result.breakdown.FANDUEL.balance).toBeCloseTo(0, 2)
  })

  it('returns allZero: true when no transactions exist (new client)', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)

    const result = await verifyZeroBalances('client-1')

    expect(result.allZero).toBe(true)
    expect(Object.keys(result.breakdown)).toHaveLength(0)
  })
})

// ── closeClient ──────────────────────────────────────────────────────────────

describe('closeClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('happy path: closes APPROVED client with zero balances', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    // verifyZeroBalances — no transactions
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 2 } as never)

    const result = await closeClient({
      clientId: 'client-1',
      closedById: 'user-1',
      reason: 'Client requested to end partnership',
    })

    expect(result.success).toBe(true)

    // Verify client update was called with correct data
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: expect.objectContaining({
        intakeStatus: IntakeStatus.PARTNERSHIP_ENDED,
        closureReason: 'Client requested to end partnership',
        closedById: 'user-1',
        closureProof: [],
      }),
    })

    // Verify event log was created
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        clientId: 'client-1',
        userId: 'user-1',
        oldValue: IntakeStatus.APPROVED,
        newValue: IntakeStatus.PARTNERSHIP_ENDED,
      }),
    })

    // Verify open todos were cancelled
    expect(prisma.toDo.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    })
  })

  it('rejects non-APPROVED client', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient({ intakeStatus: IntakeStatus.PENDING }) as never,
    )

    const result = await closeClient({
      clientId: 'client-1',
      closedById: 'user-1',
      reason: 'Test',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('PENDING')
    expect(result.error).toContain('Only APPROVED clients')
    expect(prisma.client.update).not.toHaveBeenCalled()
  })

  it('rejects non-zero balances', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 150, platformType: 'BETMGM' }),
    ] as never)

    const result = await closeClient({
      clientId: 'client-1',
      closedById: 'user-1',
      reason: 'Test',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Non-zero balances')
    expect(result.error).toContain('BETMGM')
    expect(prisma.client.update).not.toHaveBeenCalled()
  })

  it('admin skip balance check bypasses balance verification', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    // NOTE: No transaction mock needed — balance check is skipped
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 0 } as never)

    const result = await closeClient({
      clientId: 'client-1',
      closedById: 'admin-1',
      reason: 'Admin override closure',
      skipBalanceCheck: true,
    })

    expect(result.success).toBe(true)
    // transaction.findMany should NOT have been called
    expect(prisma.transaction.findMany).not.toHaveBeenCalled()
  })

  it('cancels only PENDING and IN_PROGRESS todos, not COMPLETED', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 2 } as never)

    await closeClient({
      clientId: 'client-1',
      closedById: 'user-1',
      reason: 'Test',
    })

    // The query only targets PENDING and IN_PROGRESS
    expect(prisma.toDo.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    })
  })

  it('passes proof URLs through to client update', async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 0 } as never)

    await closeClient({
      clientId: 'client-1',
      closedById: 'user-1',
      reason: 'Test',
      proofUrls: ['https://example.com/proof1.png', 'https://example.com/proof2.png'],
    })

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: expect.objectContaining({
        closureProof: ['https://example.com/proof1.png', 'https://example.com/proof2.png'],
      }),
    })
  })
})

// ── closeClientAction ────────────────────────────────────────────────────────

describe('closeClientAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns error when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const result = await closeClientAction({
      clientId: 'client-1',
      reason: 'Test',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error for AGENT role (insufficient permissions)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'agent-1', role: 'AGENT' },
    } as never)

    const result = await closeClientAction({
      clientId: 'client-1',
      reason: 'Test',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('returns error when BACKOFFICE tries to skip balance check', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
    } as never)

    const result = await closeClientAction({
      clientId: 'client-1',
      reason: 'Test',
      skipBalanceCheck: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins can skip balance verification')
  })

  it('allows ADMIN to skip balance check', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'ADMIN' },
    } as never)
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 0 } as never)

    const result = await closeClientAction({
      clientId: 'client-1',
      reason: 'Admin closure',
      skipBalanceCheck: true,
    })

    expect(result.success).toBe(true)
  })

  it('allows BACKOFFICE role to close clients', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'bo-1', role: 'BACKOFFICE' },
    } as never)
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValueOnce(
      makeClient() as never,
    )
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.client.update).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValueOnce({ count: 0 } as never)

    const result = await closeClientAction({
      clientId: 'client-1',
      reason: 'Backoffice closure',
    })

    expect(result.success).toBe(true)
  })
})

// ── checkBalancesAction ──────────────────────────────────────────────────────

describe('checkBalancesAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns error when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const result = await checkBalancesAction('client-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns balance breakdown when authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'BACKOFFICE' },
    } as never)
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      makeTransaction({ type: TransactionType.DEPOSIT, amount: 100, platformType: 'DRAFTKINGS' }),
    ] as never)

    const result = await checkBalancesAction('client-1')

    expect(result.success).toBe(true)
    expect(result).toHaveProperty('allZero', false)
    expect(result).toHaveProperty('breakdown')
  })
})
