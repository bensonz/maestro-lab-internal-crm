import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    client: { count: vi.fn() },
    toDo: { count: vi.fn(), findMany: vi.fn() },
    earning: { aggregate: vi.fn() },
  },
}))

// Mock getAgentKPIs since getAgentDetail calls it
vi.mock('@/backend/services/agent-kpis', () => ({
  getAgentKPIs: vi.fn(),
}))

import prisma from '@/backend/prisma/client'
import { getAgentDetail } from '@/backend/data/backoffice'
import { getAgentKPIs } from '@/backend/services/agent-kpis'

const defaultKPIs = {
  totalClients: 5,
  avgDaysToInitiate: 2,
  avgDaysToConvert: 10,
  successRate: 80,
  extensionRate: 10,
  delayRate: 5,
  inProgressClients: 2,
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-1',
    name: 'John Doe',
    email: 'john@test.com',
    role: 'AGENT',
    phone: '555-1234',
    isActive: true,
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2025-06-15'),
    // New hierarchy fields
    supervisorId: null,
    tier: 'rookie',
    starLevel: 0,
    // New profile fields
    gender: null,
    dateOfBirth: null,
    idNumber: null,
    idExpiry: null,
    idDocument: null,
    ssn: null,
    citizenship: null,
    personalEmail: null,
    personalPhone: null,
    companyPhone: null,
    carrier: null,
    zelle: null,
    address: null,
    loginAccount: null,
    // Relations
    agentClients: [],
    ...overrides,
  }
}

describe('getAgentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAgentKPIs).mockResolvedValue(defaultKPIs)
    vi.mocked(prisma.client.count).mockResolvedValue(0 as never)
  })

  it('returns null when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never)

    const result = await getAgentDetail('nonexistent')

    expect(result).toBeNull()
  })

  it('returns agent detail with default profile values', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      makeUser() as never,
    )

    const result = await getAgentDetail('agent-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('agent-1')
    expect(result!.name).toBe('John Doe')
    expect(result!.companyPhone).toBe('555-1234')
    expect(result!.startDate).toBe('2025-06-15')
  })

  it('returns total clients and KPI data', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      makeUser() as never,
    )
    vi.mocked(prisma.client.count).mockResolvedValueOnce(3 as never)

    const result = await getAgentDetail('agent-1')

    expect(result!.totalClients).toBe(5)
    expect(result!.successRate).toBe(80)
    expect(result!.newClientsThisMonth).toBe(3)
  })

  it('computes monthly client breakdown from agent clients', async () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      makeUser({
        agentClients: [
          {
            id: 'c1',
            firstName: 'Alice',
            lastName: 'A',
            intakeStatus: 'APPROVED',
            createdAt: thisMonth,
          },
          {
            id: 'c2',
            firstName: 'Bob',
            lastName: 'B',
            intakeStatus: 'IN_EXECUTION',
            createdAt: lastMonth,
          },
        ],
      }) as never,
    )

    const result = await getAgentDetail('agent-1')

    expect(result!.monthlyClients).toHaveLength(5)
    // The last entry should be the current month
    const currentMonthEntry =
      result!.monthlyClients[result!.monthlyClients.length - 1]
    expect(currentMonthEntry.count).toBe(1) // Alice
    // The second-to-last entry should be last month
    const lastMonthEntry =
      result!.monthlyClients[result!.monthlyClients.length - 2]
    expect(lastMonthEntry.count).toBe(1) // Bob
  })

  it('queries user with findUnique using the provided agentId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      makeUser() as never,
    )

    await getAgentDetail('agent-xyz')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'agent-xyz' },
      include: {
        agentClients: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            intakeStatus: true,
            createdAt: true,
          },
        },
      },
    })
  })

  it('returns hierarchy fields (supervisor and directReports)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      makeUser({ supervisorId: 'mgr-1' }) as never,
    )

    const result = await getAgentDetail('agent-1')

    // Currently supervisor/directReports are hardcoded to null/[]
    // This test documents the current behavior and will need updating
    // when getAgentDetail is wired to the real hierarchy fields
    expect(result).toHaveProperty('supervisor')
    expect(result).toHaveProperty('directReports')
  })
})
