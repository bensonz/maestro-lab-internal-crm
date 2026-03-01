import prisma from '@/backend/prisma/client'

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      tier: true,
      starLevel: true,
      supervisorId: true,
    },
  })
}

export async function getAllAgents() {
  return prisma.user.findMany({
    where: { role: 'AGENT' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      tier: true,
      starLevel: true,
      leadershipTier: true,
      isActive: true,
      createdAt: true,
      supervisorId: true,
      zelle: true,
      address: true,
      supervisor: { select: { id: true, name: true } },
      _count: { select: { subordinates: true } },
      allocations: { select: { amount: true, createdAt: true } },
      closedClients: {
        where: { status: 'APPROVED' },
        select: { createdAt: true },
      },
    },
  })
}

export async function getAgentStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalAgents, newThisMonth] = await Promise.all([
    prisma.user.count({ where: { role: 'AGENT' } }),
    prisma.user.count({
      where: { role: 'AGENT', createdAt: { gte: startOfMonth } },
    }),
  ])

  return { totalAgents, newThisMonth }
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      supervisor: { select: { id: true, name: true } },
      subordinates: { select: { id: true, name: true } },
    },
  })
}

export async function getAgentIdList(view: 'table' | 'tree' = 'table') {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT' },
    select: { id: true, name: true, starLevel: true, leadershipTier: true, supervisorId: true },
  })

  if (view === 'tree') {
    // Depth-first traversal of the hierarchy, highest rank first at each level
    const childrenMap = new Map<string | null, typeof agents>()
    for (const a of agents) {
      const parentKey = a.supervisorId ?? null
      if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, [])
      childrenMap.get(parentKey)!.push(a)
    }
    const sortByRank = (list: typeof agents) =>
      list.sort((a, b) => getAgentRankValue(b) - getAgentRankValue(a) || a.name.localeCompare(b.name))

    const result: string[] = []
    function walk(parentId: string | null) {
      const children = childrenMap.get(parentId)
      if (!children) return
      sortByRank(children)
      for (const child of children) {
        result.push(child.id)
        walk(child.id)
      }
    }
    // Start with root agents (no supervisor or supervisor not in agent list)
    const agentIds = new Set(agents.map((a) => a.id))
    const roots = agents.filter((a) => !a.supervisorId || !agentIds.has(a.supervisorId))
    sortByRank(roots)
    for (const root of roots) {
      result.push(root.id)
      walk(root.id)
    }
    return result
  }

  // Default: sort by rank descending (highest first), alphabetical tiebreaker
  agents.sort((a, b) => getAgentRankValue(b) - getAgentRankValue(a) || a.name.localeCompare(b.name))
  return agents.map((a) => a.id)
}

const LEADERSHIP_RANK_MAP: Record<string, number> = { NONE: 0, ED: 1, SED: 2, MD: 3, CMO: 4 }

function getAgentRankValue(agent: { starLevel: number; leadershipTier: string }): number {
  return agent.starLevel + (LEADERSHIP_RANK_MAP[agent.leadershipTier] || 0)
}

export async function getActiveAgents() {
  return prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function getAgentsForHierarchy() {
  return prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    orderBy: { starLevel: 'desc' },
    select: {
      id: true,
      name: true,
      starLevel: true,
      leadershipTier: true,
      _count: { select: { closedClients: true } },
    },
  })
}

/**
 * Builds the full hierarchy data for an agent's earnings page.
 * Returns the agent info, supervisor chain, subordinate tree, and team size.
 */
export async function getAgentHierarchy(agentId: string) {
  // Fetch all agents in one query to build the tree in memory
  const allAgents = await prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      tier: true,
      starLevel: true,
      isActive: true,
      role: true,
      supervisorId: true,
      closedClients: {
        select: { status: true },
      },
    },
  })

  type AgentRow = (typeof allAgents)[number]

  function toHierarchyAgent(a: AgentRow) {
    const totalClients = a.closedClients.length
    const approvedClients = a.closedClients.filter(c => c.status === 'APPROVED').length
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      avatar: a.avatar,
      tier: a.tier,
      starLevel: a.starLevel,
      isActive: a.isActive,
      role: a.role,
      totalClients,
      approvedClients,
      successRate: totalClients > 0 ? Math.round((approvedClients / totalClients) * 1000) / 10 : 0,
    }
  }

  const agentMap = new Map(allAgents.map(a => [a.id, a]))
  const current = agentMap.get(agentId)
  if (!current) return null

  // Build supervisor chain (walk up)
  const supervisorChain = []
  let cursor = current.supervisorId ? agentMap.get(current.supervisorId) : undefined
  while (cursor) {
    supervisorChain.push(toHierarchyAgent(cursor))
    cursor = cursor.supervisorId ? agentMap.get(cursor.supervisorId) : undefined
  }

  // Build children map
  const childrenMap = new Map<string, AgentRow[]>()
  for (const a of allAgents) {
    if (a.supervisorId) {
      if (!childrenMap.has(a.supervisorId)) childrenMap.set(a.supervisorId, [])
      childrenMap.get(a.supervisorId)!.push(a)
    }
  }

  // Build subordinate tree (recursive)
  let teamSize = 0
  function buildTree(parentId: string): { id: string; name: string; email: string; avatar: string | null; tier: string; starLevel: number; isActive: boolean; role: string; totalClients: number; approvedClients: number; successRate: number; subordinates: ReturnType<typeof buildTree>[] } {
    const agent = agentMap.get(parentId)!
    const children = childrenMap.get(parentId) ?? []
    const subordinates = children.map(c => {
      teamSize++
      return buildTree(c.id)
    })
    return { ...toHierarchyAgent(agent), subordinates }
  }

  const subordinateTree = buildTree(agentId)

  return {
    agent: toHierarchyAgent(current),
    supervisorChain,
    subordinateTree,
    teamSize,
  }
}
