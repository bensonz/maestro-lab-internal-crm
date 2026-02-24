import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    agentApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import {
  getPendingApplications,
  getApplicationById,
  getApplicationStats,
} from '@/backend/data/applications'

describe('getPendingApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending applications ordered by createdAt desc', async () => {
    const mockApps = [
      { id: 'app-2', status: 'PENDING', firstName: 'B', createdAt: new Date('2026-02-19') },
      { id: 'app-1', status: 'PENDING', firstName: 'A', createdAt: new Date('2026-02-18') },
    ]
    mockPrisma.agentApplication.findMany.mockResolvedValue(mockApps)

    const result = await getPendingApplications()

    expect(result).toEqual(mockApps)
    expect(mockPrisma.agentApplication.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: { select: { id: true, name: true } },
      },
    })
  })

  it('returns empty array when no pending applications', async () => {
    mockPrisma.agentApplication.findMany.mockResolvedValue([])
    const result = await getPendingApplications()
    expect(result).toEqual([])
  })
})

describe('getApplicationById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns application with reviewer info', async () => {
    const mockApp = {
      id: 'app-1',
      status: 'APPROVED',
      reviewedBy: { id: 'admin-1', name: 'Admin' },
      resultUser: { id: 'user-1', name: 'Agent', email: 'agent@test.com' },
    }
    mockPrisma.agentApplication.findUnique.mockResolvedValue(mockApp)

    const result = await getApplicationById('app-1')

    expect(result).toEqual(mockApp)
    expect(mockPrisma.agentApplication.findUnique).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      include: {
        reviewedBy: { select: { id: true, name: true } },
        resultUser: { select: { id: true, name: true, email: true } },
      },
    })
  })

  it('returns null for non-existent application', async () => {
    mockPrisma.agentApplication.findUnique.mockResolvedValue(null)
    const result = await getApplicationById('nonexistent')
    expect(result).toBeNull()
  })
})

describe('getApplicationStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct counts by status', async () => {
    mockPrisma.agentApplication.count
      .mockResolvedValueOnce(3)  // pending
      .mockResolvedValueOnce(10) // approved
      .mockResolvedValueOnce(2)  // rejected
      .mockResolvedValueOnce(15) // total

    const result = await getApplicationStats()

    expect(result).toEqual({
      pending: 3,
      approved: 10,
      rejected: 2,
      total: 15,
    })

    expect(mockPrisma.agentApplication.count).toHaveBeenCalledTimes(4)
  })

  it('returns zeros when no applications exist', async () => {
    mockPrisma.agentApplication.count.mockResolvedValue(0)

    const result = await getApplicationStats()

    expect(result).toEqual({
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    })
  })
})
