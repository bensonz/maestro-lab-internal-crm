import prisma from '@/backend/prisma/client'

export async function countApprovedClients(closerId: string): Promise<number> {
  return prisma.client.count({
    where: { closerId, status: 'APPROVED' },
  })
}

export async function getClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      closer: { select: { id: true, name: true, email: true, starLevel: true } },
      bonusPool: {
        include: {
          allocations: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
}

export async function getClientsByCloser(closerId: string) {
  return prisma.client.findMany({
    where: { closerId },
    orderBy: { createdAt: 'desc' },
    include: {
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
    },
  })
}

export async function getAllClients() {
  return prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
    },
  })
}
