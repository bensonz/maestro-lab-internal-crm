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

export async function getAgentIdList() {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return agents.map((a) => a.id)
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
