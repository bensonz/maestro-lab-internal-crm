import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/data/operations', () => ({
  getClientsForSettlement: vi.fn(),
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
import { getClientsForSettlement } from '@/backend/data/operations'

function mockAuth(userId: string | null, role?: string, name?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId
      ? ({ user: { id: userId, role, name: name ?? 'Test User' } } as never)
      : null,
  )
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Alice Smith',
    totalDeposited: 500,
    totalWithdrawn: 150,
    netBalance: 350,
    platforms: [
      {
        name: 'DraftKings',
        abbrev: 'DK',
        category: 'sports',
        deposited: 400,
        withdrawn: 100,
      },
      {
        name: 'Bank',
        abbrev: 'BNK',
        category: 'financial',
        deposited: 100,
        withdrawn: 50,
      },
    ],
    recentTransactions: [
      {
        id: 'm1',
        date: 'Feb 7, 2026',
        type: 'deposit',
        amount: 300,
        platform: 'DraftKings',
        status: 'completed',
        settlementStatus: 'CONFIRMED',
        reviewedBy: 'Admin User',
        reviewedAt: 'Feb 8, 2026',
        reviewNotes: 'Looks good',
      },
      {
        id: 'm2',
        date: 'Feb 6, 2026',
        type: 'withdrawal',
        amount: 100,
        platform: 'Bank',
        status: 'completed',
        settlementStatus: 'PENDING_REVIEW',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      },
    ],
    settlementCounts: {
      pendingReview: 1,
      confirmed: 1,
      rejected: 0,
    },
    ...overrides,
  }
}

// =============================================
// CSV Export Tests
// =============================================

describe('CSV Settlement Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importCsvRoute() {
    const mod = await import('@/app/api/export/settlements/route')
    return mod.GET
  }

  it('returns 401 when unauthenticated', async () => {
    mockAuth(null)
    const GET = await importCsvRoute()
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 403 for non-ADMIN/BACKOFFICE role', async () => {
    mockAuth('user-1', 'AGENT')
    const GET = await importCsvRoute()
    const response = await GET()
    expect(response.status).toBe(403)
  })

  it('contains per-transaction rows with correct headers', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const csv = await response.text()

    // Check header row
    expect(csv).toContain('Client Name,Date,Type,Platform,Amount,Currency,Settlement Status,Reviewed By,Reviewed At,Review Notes,Movement Status')
    // Check detail row exists
    expect(csv).toContain('Alice Smith')
    expect(csv).toContain('DraftKings')
  })

  it('capitalizes transaction types', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('Deposit')
    expect(csv).toContain('Withdrawal')
    // Should NOT contain lowercase
    expect(csv).not.toMatch(/,deposit,/)
    expect(csv).not.toMatch(/,withdrawal,/)
  })

  it('uses human-readable settlement status labels', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('Confirmed')
    expect(csv).toContain('Pending Review')
    // Should NOT contain raw enum values in data rows
    expect(csv).not.toContain('PENDING_REVIEW')
    expect(csv).not.toContain('CONFIRMED')
  })

  it('includes summary section after empty row separator', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const csv = await response.text()

    // Summary label row
    expect(csv).toContain('Summary')
    // Summary header row
    expect(csv).toContain('Total Deposited')
    expect(csv).toContain('Net Balance')
    expect(csv).toContain('Pending Count')
    // Summary data
    expect(csv).toContain('500.00')
    expect(csv).toContain('150.00')
    expect(csv).toContain('350.00')
  })

  it('includes current date in filename', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const disposition = response.headers.get('Content-Disposition')

    const today = new Date().toISOString().split('T')[0]
    expect(disposition).toContain(`settlement-detail-${today}.csv`)
  })

  it('formats amounts with 2 decimal places', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importCsvRoute()
    const response = await GET()
    const csv = await response.text()

    expect(csv).toContain('300.00')
    expect(csv).toContain('100.00')
  })
})

// =============================================
// PDF Export Tests
// =============================================

describe('PDF Settlement Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importPdfRoute() {
    const mod = await import('@/app/api/export/settlements/pdf/route')
    return mod.GET
  }

  it('returns 401 when unauthenticated', async () => {
    mockAuth(null)
    const GET = await importPdfRoute()
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 403 for non-ADMIN/BACKOFFICE role', async () => {
    mockAuth('user-1', 'AGENT')
    const GET = await importPdfRoute()
    const response = await GET()
    expect(response.status).toBe(403)
  })

  it('returns application/pdf content type', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importPdfRoute()
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('includes date in Content-Disposition filename', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(getClientsForSettlement).mockResolvedValue([makeClient()] as never)

    const GET = await importPdfRoute()
    const response = await GET()
    const disposition = response.headers.get('Content-Disposition')

    const today = new Date().toISOString().split('T')[0]
    expect(disposition).toContain(`settlement-report-${today}.pdf`)
  })

  it('allows BACKOFFICE role', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    vi.mocked(getClientsForSettlement).mockResolvedValue([] as never)

    const GET = await importPdfRoute()
    const response = await GET()

    expect(response.status).toBe(200)
  })
})
