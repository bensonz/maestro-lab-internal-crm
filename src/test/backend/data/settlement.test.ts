import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: { findMany: vi.fn() },
    fundMovement: { findMany: vi.fn() },
  },
}))

import prisma from '@/backend/prisma/client'
import { getClientsForSettlement } from '@/backend/data/operations'

function makeMovement(overrides: {
  id?: string
  fromClientId?: string | null
  toClientId?: string | null
  fromPlatform?: string
  toPlatform?: string
  amount?: number
  status?: string
  createdAt?: Date
}) {
  return {
    id: overrides.id ?? 'mov-1',
    fromClientId: overrides.fromClientId ?? null,
    toClientId: overrides.toClientId ?? null,
    fromPlatform: overrides.fromPlatform ?? 'Bank',
    toPlatform: overrides.toPlatform ?? 'DraftKings',
    amount: overrides.amount ?? 100,
    status: overrides.status ?? 'completed',
    createdAt: overrides.createdAt ?? new Date(2026, 1, 7),
  }
}

describe('getClientsForSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no approved clients and no fund movements', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([] as never)

    const result = await getClientsForSettlement()

    expect(result).toEqual([])
  })

  it('returns approved client with zero totals when no fund movements exist', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'John', lastName: 'Doe' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([] as never)

    const result = await getClientsForSettlement()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('John Doe')
    expect(result[0].totalDeposited).toBe(0)
    expect(result[0].totalWithdrawn).toBe(0)
    expect(result[0].netBalance).toBe(0)
    expect(result[0].platforms).toEqual([])
    expect(result[0].recentTransactions).toEqual([])
  })

  it('calculates deposits correctly when client is toClientId', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Jane', lastName: 'Smith' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({
        id: 'm1',
        toClientId: 'c1',
        toPlatform: 'DraftKings',
        amount: 200,
      }),
      makeMovement({
        id: 'm2',
        toClientId: 'c1',
        toPlatform: 'Bank',
        amount: 300,
      }),
    ] as never)

    const result = await getClientsForSettlement()

    expect(result[0].totalDeposited).toBe(500)
    expect(result[0].totalWithdrawn).toBe(0)
    expect(result[0].netBalance).toBe(500)
  })

  it('calculates deposits and withdrawals with correct net balance', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Bob', lastName: 'Jones' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({
        id: 'm1',
        toClientId: 'c1',
        toPlatform: 'DraftKings',
        amount: 500,
      }),
      makeMovement({
        id: 'm2',
        fromClientId: 'c1',
        fromPlatform: 'DraftKings',
        amount: 150,
      }),
    ] as never)

    const result = await getClientsForSettlement()

    expect(result[0].totalDeposited).toBe(500)
    expect(result[0].totalWithdrawn).toBe(150)
    expect(result[0].netBalance).toBe(350)
  })

  it('counts same-client transfer as both deposit and withdrawal', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Alice', lastName: 'Lee' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({
        id: 'm1',
        fromClientId: 'c1',
        toClientId: 'c1',
        fromPlatform: 'Bank',
        toPlatform: 'DraftKings',
        amount: 100,
      }),
    ] as never)

    const result = await getClientsForSettlement()

    // Same-client transfer: deposit to DraftKings + withdrawal from Bank
    expect(result[0].totalDeposited).toBe(100)
    expect(result[0].totalWithdrawn).toBe(100)
    expect(result[0].netBalance).toBe(0)

    // Two platform entries
    expect(result[0].platforms).toHaveLength(2)
    const bank = result[0].platforms.find((p) => p.name === 'Bank')
    const dk = result[0].platforms.find((p) => p.name === 'DraftKings')
    expect(bank?.withdrawn).toBe(100)
    expect(bank?.deposited).toBe(0)
    expect(dk?.deposited).toBe(100)
    expect(dk?.withdrawn).toBe(0)

    // Two transaction entries (deposit + withdrawal with -w suffix)
    expect(result[0].recentTransactions).toHaveLength(2)
    const deposit = result[0].recentTransactions.find(
      (t) => t.type === 'deposit',
    )
    const withdrawal = result[0].recentTransactions.find(
      (t) => t.type === 'withdrawal',
    )
    expect(deposit?.id).toBe('m1')
    expect(withdrawal?.id).toBe('m1-w')
  })

  it('aggregates per-platform totals correctly', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Max', lastName: 'Power' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({
        id: 'm1',
        toClientId: 'c1',
        toPlatform: 'DraftKings',
        amount: 100,
      }),
      makeMovement({
        id: 'm2',
        toClientId: 'c1',
        toPlatform: 'DraftKings',
        amount: 200,
      }),
      makeMovement({
        id: 'm3',
        toClientId: 'c1',
        toPlatform: 'FanDuel',
        amount: 50,
      }),
      makeMovement({
        id: 'm4',
        fromClientId: 'c1',
        fromPlatform: 'DraftKings',
        amount: 75,
      }),
    ] as never)

    const result = await getClientsForSettlement()

    // Platforms sorted alphabetically
    expect(result[0].platforms).toHaveLength(2)
    expect(result[0].platforms[0].name).toBe('DraftKings')
    expect(result[0].platforms[0].deposited).toBe(300)
    expect(result[0].platforms[0].withdrawn).toBe(75)
    expect(result[0].platforms[1].name).toBe('FanDuel')
    expect(result[0].platforms[1].deposited).toBe(50)
    expect(result[0].platforms[1].withdrawn).toBe(0)
  })

  it('limits recent transactions to 20 ordered by date desc', async () => {
    const movements = Array.from({ length: 25 }, (_, i) =>
      makeMovement({
        id: `m${i}`,
        toClientId: 'c1',
        toPlatform: 'Bank',
        amount: 10,
        createdAt: new Date(2026, 0, 25 - i),
      }),
    )

    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Test', lastName: 'User' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce(
      movements as never,
    )

    const result = await getClientsForSettlement()

    expect(result[0].recentTransactions).toHaveLength(20)
    // First transaction should be most recent (m0 with date Jan 25)
    expect(result[0].recentTransactions[0].id).toBe('m0')
    expect(result[0].recentTransactions[19].id).toBe('m19')
  })

  it('formats dates as "MMM dd, yyyy"', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c1', firstName: 'Date', lastName: 'Test' },
    ] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({
        id: 'm1',
        toClientId: 'c1',
        amount: 50,
        createdAt: new Date(2026, 1, 7),
      }),
    ] as never)

    const result = await getClientsForSettlement()

    expect(result[0].recentTransactions[0].date).toBe('Feb 7, 2026')
  })

  it('includes non-approved clients that have fund movements', async () => {
    // First call: approved clients (none)
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([] as never)
    vi.mocked(prisma.fundMovement.findMany).mockResolvedValueOnce([
      makeMovement({ id: 'm1', toClientId: 'c2', amount: 100 }),
    ] as never)
    // Second call: extra clients with movements
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      { id: 'c2', firstName: 'Extra', lastName: 'Client' },
    ] as never)

    const result = await getClientsForSettlement()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Extra Client')
    expect(result[0].totalDeposited).toBe(100)
  })
})
