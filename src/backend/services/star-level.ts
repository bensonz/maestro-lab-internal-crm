import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import prisma from '@/backend/prisma/client'

/**
 * Pure function — maps approved client count to star level (0-4).
 */
export function calculateStarLevel(approvedCount: number): number {
  for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (approvedCount >= STAR_THRESHOLDS[i].min) {
      return STAR_THRESHOLDS[i].level
    }
  }
  return 0
}

/**
 * Returns the tier label for a given star level.
 */
export function getTierForStarLevel(starLevel: number): string {
  if (starLevel === 0) return 'rookie'
  return `${starLevel}-star`
}

/**
 * Recalculates an agent's star level based on their approved client count.
 * Updates User record and creates PromotionLog if the level changed.
 * Skips leadership-tier agents (ED+).
 *
 * Returns the new star level, or null if skipped.
 */
export async function recalculateAgentStarLevel(
  agentId: string,
): Promise<{ starLevel: number; changed: boolean } | null> {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, starLevel: true, leadershipTier: true, role: true },
  })

  if (!agent || agent.role !== 'AGENT') return null
  if (agent.leadershipTier !== 'NONE') return null

  const approvedCount = await prisma.clientRecord.count({
    where: { closerId: agentId, status: 'APPROVED' },
  })

  const newStarLevel = calculateStarLevel(approvedCount)

  if (newStarLevel === agent.starLevel) {
    return { starLevel: newStarLevel, changed: false }
  }

  const newTier = getTierForStarLevel(newStarLevel)

  await prisma.user.update({
    where: { id: agentId },
    data: { starLevel: newStarLevel, tier: newTier },
  })

  await prisma.promotionLog.create({
    data: {
      agentId,
      previousStarLevel: agent.starLevel,
      newStarLevel,
      approvedClientCount: approvedCount,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'STAR_LEVEL_CHANGED',
      description: `Agent star level changed from ${agent.starLevel}★ to ${newStarLevel}★`,
      userId: agentId,
      metadata: {
        previousStarLevel: agent.starLevel,
        newStarLevel,
        approvedClientCount: approvedCount,
      },
    },
  })

  return { starLevel: newStarLevel, changed: true }
}
