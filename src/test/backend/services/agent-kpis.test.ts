import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: {
      findMany: vi.fn(),
    },
    extensionRequest: {
      groupBy: vi.fn(),
    },
    toDo: {
      groupBy: vi.fn(),
    },
    eventLog: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import { getAgentKPIs, getAllAgentKPIs } from '@/backend/services/agent-kpis'

function mockDefaultReturns() {
  vi.mocked(prisma.client.findMany).mockResolvedValue([])
  vi.mocked(prisma.extensionRequest.groupBy).mockResolvedValue([])
  vi.mocked(prisma.toDo.groupBy).mockResolvedValue([])
  vi.mocked(prisma.eventLog.findMany).mockResolvedValue([])
}

describe('getAgentKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDefaultReturns()
  })

  it('returns empty KPIs for agent with no clients', async () => {
    const result = await getAgentKPIs('agent-1')

    expect(result.totalClients).toBe(0)
    expect(result.approvedClients).toBe(0)
    expect(result.rejectedClients).toBe(0)
    expect(result.inProgressClients).toBe(0)
    expect(result.delayedClients).toBe(0)
    expect(result.successRate).toBe(0)
    expect(result.delayRate).toBe(0)
    expect(result.extensionRate).toBe(0)
    expect(result.avgDaysToInitiate).toBeNull()
    expect(result.avgDaysToConvert).toBeNull()
    expect(result.pendingTodos).toBe(0)
    expect(result.overdueTodos).toBe(0)
  })

  it('computes correct success rate with mix of APPROVED and REJECTED', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-01') },
      { id: 'c2', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-02') },
      { id: 'c3', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-03') },
      { id: 'c4', intakeStatus: 'REJECTED', createdAt: new Date('2026-01-04') },
      {
        id: 'c5',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-05'),
      },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.totalClients).toBe(5)
    expect(result.approvedClients).toBe(3)
    expect(result.rejectedClients).toBe(1)
    // 3 / (3 + 1) = 75%
    expect(result.successRate).toBe(75)
  })

  it('returns 100% success rate when all completed clients are approved', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-01') },
      { id: 'c2', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-02') },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.successRate).toBe(100)
  })

  it('returns 0% success rate when no clients have completed', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      {
        id: 'c1',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'c2',
        intakeStatus: 'PHONE_ISSUED',
        createdAt: new Date('2026-01-02'),
      },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.successRate).toBe(0)
  })

  it('computes correct delay rate with EXECUTION_DELAYED clients', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      {
        id: 'c1',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'c2',
        intakeStatus: 'PHONE_ISSUED',
        createdAt: new Date('2026-01-02'),
      },
      {
        id: 'c3',
        intakeStatus: 'EXECUTION_DELAYED',
        createdAt: new Date('2026-01-03'),
      },
      { id: 'c4', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-04') },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    // activePool = 2 (IN_EXECUTION + PHONE_ISSUED) + 1 (DELAYED) = 3
    // delayRate = 1 / 3 * 100 = 33%
    expect(result.delayRate).toBe(33)
    expect(result.delayedClients).toBe(1)
    expect(result.inProgressClients).toBe(2)
  })

  it('returns 0% delay rate when no active clients', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-01') },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.delayRate).toBe(0)
  })

  it('computes correct extension rate', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      {
        id: 'c1',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'c2',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-02'),
      },
      { id: 'c3', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-03') },
      { id: 'c4', intakeStatus: 'APPROVED', createdAt: new Date('2026-01-04') },
    ] as never)

    // 2 out of 4 clients have extension requests
    vi.mocked(prisma.extensionRequest.groupBy).mockResolvedValue([
      { clientId: 'c1' },
      { clientId: 'c2' },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    // 2 / 4 = 50%
    expect(result.extensionRate).toBe(50)
  })

  it('computes avgDaysToInitiate from event log', async () => {
    const jan1 = new Date('2026-01-01')
    const jan4 = new Date('2026-01-04') // 3 days later
    const jan6 = new Date('2026-01-06') // 5 days later

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'IN_EXECUTION', createdAt: jan1 },
      { id: 'c2', intakeStatus: 'IN_EXECUTION', createdAt: jan1 },
    ] as never)

    // The first eventLog.findMany call is for PHONE_ISSUED events
    vi.mocked(prisma.eventLog.findMany)
      .mockResolvedValueOnce([
        { clientId: 'c1', createdAt: jan4 }, // 3 days
        { clientId: 'c2', createdAt: jan6 }, // 5 days
      ] as never)
      .mockResolvedValueOnce([] as never) // APPROVED events

    const result = await getAgentKPIs('agent-1')

    // avg = (3 + 5) / 2 = 4.0
    expect(result.avgDaysToInitiate).toBe(4)
  })

  it('computes avgDaysToConvert from event log', async () => {
    const jan1 = new Date('2026-01-01')
    const jan11 = new Date('2026-01-11') // 10 days later
    const jan21 = new Date('2026-01-21') // 20 days later

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'APPROVED', createdAt: jan1 },
      { id: 'c2', intakeStatus: 'APPROVED', createdAt: jan1 },
    ] as never)

    vi.mocked(prisma.eventLog.findMany)
      .mockResolvedValueOnce([] as never) // PHONE_ISSUED events
      .mockResolvedValueOnce([
        { clientId: 'c1', createdAt: jan11 }, // 10 days
        { clientId: 'c2', createdAt: jan21 }, // 20 days
      ] as never) // APPROVED events

    const result = await getAgentKPIs('agent-1')

    // avg = (10 + 20) / 2 = 15.0
    expect(result.avgDaysToConvert).toBe(15)
  })

  it('returns null for timing when no events exist', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', intakeStatus: 'PENDING', createdAt: new Date('2026-01-01') },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.avgDaysToInitiate).toBeNull()
    expect(result.avgDaysToConvert).toBeNull()
  })

  it('counts pending and overdue todos', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      {
        id: 'c1',
        intakeStatus: 'IN_EXECUTION',
        createdAt: new Date('2026-01-01'),
      },
    ] as never)

    vi.mocked(prisma.toDo.groupBy).mockResolvedValue([
      { status: 'PENDING', _count: 3 },
      { status: 'IN_PROGRESS', _count: 2 },
      { status: 'OVERDUE', _count: 1 },
    ] as never)

    const result = await getAgentKPIs('agent-1')

    expect(result.pendingTodos).toBe(5) // 3 + 2
    expect(result.overdueTodos).toBe(1)
  })
})

describe('getAllAgentKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDefaultReturns()
  })

  it('returns KPIs keyed by agent ID', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'agent-1' },
      { id: 'agent-2' },
    ] as never)

    const result = await getAllAgentKPIs()

    expect(result).toHaveProperty('agent-1')
    expect(result).toHaveProperty('agent-2')
    expect(result['agent-1'].totalClients).toBe(0)
    expect(result['agent-2'].totalClients).toBe(0)
  })

  it('returns empty object when no agents exist', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const result = await getAllAgentKPIs()

    expect(Object.keys(result)).toHaveLength(0)
  })
})
