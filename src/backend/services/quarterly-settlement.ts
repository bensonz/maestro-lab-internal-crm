import prisma from '@/backend/prisma/client'
import { LEADERSHIP_TIERS } from '@/lib/commission-constants'
import { getEffectiveTeamIds } from '@/backend/services/leadership'

/**
 * Calculates quarterly settlement for a leadership agent.
 * Team revenue = sum of all BonusPool.totalAmount for the leader's team in the given quarter.
 * Commission = teamRevenue × commissionPercent
 */
export async function calculateQuarterlySettlement(
  leaderId: string,
  year: number,
  quarter: number,
): Promise<{
  success: boolean
  error?: string
  settlementId?: string
  teamRevenue?: number
  commissionAmount?: number
}> {
  const leader = await prisma.user.findUnique({
    where: { id: leaderId },
    select: { id: true, leadershipTier: true },
  })

  if (!leader) return { success: false, error: 'Leader not found' }
  if (leader.leadershipTier === 'NONE') {
    return { success: false, error: 'Agent is not a leadership tier' }
  }

  const tierConfig = LEADERSHIP_TIERS.find((t) => t.tier === leader.leadershipTier)
  if (!tierConfig) return { success: false, error: 'Invalid leadership tier' }

  // Check for existing settlement
  const existing = await prisma.quarterlySettlement.findUnique({
    where: {
      leaderId_year_quarter: { leaderId, year, quarter },
    },
  })
  if (existing) {
    return { success: false, error: 'Settlement already exists for this quarter' }
  }

  // Get team agent IDs
  const teamAgentIds = await getEffectiveTeamIds(leaderId)

  // Calculate quarter date range
  const startMonth = (quarter - 1) * 3
  const quarterStart = new Date(year, startMonth, 1)
  const quarterEnd = new Date(year, startMonth + 3, 1)

  // Sum team revenue from bonus pools distributed in this quarter
  const pools = await prisma.bonusPool.findMany({
    where: {
      closerId: { in: [...teamAgentIds, leaderId] },
      status: 'DISTRIBUTED',
      distributedAt: {
        gte: quarterStart,
        lt: quarterEnd,
      },
    },
    select: { totalAmount: true },
  })

  const teamRevenue = pools.reduce((sum, p) => sum + p.totalAmount, 0)
  const commissionAmount = Math.round((teamRevenue * tierConfig.commissionPercent) / 100)

  const settlement = await prisma.quarterlySettlement.create({
    data: {
      leaderId,
      leaderTier: leader.leadershipTier,
      year,
      quarter,
      teamRevenue,
      commissionPercent: tierConfig.commissionPercent,
      commissionAmount,
      teamAgentIds: [...teamAgentIds, leaderId],
      status: 'DRAFT',
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'QUARTERLY_SETTLEMENT_CREATED',
      description: `Quarterly settlement created for Q${quarter} ${year}: $${commissionAmount}`,
      userId: leaderId,
      metadata: {
        settlementId: settlement.id,
        teamRevenue,
        commissionAmount,
        commissionPercent: tierConfig.commissionPercent,
        teamSize: teamAgentIds.length,
      },
    },
  })

  return {
    success: true,
    settlementId: settlement.id,
    teamRevenue,
    commissionAmount,
  }
}
