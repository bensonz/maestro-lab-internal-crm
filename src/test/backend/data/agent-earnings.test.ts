import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    earning: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import { getAgentEarnings } from '@/backend/data/agent'

function makeEarning(overrides: {
  id?: string
  amount?: number
  status?: string
  description?: string | null
  createdAt?: Date
  firstName?: string
  lastName?: string
}) {
  return {
    id: overrides.id ?? 'earn-1',
    amount: overrides.amount ?? 100,
    status: overrides.status ?? 'paid',
    description: overrides.description ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    client: {
      firstName: overrides.firstName ?? 'John',
      lastName: overrides.lastName ?? 'Doe',
    },
  }
}

describe('getAgentEarnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zeros and empty transactions when agent has no earnings', async () => {
    vi.mocked(prisma.earning.findMany).mockResolvedValue([] as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.totalEarnings).toBe(0)
    expect(result.pendingPayout).toBe(0)
    expect(result.thisMonth).toBe(0)
    expect(result.recentTransactions).toEqual([])
  })

  it('calculates correct totals for paid and pending earnings', async () => {
    vi.mocked(prisma.earning.findMany).mockResolvedValue([
      makeEarning({ id: 'e1', amount: 200, status: 'paid' }),
      makeEarning({ id: 'e2', amount: 150, status: 'paid' }),
      makeEarning({ id: 'e3', amount: 75, status: 'pending' }),
      makeEarning({ id: 'e4', amount: 50, status: 'pending' }),
    ] as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.totalEarnings).toBe(350)
    expect(result.pendingPayout).toBe(125)
  })

  it('calculates thisMonth using only current month earnings', async () => {
    const now = new Date()
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 15)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 10)

    vi.mocked(prisma.earning.findMany).mockResolvedValue([
      makeEarning({
        id: 'e1',
        amount: 300,
        status: 'paid',
        createdAt: thisMonthDate,
      }),
      makeEarning({
        id: 'e2',
        amount: 100,
        status: 'pending',
        createdAt: thisMonthDate,
      }),
      makeEarning({
        id: 'e3',
        amount: 500,
        status: 'paid',
        createdAt: lastMonthDate,
      }),
    ] as never)

    const result = await getAgentEarnings('agent-1')

    // thisMonth includes all earnings created this month regardless of status
    expect(result.thisMonth).toBe(400)
    // totalEarnings only counts paid
    expect(result.totalEarnings).toBe(800)
  })

  it('limits recent transactions to 10 and orders by date desc', async () => {
    const earnings = Array.from({ length: 15 }, (_, i) =>
      makeEarning({
        id: `e${i}`,
        amount: 10 * (i + 1),
        status: 'paid',
        createdAt: new Date(2025, 0, 15 - i),
      }),
    )

    vi.mocked(prisma.earning.findMany).mockResolvedValue(earnings as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.recentTransactions).toHaveLength(10)
    // First transaction should be the most recent (index 0 from the sorted array)
    expect(result.recentTransactions[0].id).toBe('e0')
    expect(result.recentTransactions[9].id).toBe('e9')
  })

  it('includes description with fallback for null', async () => {
    vi.mocked(prisma.earning.findMany).mockResolvedValue([
      makeEarning({ id: 'e1', description: 'Bonus commission' }),
      makeEarning({ id: 'e2', description: null }),
    ] as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.recentTransactions[0].description).toBe('Bonus commission')
    expect(result.recentTransactions[1].description).toBe(
      'Client approval commission',
    )
  })

  it('maps status labels correctly', async () => {
    vi.mocked(prisma.earning.findMany).mockResolvedValue([
      makeEarning({ id: 'e1', status: 'paid' }),
      makeEarning({ id: 'e2', status: 'pending' }),
    ] as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.recentTransactions[0].status).toBe('Paid')
    expect(result.recentTransactions[1].status).toBe('Pending')
  })

  it('includes client name and formatted date in transactions', async () => {
    vi.mocked(prisma.earning.findMany).mockResolvedValue([
      makeEarning({
        id: 'e1',
        firstName: 'Jane',
        lastName: 'Smith',
        createdAt: new Date(2025, 5, 15),
      }),
    ] as never)

    const result = await getAgentEarnings('agent-1')

    expect(result.recentTransactions[0].client).toBe('Jane Smith')
    expect(result.recentTransactions[0].date).toBe('Jun 15, 2025')
  })
})
