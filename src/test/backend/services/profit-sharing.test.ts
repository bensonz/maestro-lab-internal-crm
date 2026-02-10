import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    profitShareRule: {
      findMany: vi.fn(),
    },
    profitShareDetail: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import {
  calculateProfitShare,
  getPartnerProfitSummary,
} from '@/backend/services/profit-sharing'

function makeRule(overrides: {
  id?: string
  partnerId?: string
  splitType?: string
  partnerPercent?: number | null
  companyPercent?: number | null
  fixedAmount?: number | null
  feePercent?: number | null
  feeFixed?: number | null
  minAmount?: number | null
  maxAmount?: number | null
  platformType?: string | null
}) {
  return {
    id: overrides.id ?? 'rule-1',
    partnerId: overrides.partnerId ?? 'partner-1',
    name: 'Test Rule',
    splitType: overrides.splitType ?? 'percentage',
    partnerPercent: overrides.partnerPercent ?? 30,
    companyPercent: overrides.companyPercent ?? 70,
    fixedAmount: overrides.fixedAmount ?? null,
    feePercent: overrides.feePercent ?? null,
    feeFixed: overrides.feeFixed ?? null,
    minAmount: overrides.minAmount ?? null,
    maxAmount: overrides.maxAmount ?? null,
    platformType: overrides.platformType ?? null,
    appliesTo: 'all',
    status: 'active',
    priority: 0,
    effectiveFrom: new Date('2025-01-01'),
    effectiveTo: null,
  }
}

function makeDetail(overrides: {
  id?: string
  partnerAmount?: number
  companyAmount?: number
  feeAmount?: number
  status?: string
  ruleName?: string
  ruleSplitType?: string
}) {
  return {
    id: overrides.id ?? 'detail-1',
    partnerId: 'partner-1',
    ruleId: 'rule-1',
    grossAmount: 1000,
    feeAmount: overrides.feeAmount ?? 0,
    netAmount: 1000 - (overrides.feeAmount ?? 0),
    partnerAmount: overrides.partnerAmount ?? 300,
    companyAmount: overrides.companyAmount ?? 700,
    status: overrides.status ?? 'pending',
    paidAt: overrides.status === 'paid' ? new Date() : null,
    createdAt: new Date(),
    rule: {
      name: overrides.ruleName ?? 'Test Rule',
      splitType: overrides.ruleSplitType ?? 'percentage',
    },
  }
}

describe('calculateProfitShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.profitShareDetail.create).mockResolvedValue({} as never)
  })

  it('calculates correct partner/company amounts for percentage split', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ partnerPercent: 30, companyPercent: 70 }),
    ] as never)

    await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    expect(prisma.profitShareDetail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'partner-1',
        grossAmount: 1000,
        feeAmount: 0,
        netAmount: 1000,
        partnerAmount: 300,
        companyAmount: 700,
      }),
    })
  })

  it('calculates correct amounts for fixed split', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ splitType: 'fixed', fixedAmount: 150 }),
    ] as never)

    await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    expect(prisma.profitShareDetail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerAmount: 150,
        companyAmount: 850, // 1000 - 150
      }),
    })
  })

  it('deducts percentage fee before splitting', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ partnerPercent: 50, companyPercent: 50, feePercent: 10 }),
    ] as never)

    await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    // Fee = 1000 * 10% = 100, net = 900, partner = 450, company = 450
    expect(prisma.profitShareDetail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feeAmount: 100,
        netAmount: 900,
        partnerAmount: 450,
        companyAmount: 450,
      }),
    })
  })

  it('deducts fixed fee before splitting', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ partnerPercent: 40, companyPercent: 60, feeFixed: 50 }),
    ] as never)

    await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    // Fee = 50, net = 950, partner = 380, company = 570
    expect(prisma.profitShareDetail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feeAmount: 50,
        netAmount: 950,
        partnerAmount: 380,
        companyAmount: 570,
      }),
    })
  })

  it('returns null when no matching rules found', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce(
      [] as never,
    )

    const result = await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    expect(result).toBeNull()
    expect(prisma.profitShareDetail.create).not.toHaveBeenCalled()
  })

  it('returns null when amount is below minAmount', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ minAmount: 500 }),
    ] as never)

    const result = await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 200,
      transactionType: 'deposits',
    })

    expect(result).toBeNull()
    expect(prisma.profitShareDetail.create).not.toHaveBeenCalled()
  })

  it('returns null when amount is above maxAmount', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ maxAmount: 500 }),
    ] as never)

    const result = await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
    })

    expect(result).toBeNull()
    expect(prisma.profitShareDetail.create).not.toHaveBeenCalled()
  })

  it('returns null when platform type does not match', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({ platformType: 'DRAFTKINGS' }),
    ] as never)

    const result = await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
      platformType: 'FANDUEL',
    })

    expect(result).toBeNull()
    expect(prisma.profitShareDetail.create).not.toHaveBeenCalled()
  })

  it('includes transactionId and fundMovementId when provided', async () => {
    vi.mocked(prisma.profitShareRule.findMany).mockResolvedValueOnce([
      makeRule({}),
    ] as never)

    await calculateProfitShare({
      partnerId: 'partner-1',
      grossAmount: 1000,
      transactionType: 'deposits',
      transactionId: 'tx-1',
      fundMovementId: 'fm-1',
    })

    expect(prisma.profitShareDetail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: 'tx-1',
        fundMovementId: 'fm-1',
      }),
    })
  })
})

describe('getPartnerProfitSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct totals for mixed details', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([
      makeDetail({
        id: 'd1',
        partnerAmount: 300,
        companyAmount: 700,
        feeAmount: 50,
        status: 'paid',
      }),
      makeDetail({
        id: 'd2',
        partnerAmount: 200,
        companyAmount: 450,
        feeAmount: 30,
        status: 'pending',
      }),
      makeDetail({
        id: 'd3',
        partnerAmount: 100,
        companyAmount: 200,
        feeAmount: 10,
        status: 'pending',
      }),
    ] as never)

    const result = await getPartnerProfitSummary('partner-1')

    expect(result.totalPartnerAmount).toBe(600)
    expect(result.totalCompanyAmount).toBe(1350)
    expect(result.totalFees).toBe(90)
    expect(result.transactionCount).toBe(3)
  })

  it('separates pending vs paid amounts correctly', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce([
      makeDetail({
        id: 'd1',
        partnerAmount: 500,
        status: 'paid',
      }),
      makeDetail({
        id: 'd2',
        partnerAmount: 300,
        status: 'pending',
      }),
      makeDetail({
        id: 'd3',
        partnerAmount: 200,
        status: 'paid',
      }),
    ] as never)

    const result = await getPartnerProfitSummary('partner-1')

    expect(result.paidAmount).toBe(700) // 500 + 200
    expect(result.pendingAmount).toBe(300)
  })

  it('returns zeros for partner with no details', async () => {
    vi.mocked(prisma.profitShareDetail.findMany).mockResolvedValueOnce(
      [] as never,
    )

    const result = await getPartnerProfitSummary('partner-1')

    expect(result.totalPartnerAmount).toBe(0)
    expect(result.totalCompanyAmount).toBe(0)
    expect(result.totalFees).toBe(0)
    expect(result.pendingAmount).toBe(0)
    expect(result.paidAmount).toBe(0)
    expect(result.transactionCount).toBe(0)
  })
})
