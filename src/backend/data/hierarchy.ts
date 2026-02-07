import prisma from '@/backend/prisma/client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface HierarchyAgent {
  id: string
  name: string
  email: string
  avatar: string | null
  tier: string
  starLevel: number
  isActive: boolean
  role: string
  totalClients: number
  approvedClients: number
  successRate: number
}

export interface HierarchyNode extends HierarchyAgent {
  subordinates: HierarchyNode[]
}

// ── getAgentHierarchy ───────────────────────────────────────────────────────

export async function getAgentHierarchy(agentId: string): Promise<{
  agent: HierarchyAgent
  supervisorChain: HierarchyAgent[]
  subordinateTree: HierarchyNode
  teamSize: number
}> {
  const agent = await prisma.user.findUniqueOrThrow({
    where: { id: agentId },
    include: {
      agentMetrics: true,
      _count: { select: { agentClients: true } },
    },
  })

  // Walk UP to build supervisor chain
  const supervisorChain: HierarchyAgent[] = []
  let currentSupervisorId = agent.supervisorId
  const visitedIds = new Set<string>()

  while (currentSupervisorId && !visitedIds.has(currentSupervisorId)) {
    visitedIds.add(currentSupervisorId)
    const sup = await prisma.user.findUnique({
      where: { id: currentSupervisorId },
      include: {
        agentMetrics: true,
        _count: { select: { agentClients: true } },
      },
    })
    if (!sup) break
    supervisorChain.push(mapToHierarchyAgent(sup))
    currentSupervisorId = sup.supervisorId
  }

  // Build subordinate tree (recursive)
  const subordinateTree = await buildSubordinateTree(agentId)

  // Count total team size (exclude self)
  const teamSize = countNodes(subordinateTree) - 1

  return {
    agent: mapToHierarchyAgent(agent),
    supervisorChain,
    subordinateTree,
    teamSize,
  }
}

// ── getTeamRollup ───────────────────────────────────────────────────────────

export async function getTeamRollup(agentId: string): Promise<{
  totalAgents: number
  activeAgents: number
  totalClients: number
  approvedClients: number
  teamSuccessRate: number
  tierBreakdown: Record<string, number>
}> {
  const allSubIds = await getAllSubordinateIds(agentId)

  if (allSubIds.length === 0) {
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalClients: 0,
      approvedClients: 0,
      teamSuccessRate: 0,
      tierBreakdown: {},
    }
  }

  const subordinates = await prisma.user.findMany({
    where: { id: { in: allSubIds } },
    include: { agentMetrics: true },
  })

  const activeAgents = subordinates.filter((s) => s.isActive).length

  let totalClients = 0
  let approvedClients = 0
  const tierBreakdown: Record<string, number> = {}

  for (const sub of subordinates) {
    totalClients += sub.agentMetrics?.totalClients ?? 0
    approvedClients += sub.agentMetrics?.approvedClients ?? 0
    tierBreakdown[sub.tier] = (tierBreakdown[sub.tier] ?? 0) + 1
  }

  const teamSuccessRate =
    totalClients > 0
      ? Math.round((approvedClients / totalClients) * 100) / 100
      : 0

  return {
    totalAgents: allSubIds.length,
    activeAgents,
    totalClients,
    approvedClients,
    teamSuccessRate,
    tierBreakdown,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buildSubordinateTree(agentId: string): Promise<HierarchyNode> {
  const agent = await prisma.user.findUniqueOrThrow({
    where: { id: agentId },
    include: {
      agentMetrics: true,
      _count: { select: { agentClients: true } },
      subordinates: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  })

  const subordinates: HierarchyNode[] = []
  for (const sub of agent.subordinates) {
    subordinates.push(await buildSubordinateTree(sub.id))
  }

  return {
    ...mapToHierarchyAgent(agent),
    subordinates,
  }
}

function countNodes(node: HierarchyNode): number {
  return 1 + node.subordinates.reduce((sum, sub) => sum + countNodes(sub), 0)
}

export async function getAllSubordinateIds(
  agentId: string,
): Promise<string[]> {
  const ids: string[] = []
  const queue = [agentId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const subs = await prisma.user.findMany({
      where: { supervisorId: currentId, isActive: true },
      select: { id: true },
    })

    for (const sub of subs) {
      ids.push(sub.id)
      queue.push(sub.id)
    }
  }

  return ids
}

export function mapToHierarchyAgent(user: {
  id: string
  name: string
  email: string
  avatar: string | null
  tier: string
  starLevel: number
  isActive: boolean
  role: string
  agentMetrics: {
    totalClients: number
    approvedClients: number
    successRate: number
  } | null
  _count?: { agentClients: number }
}): HierarchyAgent {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    tier: user.tier,
    starLevel: user.starLevel,
    isActive: user.isActive,
    role: user.role,
    totalClients:
      user.agentMetrics?.totalClients ?? user._count?.agentClients ?? 0,
    approvedClients: user.agentMetrics?.approvedClients ?? 0,
    successRate: user.agentMetrics?.successRate ?? 0,
  }
}
