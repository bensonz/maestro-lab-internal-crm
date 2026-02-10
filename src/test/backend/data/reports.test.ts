import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    profitShareDetail: {
      findMany: vi.fn(),
    },
    bonusAllocation: {
      findMany: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import {
  getPartnerProfitReport,
  getAgentCommissionReport,
  getClientLTVReport,
} from '@/backend/data/reports'

// ── Helpers ──────────────────────────────────────────────────────

function makeProfitDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'detail-1',
    partnerId: 'p1',
    ruleId: 'rule-1',
    grossAmount: 1000,
    feeAmount: 50,
    netAmount: 950,
    partnerAmount: 300,
    companyAmount: 650,
    status: 'pending',
    createdAt: new Date(),
    partner: { id: 'p1', name: 'Partner One', type: 'referral' },
    rule: { name: 'Standard', splitType: 'percentage', partnerPercent: 30, companyPercent: 70 },
    ...overrides,
  }
}

function makeAllocation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alloc-1',
    bonusPoolId: 'pool-1',
    agentId: 'agent-1',
    type: 'direct',
    slices: 1,
    amount: 200,
    starLevelAtTime: 2,
    status: 'pending',
    createdAt: new Date(),
    agent: { id: 'agent-1', name: 'Agent One', starLevel: 2, tier: '2-star' },
    bonusPool: {
      closerId: 'agent-1',
      client: { firstName: 'John', lastName: 'Doe' },
      closer: { id: 'agent-1', name: 'Agent One' },
    },
    ...overrides,
  }
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    firstName: 'Alice',
    lastName: 'Smith',
    intakeStatus: 'APPROVED',
    createdAt: new Date(Date.now() - 60 * 86400_000), // 60 days ago
    agent: { name: 'Agent One' },
    partner: { name: 'Partner One' },
    fundMovementsFrom: [{ amount: 200, createdAt: new Date() }],
    fundMovementsTo: [
      { amount: 1000, createdAt: new Date() },
      { amount: 500, createdAt: new Date() },
    ],
    bonusPool: {
      totalAmount: 400,
      directAmount: 200,
      starPoolAmount: 200,
      distributedSlices: 4,
      recycledSlices: 0,
      allocations: [
        { amount: 200, status: 'paid' },
        { amount: 100, status: 'pending' },
      ],
    },
    earnings: [
      { amount: 50, status: 'paid' },
      { amount: 30, status: 'pending' },
    ],
    ...overrides,
  }
}

// ── getPartnerProfitReport ───────────────────────────────────────

describe('getPartnerProfitReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty for no data', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([] as never)

    const result = await getPartnerProfitReport()

    expect(result.details).toHaveLength(0)
    expect(result.byPartner).toHaveLength(0)
    expect(result.totals.gross).toBe(0)
    expect(result.totals.count).toBe(0)
  })

  it('aggregates by partner correctly', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([
      makeProfitDetail({ id: 'd1', partnerId: 'p1', grossAmount: 1000, partnerAmount: 300, companyAmount: 650, feeAmount: 50 }),
      makeProfitDetail({ id: 'd2', partnerId: 'p1', grossAmount: 500, partnerAmount: 150, companyAmount: 325, feeAmount: 25 }),
      makeProfitDetail({
        id: 'd3',
        partnerId: 'p2',
        grossAmount: 2000,
        partnerAmount: 600,
        companyAmount: 1300,
        feeAmount: 100,
        partner: { id: 'p2', name: 'Partner Two', type: 'white_label' },
      }),
    ] as never)

    const result = await getPartnerProfitReport()

    expect(result.byPartner).toHaveLength(2)

    const p1 = result.byPartner.find((p) => p.partnerId === 'p1')!
    expect(p1.grossTotal).toBe(1500)
    expect(p1.partnerTotal).toBe(450)
    expect(p1.transactionCount).toBe(2)

    const p2 = result.byPartner.find((p) => p.partnerId === 'p2')!
    expect(p2.grossTotal).toBe(2000)
    expect(p2.partnerName).toBe('Partner Two')
  })

  it('separates pending/paid amounts', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([
      makeProfitDetail({ id: 'd1', partnerId: 'p1', partnerAmount: 300, status: 'paid' }),
      makeProfitDetail({ id: 'd2', partnerId: 'p1', partnerAmount: 200, status: 'pending' }),
      makeProfitDetail({ id: 'd3', partnerId: 'p1', partnerAmount: 100, status: 'paid' }),
    ] as never)

    const result = await getPartnerProfitReport()

    const p1 = result.byPartner.find((p) => p.partnerId === 'p1')!
    expect(p1.paidAmount).toBe(400) // 300 + 100
    expect(p1.pendingAmount).toBe(200)
  })

  it('totals are correct', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([
      makeProfitDetail({ id: 'd1', grossAmount: 1000, feeAmount: 50, partnerAmount: 300, companyAmount: 650 }),
      makeProfitDetail({ id: 'd2', grossAmount: 2000, feeAmount: 100, partnerAmount: 600, companyAmount: 1300 }),
    ] as never)

    const result = await getPartnerProfitReport()

    expect(result.totals.gross).toBe(3000)
    expect(result.totals.fees).toBe(150)
    expect(result.totals.partnerShare).toBe(900)
    expect(result.totals.companyShare).toBe(1950)
    expect(result.totals.count).toBe(2)
  })
})

// ── getAgentCommissionReport ─────────────────────────────────────

describe('getAgentCommissionReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty for no data', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce([] as never)

    const result = await getAgentCommissionReport()

    expect(result.allocations).toHaveLength(0)
    expect(result.byAgent).toHaveLength(0)
    expect(result.totals.totalEarned).toBe(0)
  })

  it('aggregates by agent with correct breakdown', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce([
      makeAllocation({ id: 'a1', agentId: 'agent-1', type: 'direct', amount: 200, status: 'paid' }),
      makeAllocation({ id: 'a2', agentId: 'agent-1', type: 'star_slice', amount: 50, status: 'pending' }),
      makeAllocation({ id: 'a3', agentId: 'agent-1', type: 'backfill', amount: 50, status: 'pending' }),
      makeAllocation({
        id: 'a4',
        agentId: 'agent-2',
        type: 'direct',
        amount: 200,
        status: 'paid',
        agent: { id: 'agent-2', name: 'Agent Two', starLevel: 3, tier: '3-star' },
        bonusPool: {
          closerId: 'agent-2',
          client: { firstName: 'Jane', lastName: 'Doe' },
          closer: { id: 'agent-2', name: 'Agent Two' },
        },
      }),
    ] as never)

    const result = await getAgentCommissionReport()

    expect(result.byAgent).toHaveLength(2)

    const a1 = result.byAgent.find((a) => a.agentId === 'agent-1')!
    expect(a1.directTotal).toBe(200)
    expect(a1.starSliceTotal).toBe(50)
    expect(a1.backfillTotal).toBe(50)
    expect(a1.totalEarned).toBe(300)
    expect(a1.paidAmount).toBe(200)
    expect(a1.pendingAmount).toBe(100)
  })

  it('detects override earnings (closer !== agent)', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce([
      makeAllocation({
        id: 'a1',
        agentId: 'agent-1',
        type: 'star_slice',
        amount: 50,
        bonusPool: {
          closerId: 'agent-2', // Different agent closed the deal
          client: { firstName: 'John', lastName: 'Doe' },
          closer: { id: 'agent-2', name: 'Agent Two' },
        },
      }),
    ] as never)

    const result = await getAgentCommissionReport()

    const a1 = result.byAgent.find((a) => a.agentId === 'agent-1')!
    expect(a1.overrideTotal).toBe(50)
  })

  it('sorted by total earned descending', async () => {
    vi.mocked(prisma.bonusAllocation.findMany).mockResolvedValueOnce([
      makeAllocation({ id: 'a1', agentId: 'agent-1', amount: 100 }),
      makeAllocation({
        id: 'a2',
        agentId: 'agent-2',
        amount: 500,
        agent: { id: 'agent-2', name: 'Agent Two', starLevel: 3, tier: '3-star' },
        bonusPool: {
          closerId: 'agent-2',
          client: { firstName: 'Jane', lastName: 'Doe' },
          closer: { id: 'agent-2', name: 'Agent Two' },
        },
      }),
    ] as never)

    const result = await getAgentCommissionReport()

    expect(result.byAgent[0].agentId).toBe('agent-2')
    expect(result.byAgent[1].agentId).toBe('agent-1')
  })
})

// ── getClientLTVReport ───────────────────────────────────────────

describe('getClientLTVReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty for no approved clients', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([] as never)

    const result = await getClientLTVReport()

    expect(result.clients).toHaveLength(0)
    expect(result.totals.clientCount).toBe(0)
    expect(result.totals.avgLTV).toBe(0)
  })

  it('calculates LTV correctly (netFlow - commissionCost)', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      makeClient(),
    ] as never)

    const result = await getClientLTVReport()

    const client = result.clients[0]
    // totalDeposited = 1000 + 500 = 1500
    // totalWithdrawn = 200
    // netFlow = 1500 - 200 = 1300
    // commissionCost = 200 + 100 = 300
    // LTV = 1300 - 300 = 1000
    expect(client.totalDeposited).toBe(1500)
    expect(client.totalWithdrawn).toBe(200)
    expect(client.netFlow).toBe(1300)
    expect(client.commissionCost).toBe(300)
    expect(client.ltv).toBe(1000)
  })

  it('monthly run rate calculation', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      makeClient(),
    ] as never)

    const result = await getClientLTVReport()

    const client = result.clients[0]
    // LTV = 1000, daysSinceCreated ~ 60
    // monthlyLTV = (1000 / 60) * 30 = 500
    expect(client.monthlyLTV).toBeCloseTo(500, 0)
  })

  it('sorted by LTV descending', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      makeClient({
        id: 'c1',
        firstName: 'Low',
        lastName: 'LTV',
        fundMovementsTo: [{ amount: 100, createdAt: new Date() }],
        fundMovementsFrom: [{ amount: 500, createdAt: new Date() }],
        bonusPool: null,
        earnings: [],
      }),
      makeClient({
        id: 'c2',
        firstName: 'High',
        lastName: 'LTV',
        fundMovementsTo: [{ amount: 5000, createdAt: new Date() }],
        fundMovementsFrom: [],
        bonusPool: null,
        earnings: [],
      }),
    ] as never)

    const result = await getClientLTVReport()

    expect(result.clients[0].clientName).toBe('High LTV')
    expect(result.clients[1].clientName).toBe('Low LTV')
  })

  it('handles client with no bonus pool', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
      makeClient({
        bonusPool: null,
        fundMovementsTo: [{ amount: 1000, createdAt: new Date() }],
        fundMovementsFrom: [],
        earnings: [],
      }),
    ] as never)

    const result = await getClientLTVReport()

    expect(result.clients[0].commissionCost).toBe(0)
    expect(result.clients[0].ltv).toBe(1000)
  })
})
