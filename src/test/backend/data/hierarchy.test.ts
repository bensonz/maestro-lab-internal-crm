import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import {
  getAgentHierarchy,
  getTeamRollup,
  getAllSubordinateIds,
  mapToHierarchyAgent,
} from '@/backend/data/hierarchy'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: {
  id: string
  name?: string
  starLevel?: number
  tier?: string
  supervisorId?: string | null
  isActive?: boolean
  agentMetrics?: {
    totalClients: number
    approvedClients: number
    successRate: number
  } | null
  _count?: { agentClients: number }
  subordinates?: { id: string }[]
}) {
  return {
    id: overrides.id,
    name: overrides.name ?? `Agent ${overrides.id}`,
    email: `${overrides.id}@test.com`,
    avatar: null,
    tier: overrides.tier ?? 'rookie',
    starLevel: overrides.starLevel ?? 0,
    isActive: overrides.isActive ?? true,
    role: 'AGENT',
    supervisorId: overrides.supervisorId ?? null,
    agentMetrics: overrides.agentMetrics ?? null,
    _count: overrides._count ?? { agentClients: 0 },
    subordinates: overrides.subordinates ?? [],
  }
}

// ── getAgentHierarchy ───────────────────────────────────────────────────────

describe('getAgentHierarchy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns empty chain and no subordinates for solo agent', async () => {
    const agent = makeUser({ id: 'solo' })

    // findUniqueOrThrow for the agent itself (first call)
    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(agent as never) // getAgentHierarchy
      .mockResolvedValueOnce(agent as never) // buildSubordinateTree

    const result = await getAgentHierarchy('solo')

    expect(result.supervisorChain).toEqual([])
    expect(result.subordinateTree.subordinates).toEqual([])
    expect(result.teamSize).toBe(0)
    expect(result.agent.id).toBe('solo')
  })

  it('walks up supervisor chain correctly (3 levels)', async () => {
    const root = makeUser({
      id: 'root',
      name: 'Root',
      starLevel: 4,
      tier: '4-star',
    })
    const mid = makeUser({
      id: 'mid',
      name: 'Mid',
      starLevel: 2,
      tier: '2-star',
      supervisorId: 'root',
    })
    const agent = makeUser({
      id: 'agent',
      name: 'Agent',
      starLevel: 1,
      tier: '1-star',
      supervisorId: 'mid',
    })

    // getAgentHierarchy: findUniqueOrThrow for agent
    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(agent as never)
      // buildSubordinateTree: findUniqueOrThrow for agent again
      .mockResolvedValueOnce({ ...agent, subordinates: [] } as never)

    // Walk up: findUnique for mid, then root
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(mid as never) // supervisor of agent
      .mockResolvedValueOnce(root as never) // supervisor of mid
      .mockResolvedValueOnce(null as never) // root has no supervisor

    const result = await getAgentHierarchy('agent')

    expect(result.supervisorChain).toHaveLength(2)
    // Direct supervisor first
    expect(result.supervisorChain[0].id).toBe('mid')
    expect(result.supervisorChain[0].name).toBe('Mid')
    // Root last
    expect(result.supervisorChain[1].id).toBe('root')
    expect(result.supervisorChain[1].name).toBe('Root')
  })

  it('builds subordinate tree (2 levels deep)', async () => {
    const agent = makeUser({
      id: 'boss',
      subordinates: [{ id: 'sub1' }, { id: 'sub2' }],
    })
    const sub1 = makeUser({
      id: 'sub1',
      supervisorId: 'boss',
      subordinates: [{ id: 'grand1' }],
    })
    const sub2 = makeUser({
      id: 'sub2',
      supervisorId: 'boss',
      subordinates: [],
    })
    const grand1 = makeUser({
      id: 'grand1',
      supervisorId: 'sub1',
      subordinates: [],
    })

    // getAgentHierarchy: agent itself
    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(agent as never) // getAgentHierarchy
      // buildSubordinateTree calls:
      .mockResolvedValueOnce(agent as never) // boss
      .mockResolvedValueOnce(sub1 as never) // sub1
      .mockResolvedValueOnce(grand1 as never) // grand1
      .mockResolvedValueOnce(sub2 as never) // sub2

    const result = await getAgentHierarchy('boss')

    expect(result.subordinateTree.subordinates).toHaveLength(2)
    expect(result.subordinateTree.subordinates[0].id).toBe('sub1')
    expect(result.subordinateTree.subordinates[0].subordinates).toHaveLength(1)
    expect(result.subordinateTree.subordinates[0].subordinates[0].id).toBe(
      'grand1',
    )
    expect(result.subordinateTree.subordinates[1].id).toBe('sub2')
    expect(result.subordinateTree.subordinates[1].subordinates).toHaveLength(0)
    expect(result.teamSize).toBe(3) // sub1 + sub2 + grand1
  })

  it('handles circular reference in supervisor chain', async () => {
    // Agent A supervisor is B, B supervisor is A (cycle)
    const agentA = makeUser({ id: 'A', supervisorId: 'B' })
    const agentB = makeUser({ id: 'B', supervisorId: 'A' })

    vi.mocked(prisma.user.findUniqueOrThrow)
      .mockResolvedValueOnce(agentA as never) // getAgentHierarchy
      .mockResolvedValueOnce({ ...agentA, subordinates: [] } as never) // buildSubordinateTree

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(agentB as never) // supervisor of A = B
      .mockResolvedValueOnce(agentA as never) // supervisor of B = A (cycle detected via visited)

    const result = await getAgentHierarchy('A')

    // Chain: B first, then A (visited set stops when B's supervisor 'A' is already visited)
    // Actually: B is added to visited, then A is added to visited. A's supervisor is B which IS in visited → stops
    expect(result.supervisorChain).toHaveLength(2)
    expect(result.supervisorChain[0].id).toBe('B')
    expect(result.supervisorChain[1].id).toBe('A')
    // No infinite loop occurred — would have looped forever without visited set
  })
})

// ── getTeamRollup ───────────────────────────────────────────────────────────

describe('getTeamRollup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns zeros for agent with no subordinates', async () => {
    // getAllSubordinateIds: findMany returns empty
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as never)

    const result = await getTeamRollup('solo')

    expect(result.totalAgents).toBe(0)
    expect(result.activeAgents).toBe(0)
    expect(result.totalClients).toBe(0)
    expect(result.approvedClients).toBe(0)
    expect(result.teamSuccessRate).toBe(0)
    expect(result.tierBreakdown).toEqual({})
  })

  it('aggregates metrics across subordinates', async () => {
    // getAllSubordinateIds BFS: first call returns 2 direct subs
    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([{ id: 'sub1' }, { id: 'sub2' }] as never) // subs of root
      .mockResolvedValueOnce([] as never) // subs of sub1
      .mockResolvedValueOnce([] as never) // subs of sub2
      // getTeamRollup: batch query for all subordinates
      .mockResolvedValueOnce([
        makeUser({
          id: 'sub1',
          tier: '1-star',
          isActive: true,
          agentMetrics: {
            totalClients: 10,
            approvedClients: 8,
            successRate: 0.8,
          },
        }),
        makeUser({
          id: 'sub2',
          tier: 'rookie',
          isActive: false,
          agentMetrics: {
            totalClients: 5,
            approvedClients: 2,
            successRate: 0.4,
          },
        }),
      ] as never)

    const result = await getTeamRollup('root')

    expect(result.totalAgents).toBe(2)
    expect(result.activeAgents).toBe(1) // sub2 is inactive
    expect(result.totalClients).toBe(15)
    expect(result.approvedClients).toBe(10)
    expect(result.teamSuccessRate).toBeCloseTo(0.67, 1) // 10/15 rounded
    expect(result.tierBreakdown).toEqual({ '1-star': 1, rookie: 1 })
  })

  it('counts nested subordinates (grandchildren)', async () => {
    // BFS traversal:
    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([{ id: 'sub1' }, { id: 'sub2' }] as never) // direct subs of root
      .mockResolvedValueOnce([{ id: 'grand1' }, { id: 'grand2' }] as never) // subs of sub1
      .mockResolvedValueOnce([{ id: 'grand3' }, { id: 'grand4' }] as never) // subs of sub2
      .mockResolvedValueOnce([] as never) // subs of grand1
      .mockResolvedValueOnce([] as never) // subs of grand2
      .mockResolvedValueOnce([] as never) // subs of grand3
      .mockResolvedValueOnce([] as never) // subs of grand4
      // batch query for all 6 subordinates
      .mockResolvedValueOnce(
        ['sub1', 'sub2', 'grand1', 'grand2', 'grand3', 'grand4'].map((id) =>
          makeUser({
            id,
            tier: 'rookie',
            agentMetrics: {
              totalClients: 3,
              approvedClients: 2,
              successRate: 0.67,
            },
          }),
        ) as never,
      )

    const result = await getTeamRollup('root')

    expect(result.totalAgents).toBe(6)
    expect(result.totalClients).toBe(18) // 6 * 3
    expect(result.approvedClients).toBe(12) // 6 * 2
  })
})

// ── getAllSubordinateIds ─────────────────────────────────────────────────────

describe('getAllSubordinateIds', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not double-count with BFS traversal', async () => {
    // Simple tree: root → sub1 → grand1
    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([{ id: 'sub1' }] as never) // subs of root
      .mockResolvedValueOnce([{ id: 'grand1' }] as never) // subs of sub1
      .mockResolvedValueOnce([] as never) // subs of grand1

    const ids = await getAllSubordinateIds('root')

    expect(ids).toEqual(['sub1', 'grand1'])
    // Each ID appears exactly once
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ── mapToHierarchyAgent ─────────────────────────────────────────────────────

describe('mapToHierarchyAgent', () => {
  it('falls back to _count when agentMetrics is null', () => {
    const user = makeUser({
      id: 'new-agent',
      agentMetrics: null,
      _count: { agentClients: 7 },
    })

    const result = mapToHierarchyAgent(user)

    expect(result.totalClients).toBe(7)
    expect(result.approvedClients).toBe(0)
    expect(result.successRate).toBe(0)
  })

  it('uses agentMetrics when available', () => {
    const user = makeUser({
      id: 'experienced',
      agentMetrics: {
        totalClients: 20,
        approvedClients: 15,
        successRate: 0.75,
      },
      _count: { agentClients: 20 },
    })

    const result = mapToHierarchyAgent(user)

    expect(result.totalClients).toBe(20)
    expect(result.approvedClients).toBe(15)
    expect(result.successRate).toBe(0.75)
  })
})
