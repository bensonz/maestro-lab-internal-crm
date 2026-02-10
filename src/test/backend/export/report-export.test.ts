import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/data/reports', () => ({
  getPartnerProfitReport: vi.fn(),
  getAgentCommissionReport: vi.fn(),
  getClientLTVReport: vi.fn(),
}))

vi.mock('jspdf', () => {
  class MockJsPDF {
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    }
    lastAutoTable = { finalY: 100 }
    setFontSize = vi.fn()
    setFont = vi.fn()
    setTextColor = vi.fn()
    setDrawColor = vi.fn()
    text = vi.fn()
    line = vi.fn()
    addPage = vi.fn()
    getNumberOfPages = () => 1
    setPage = vi.fn()
    getTextWidth = () => 50
    output = vi.fn(() => new ArrayBuffer(100))
  }
  return { jsPDF: MockJsPDF }
})

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

import { auth } from '@/backend/auth'
import {
  getPartnerProfitReport,
  getAgentCommissionReport,
  getClientLTVReport,
} from '@/backend/data/reports'

function mockAuth(userId: string | null, role?: string, name?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId
      ? ({ user: { id: userId, role, name: name ?? 'Test User' } } as never)
      : null,
  )
}

function mockPartnerReport() {
  vi.mocked(getPartnerProfitReport).mockResolvedValue({
    details: [],
    byPartner: [
      {
        partnerId: 'p1',
        partnerName: 'Partner One',
        partnerType: 'referral',
        grossTotal: 1000,
        feeTotal: 50,
        partnerTotal: 300,
        companyTotal: 650,
        transactionCount: 2,
        pendingAmount: 100,
        paidAmount: 200,
      },
    ],
    totals: { gross: 1000, fees: 50, partnerShare: 300, companyShare: 650, count: 2 },
  } as never)
}

function mockAgentReport() {
  vi.mocked(getAgentCommissionReport).mockResolvedValue({
    allocations: [],
    byAgent: [
      {
        agentId: 'a1',
        agentName: 'Agent One',
        starLevel: 2,
        tier: '2-star',
        directTotal: 200,
        starSliceTotal: 50,
        backfillTotal: 0,
        overrideTotal: 50,
        totalEarned: 300,
        pendingAmount: 100,
        paidAmount: 200,
        poolCount: 3,
      },
    ],
    totals: { totalEarned: 300, totalDirect: 200, totalOverride: 50, totalPending: 100, count: 3 },
  } as never)
}

function mockLTVReport() {
  vi.mocked(getClientLTVReport).mockResolvedValue({
    clients: [
      {
        clientId: 'c1',
        clientName: 'Alice Smith',
        agentName: 'Agent One',
        partnerName: 'Partner One',
        createdAt: new Date(),
        daysSinceCreated: 30,
        totalDeposited: 1500,
        totalWithdrawn: 200,
        netFlow: 1300,
        commissionCost: 300,
        earningsTotal: 80,
        ltv: 1000,
        monthlyLTV: 1000,
      },
    ],
    totals: {
      totalLTV: 1000,
      avgLTV: 1000,
      totalDeposited: 1500,
      totalWithdrawn: 200,
      totalCommissionCost: 300,
      clientCount: 1,
    },
  } as never)
}

// ── Partner Profit CSV ───────────────────────────────────────────

describe('Partner Profit CSV Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importRoute() {
    const mod = await import('@/app/api/export/reports/partner-profit/route')
    return mod.GET
  }

  it('returns 401 when unauthenticated', async () => {
    mockAuth(null)
    const GET = await importRoute()
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 403 for AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const GET = await importRoute()
    const response = await GET()
    expect(response.status).toBe(403)
  })

  it('returns CSV with correct headers', async () => {
    mockAuth('admin-1', 'ADMIN')
    mockPartnerReport()

    const GET = await importRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('Partner Name,Type,Transaction Count,Gross Total,Fees,Partner Share,Company Share,Pending,Paid')
    expect(csv).toContain('Partner One')
    expect(csv).toContain('referral')
  })
})

// ── Agent Commission CSV ─────────────────────────────────────────

describe('Agent Commission CSV Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importRoute() {
    const mod = await import('@/app/api/export/reports/agent-commission/route')
    return mod.GET
  }

  it('returns CSV with correct headers', async () => {
    mockAuth('admin-1', 'ADMIN')
    mockAgentReport()

    const GET = await importRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('Agent Name,Tier,Star Level,Direct Total,Star Slice Total,Backfill Total,Override Total,Total Earned,Pending,Paid')
    expect(csv).toContain('Agent One')
    expect(csv).toContain('2-star')
  })
})

// ── Client LTV CSV ───────────────────────────────────────────────

describe('Client LTV CSV Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importRoute() {
    const mod = await import('@/app/api/export/reports/client-ltv/route')
    return mod.GET
  }

  it('returns CSV with correct headers', async () => {
    mockAuth('admin-1', 'ADMIN')
    mockLTVReport()

    const GET = await importRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('Client Name,Agent,Partner,Days Active,Total Deposited,Total Withdrawn,Net Flow,Commission Cost,LTV,Monthly Run Rate')
    expect(csv).toContain('Alice Smith')
    expect(csv).toContain('1000.00')
  })
})

// ── Partner Profit PDF ───────────────────────────────────────────

describe('Partner Profit PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importRoute() {
    const mod = await import('@/app/api/export/reports/partner-profit/pdf/route')
    return mod.GET
  }

  it('returns application/pdf content type', async () => {
    mockAuth('admin-1', 'ADMIN')
    mockPartnerReport()

    const GET = await importRoute()
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('allows BACKOFFICE role', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    mockPartnerReport()

    const GET = await importRoute()
    const response = await GET()

    expect(response.status).toBe(200)
  })
})
