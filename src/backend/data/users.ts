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
      supervisor: { select: { id: true, name: true } },
      _count: { select: { subordinates: true } },
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
