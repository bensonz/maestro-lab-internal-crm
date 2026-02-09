import prisma from '@/backend/prisma/client'

export async function getProfitSharingOverview() {
  const rules = await prisma.profitShareRule.findMany({
    include: {
      partner: { select: { id: true, name: true } },
      _count: { select: { details: true } },
      details: {
        select: {
          partnerAmount: true,
          companyAmount: true,
          feeAmount: true,
          status: true,
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  const pendingPayouts = await prisma.profitShareDetail.findMany({
    where: { status: 'pending' },
    include: {
      partner: { select: { name: true } },
      rule: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Summary stats
  const totalStats = await prisma.profitShareDetail.aggregate({
    _sum: {
      partnerAmount: true,
      companyAmount: true,
      feeAmount: true,
      grossAmount: true,
    },
    _count: true,
  })

  // Partners for rule creation dropdown
  const partners = await prisma.partner.findMany({
    where: { status: 'active' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return { rules, pendingPayouts, totalStats, partners }
}
