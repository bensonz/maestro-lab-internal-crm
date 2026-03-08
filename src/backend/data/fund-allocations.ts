import prisma from '@/backend/prisma/client'

const ALLOCATION_INCLUDE = {
  recordedBy: { select: { id: true, name: true } },
  confirmedBy: { select: { id: true, name: true } },
} as const

/**
 * Fetch today's fund allocations.
 */
export async function getTodayFundAllocations() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return prisma.fundAllocation.findMany({
    where: { createdAt: { gte: todayStart } },
    include: ALLOCATION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Fetch fund allocations from the last N days.
 */
export async function getRecentFundAllocations(days: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return prisma.fundAllocation.findMany({
    where: { createdAt: { gte: since } },
    include: ALLOCATION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get unconfirmed fund allocations.
 */
export async function getUnconfirmedAllocations() {
  return prisma.fundAllocation.findMany({
    where: { confirmationStatus: 'UNCONFIRMED' },
    include: ALLOCATION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get fund allocation stats for the action hub.
 */
export async function getFundAllocationStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const [todayCount, yesterdayCount, unconfirmedCount] = await Promise.all([
    prisma.fundAllocation.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.fundAllocation.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.fundAllocation.count({
      where: { confirmationStatus: 'UNCONFIRMED' },
    }),
  ])

  return { todayCount, yesterdayCount, unconfirmedCount }
}
