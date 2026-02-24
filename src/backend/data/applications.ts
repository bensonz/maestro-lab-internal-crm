import prisma from '@/backend/prisma/client'

export async function getPendingApplications() {
  return prisma.agentApplication.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedBy: { select: { id: true, name: true } },
    },
  })
}

export async function getAllApplications() {
  return prisma.agentApplication.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedBy: { select: { id: true, name: true } },
      resultUser: {
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
          starLevel: true,
          leadershipTier: true,
          supervisor: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function getApplicationById(id: string) {
  return prisma.agentApplication.findUnique({
    where: { id },
    include: {
      reviewedBy: { select: { id: true, name: true } },
      resultUser: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getApplicationStats() {
  const [pending, approved, rejected, total] = await Promise.all([
    prisma.agentApplication.count({ where: { status: 'PENDING' } }),
    prisma.agentApplication.count({ where: { status: 'APPROVED' } }),
    prisma.agentApplication.count({ where: { status: 'REJECTED' } }),
    prisma.agentApplication.count(),
  ])

  return { pending, approved, rejected, total }
}
