import prisma from '@/backend/prisma/client'
import { LEADERSHIP_TIERS } from '@/lib/commission-constants'
import type { LeadershipTier } from '@/types'

export interface EligibilityResult {
  eligible: boolean
  reason?: string
  ownClients: number
  qualifiedSubordinates: number
  directSubordinates: number
}

/**
 * Checks whether an agent meets the requirements for a given leadership tier.
 */
export async function checkLeadershipEligibility(
  agentId: string,
  targetTier: 'ED' | 'SED' | 'MD' | 'CMO',
): Promise<EligibilityResult> {
  const tierConfig = LEADERSHIP_TIERS.find((t) => t.tier === targetTier)
  if (!tierConfig) {
    return { eligible: false, reason: 'Invalid tier', ownClients: 0, qualifiedSubordinates: 0, directSubordinates: 0 }
  }

  const reqs = tierConfig.requirements

  // Count agent's own approved clients
  const ownClients = await prisma.clientRecord.count({
    where: { closerId: agentId, status: 'APPROVED' },
  })

  if (ownClients < reqs.minOwnClients) {
    return {
      eligible: false,
      reason: `Need ${reqs.minOwnClients} approved clients, have ${ownClients}`,
      ownClients,
      qualifiedSubordinates: 0,
      directSubordinates: 0,
    }
  }

  // Count direct subordinates that meet the star level requirement
  const directSubs = await prisma.user.findMany({
    where: { supervisorId: agentId, role: 'AGENT', isActive: true },
    select: { id: true, starLevel: true },
  })

  const qualifiedSubs = directSubs.filter(
    (s) => s.starLevel >= reqs.subTierLevel,
  )

  if (qualifiedSubs.length < reqs.subCount) {
    return {
      eligible: false,
      reason: `Need ${reqs.subCount} subordinates with ${reqs.subTierLevel}★, have ${qualifiedSubs.length}`,
      ownClients,
      qualifiedSubordinates: qualifiedSubs.length,
      directSubordinates: directSubs.length,
    }
  }

  // Check minimum direct reports
  if (directSubs.length < reqs.minDirect) {
    return {
      eligible: false,
      reason: `Need ${reqs.minDirect} direct reports, have ${directSubs.length}`,
      ownClients,
      qualifiedSubordinates: qualifiedSubs.length,
      directSubordinates: directSubs.length,
    }
  }

  return {
    eligible: true,
    ownClients,
    qualifiedSubordinates: qualifiedSubs.length,
    directSubordinates: directSubs.length,
  }
}

/**
 * Promotes an agent to a leadership tier.
 * Creates PromotionLog and EventLog entries.
 */
export async function promoteToLeadership(
  agentId: string,
  tier: 'ED' | 'SED' | 'MD' | 'CMO',
): Promise<{ success: boolean; error?: string; promotionBonus?: number }> {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, starLevel: true, leadershipTier: true },
  })

  if (!agent) return { success: false, error: 'Agent not found' }

  const tierConfig = LEADERSHIP_TIERS.find((t) => t.tier === tier)
  if (!tierConfig) return { success: false, error: 'Invalid tier' }

  // Verify eligibility
  const eligibility = await checkLeadershipEligibility(agentId, tier)
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason }
  }

  const previousTier = agent.leadershipTier as LeadershipTier

  await prisma.user.update({
    where: { id: agentId },
    data: { leadershipTier: tier },
  })

  const approvedCount = await prisma.clientRecord.count({
    where: { closerId: agentId, status: 'APPROVED' },
  })

  await prisma.promotionLog.create({
    data: {
      agentId,
      previousStarLevel: agent.starLevel,
      newStarLevel: agent.starLevel,
      previousLeadershipTier: previousTier,
      newLeadershipTier: tier,
      promotionBonus: tierConfig.promotionBonus,
      approvedClientCount: approvedCount,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'LEADERSHIP_PROMOTED',
      description: `Agent promoted to ${tierConfig.label}`,
      userId: agentId,
      metadata: {
        previousTier: previousTier,
        newTier: tier,
        promotionBonus: tierConfig.promotionBonus,
      },
    },
  })

  return { success: true, promotionBonus: tierConfig.promotionBonus }
}

/**
 * BFS down subordinates to find all agents in a leader's team.
 * Stops at nodes that are themselves ED+ (team independence boundary).
 */
export async function getEffectiveTeamIds(leaderId: string): Promise<string[]> {
  const teamIds: string[] = []
  const queue: string[] = [leaderId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    if (currentId !== leaderId) {
      // Check if this subordinate is a leadership agent (team independence)
      const sub = await prisma.user.findUnique({
        where: { id: currentId },
        select: { leadershipTier: true },
      })

      if (sub && sub.leadershipTier !== 'NONE') {
        // Stop traversing this branch — independent team
        continue
      }

      teamIds.push(currentId)
    }

    const subordinates = await prisma.user.findMany({
      where: { supervisorId: currentId, role: 'AGENT', isActive: true },
      select: { id: true },
    })

    for (const s of subordinates) {
      if (!visited.has(s.id)) {
        queue.push(s.id)
      }
    }
  }

  return teamIds
}
