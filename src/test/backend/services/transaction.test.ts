import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import {
  recordTransaction,
  recordTransactionFromFundMovement,
  recordCommissionTransaction,
  getClientBalance,
  getClientBalanceBreakdown,
  reverseTransaction,
  getTransactionHistory,
} from '@/backend/services/transaction'
import { TransactionType } from '@/types'

// ── recordTransaction ───────────────────────────────────────────────────────

describe('recordTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a transaction with all fields passed through', async () => {
    const input = {
      type: TransactionType.DEPOSIT,
      amount: 500,
      currency: 'EUR',
      status: 'pending',
      clientId: 'client-1',
      platformType: 'DRAFTKINGS' as const,
      fundMovementId: 'fm-1',
      bonusPoolId: 'bp-1',
      description: 'Test deposit',
      reference: 'REF-123',
      documentUrl: 'https://example.com/receipt.pdf',
      recordedById: 'user-1',
      metadata: { source: 'test' },
    }

    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'tx-1',
      ...input,
      createdAt: new Date(),
    } as never)

    await recordTransaction(input)

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        type: TransactionType.DEPOSIT,
        amount: 500,
        currency: 'EUR',
        status: 'pending',
        clientId: 'client-1',
        platformType: 'DRAFTKINGS',
        fundMovementId: 'fm-1',
        bonusPoolId: 'bp-1',
        description: 'Test deposit',
        reference: 'REF-123',
        documentUrl: 'https://example.com/receipt.pdf',
        recordedById: 'user-1',
        metadata: { source: 'test' },
      },
    })
  })

  it('defaults currency to USD and status to completed', async () => {
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({} as never)

    await recordTransaction({
      type: TransactionType.WITHDRAWAL,
      amount: 100,
      recordedById: 'user-1',
    })

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: 'USD',
        status: 'completed',
      }),
    })
  })
})

// ── recordTransactionFromFundMovement ────────────────────────────────────────

describe('recordTransactionFromFundMovement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'tx-new' } as never)
  })

  it('external deposit → 1 DEPOSIT transaction', async () => {
    await recordTransactionFromFundMovement(
      {
        id: 'fm-1',
        type: 'external',
        flowType: 'external',
        fromClientId: null,
        toClientId: 'client-1',
        fromPlatform: 'BANK',
        toPlatform: 'DRAFTKINGS',
        amount: 1000,
        currency: 'USD',
        fee: null,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.DEPOSIT,
        amount: 1000,
        clientId: 'client-1',
        platformType: 'DRAFTKINGS',
        fundMovementId: 'fm-1',
        description: 'External deposit',
      }),
    })
  })

  it('external withdrawal → 1 WITHDRAWAL transaction', async () => {
    await recordTransactionFromFundMovement(
      {
        id: 'fm-2',
        type: 'external',
        flowType: 'external',
        fromClientId: 'client-1',
        toClientId: null,
        fromPlatform: 'FANDUEL',
        toPlatform: 'BANK',
        amount: 300,
        currency: 'USD',
        fee: null,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.WITHDRAWAL,
        amount: 300,
        clientId: 'client-1',
        platformType: 'FANDUEL',
        fundMovementId: 'fm-2',
        description: 'External withdrawal',
      }),
    })
  })

  it('same_client → 1 INTERNAL_TRANSFER transaction', async () => {
    await recordTransactionFromFundMovement(
      {
        id: 'fm-3',
        type: 'internal',
        flowType: 'same_client',
        fromClientId: 'client-1',
        toClientId: 'client-1',
        fromPlatform: 'DRAFTKINGS',
        toPlatform: 'FANDUEL',
        amount: 250,
        currency: 'USD',
        fee: null,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.INTERNAL_TRANSFER,
        amount: 250,
        clientId: 'client-1',
        fundMovementId: 'fm-3',
        description: 'Internal transfer: DRAFTKINGS → FANDUEL',
      }),
    })
  })

  it('different_clients → 2 transactions (WITHDRAWAL + DEPOSIT)', async () => {
    await recordTransactionFromFundMovement(
      {
        id: 'fm-4',
        type: 'internal',
        flowType: 'different_clients',
        fromClientId: 'client-A',
        toClientId: 'client-B',
        fromPlatform: 'BETMGM',
        toPlatform: 'CAESARS',
        amount: 500,
        currency: 'USD',
        fee: null,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledTimes(2)

    // Withdrawal from source
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.WITHDRAWAL,
        amount: 500,
        clientId: 'client-A',
        platformType: 'BETMGM',
        fundMovementId: 'fm-4',
        description: 'Transfer to another client',
      }),
    })

    // Deposit to target
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.DEPOSIT,
        amount: 500,
        clientId: 'client-B',
        platformType: 'CAESARS',
        fundMovementId: 'fm-4',
        description: 'Transfer from another client',
      }),
    })
  })

  it('fund movement with fee → extra FEE transaction', async () => {
    await recordTransactionFromFundMovement(
      {
        id: 'fm-5',
        type: 'internal',
        flowType: 'same_client',
        fromClientId: 'client-1',
        toClientId: 'client-1',
        fromPlatform: 'DRAFTKINGS',
        toPlatform: 'FANDUEL',
        amount: 200,
        currency: 'USD',
        fee: 5,
      },
      'user-1',
    )

    // 1 INTERNAL_TRANSFER + 1 FEE = 2
    expect(prisma.transaction.create).toHaveBeenCalledTimes(2)

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.INTERNAL_TRANSFER,
        amount: 200,
      }),
    })

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.FEE,
        amount: 5,
        clientId: 'client-1',
        fundMovementId: 'fm-5',
        description: 'Transfer fee',
      }),
    })
  })
})

// ── getClientBalance ────────────────────────────────────────────────────────

describe('getClientBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates balance: deposits increase, withdrawals and fees decrease', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      { type: TransactionType.DEPOSIT, amount: 500 },
      { type: TransactionType.WITHDRAWAL, amount: 200 },
      { type: TransactionType.FEE, amount: 10 },
    ] as never)

    const result = await getClientBalance('client-1')

    expect(result.balance).toBe(290)
    expect(result.transactionCount).toBe(3)

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', status: 'completed' },
    })
  })

  it('filters by platformType when provided', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      { type: TransactionType.DEPOSIT, amount: 300 },
    ] as never)

    const result = await getClientBalance('client-1', 'DRAFTKINGS' as never)

    expect(result.balance).toBe(300)

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: 'completed',
        platformType: 'DRAFTKINGS',
      },
    })
  })
})

// ── getClientBalanceBreakdown ────────────────────────────────────────────────

describe('getClientBalanceBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns per-platform totals', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([
      { type: TransactionType.DEPOSIT, amount: 500, platformType: 'DRAFTKINGS' },
      { type: TransactionType.WITHDRAWAL, amount: 100, platformType: 'DRAFTKINGS' },
      { type: TransactionType.DEPOSIT, amount: 300, platformType: 'FANDUEL' },
      { type: TransactionType.FEE, amount: 20, platformType: 'FANDUEL' },
      { type: TransactionType.INTERNAL_TRANSFER, amount: 150, platformType: null },
    ] as never)

    const result = await getClientBalanceBreakdown('client-1')

    expect(result['DRAFTKINGS']).toEqual({
      deposits: 500,
      withdrawals: 100,
      fees: 0,
      balance: 400,
    })

    expect(result['FANDUEL']).toEqual({
      deposits: 300,
      withdrawals: 0,
      fees: 20,
      balance: 280,
    })

    expect(result['UNASSIGNED']).toEqual({
      deposits: 150,
      withdrawals: 0,
      fees: 0,
      balance: 150,
    })
  })
})

// ── reverseTransaction ──────────────────────────────────────────────────────

describe('reverseTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'tx-adj' } as never)
    vi.mocked(prisma.transaction.update).mockResolvedValue({} as never)
  })

  it('marks original as reversed and creates ADJUSTMENT', async () => {
    vi.mocked(prisma.transaction.findUniqueOrThrow).mockResolvedValueOnce({
      id: 'tx-original',
      type: TransactionType.DEPOSIT,
      amount: 500,
      currency: 'USD',
      status: 'completed',
      clientId: 'client-1',
      platformType: 'DRAFTKINGS',
    } as never)

    await reverseTransaction('tx-original', 'Duplicate entry', 'user-1')

    // Should mark original as reversed
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'tx-original' },
      data: { status: 'reversed' },
    })

    // Should create ADJUSTMENT transaction
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.ADJUSTMENT,
        amount: 500,
        currency: 'USD',
        clientId: 'client-1',
        platformType: 'DRAFTKINGS',
        description: 'Reversal of tx-original: Duplicate entry',
        reference: 'tx-original',
        recordedById: 'user-1',
        metadata: {
          reversedTransactionId: 'tx-original',
          reason: 'Duplicate entry',
        },
      }),
    })
  })

  it('throws if transaction is already reversed', async () => {
    vi.mocked(prisma.transaction.findUniqueOrThrow).mockResolvedValueOnce({
      id: 'tx-original',
      status: 'reversed',
    } as never)

    await expect(
      reverseTransaction('tx-original', 'Test', 'user-1'),
    ).rejects.toThrow('Transaction already reversed')

    expect(prisma.transaction.update).not.toHaveBeenCalled()
    expect(prisma.transaction.create).not.toHaveBeenCalled()
  })
})

// ── getTransactionHistory ───────────────────────────────────────────────────

describe('getTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated results with correct filters', async () => {
    const mockTransactions = [
      { id: 'tx-1', type: TransactionType.DEPOSIT, amount: 100 },
      { id: 'tx-2', type: TransactionType.DEPOSIT, amount: 200 },
    ]

    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce(
      mockTransactions as never,
    )
    vi.mocked(prisma.transaction.count).mockResolvedValueOnce(5 as never)

    const result = await getTransactionHistory({
      type: TransactionType.DEPOSIT,
      limit: 2,
      offset: 0,
    })

    expect(result.transactions).toEqual(mockTransactions)
    expect(result.total).toBe(5)

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { type: TransactionType.DEPOSIT },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      skip: 0,
    })
  })

  it('defaults to limit 50 and offset 0', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.transaction.count).mockResolvedValueOnce(0 as never)

    await getTransactionHistory()

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
      }),
    )
  })

  it('applies date range filters', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.transaction.count).mockResolvedValueOnce(0 as never)

    const fromDate = new Date('2025-01-01')
    const toDate = new Date('2025-12-31')

    await getTransactionHistory({ fromDate, toDate })

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
    )
  })
})

// ── recordCommissionTransaction ─────────────────────────────────────────────

describe('recordCommissionTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'tx-comm' } as never)
  })

  it('creates COMMISSION_PAYOUT with description including slices', async () => {
    await recordCommissionTransaction(
      {
        id: 'alloc-1',
        agentId: 'agent-1',
        bonusPoolId: 'bp-1',
        type: 'star_slice',
        amount: 100,
        slices: 2,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TransactionType.COMMISSION_PAYOUT,
        amount: 100,
        bonusPoolId: 'bp-1',
        description: 'Commission: star_slice (2 slices)',
        recordedById: 'user-1',
      }),
    })
  })

  it('omits slice count from description when slices is 0', async () => {
    await recordCommissionTransaction(
      {
        id: 'alloc-2',
        agentId: 'agent-1',
        bonusPoolId: 'bp-1',
        type: 'direct',
        amount: 200,
        slices: 0,
      },
      'user-1',
    )

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'Commission: direct',
      }),
    })
  })
})
