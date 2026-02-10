import prisma from '@/backend/prisma/client'

export async function getPartnersOverview() {
  const partners = await prisma.partner.findMany({
    include: {
      _count: {
        select: {
          clients: true,
          profitShareRules: true,
          profitShareDetails: true,
        },
      },
      profitShareDetails: {
        select: { partnerAmount: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Unassigned clients (no partner)
  const unassignedCount = await prisma.client.count({
    where: { partnerId: null },
  })

  // All clients for assignment dropdown
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      partnerId: true,
    },
    orderBy: { lastName: 'asc' },
  })

  return { partners, unassignedCount, clients }
}
