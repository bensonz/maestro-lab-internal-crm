import prisma from '@/backend/prisma/client'

export interface TimelineEntry {
  date: string
  event: string
  type: 'info' | 'success' | 'warning'
  actor: string | null
}

/**
 * Fetches the activity timeline for an agent.
 * Merges two sets of events:
 * 1. Events where userId = agentId (the agent's own actions)
 * 2. Events where metadata.updatedUserId = agentId (edits about this agent by others)
 * Deduplicates by event ID, sorts newest first, limit 50.
 */
export async function getAgentTimeline(agentId: string): Promise<TimelineEntry[]> {
  // Query 1: Events performed BY the agent
  const ownEvents = prisma.eventLog.findMany({
    where: { userId: agentId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Query 2: Events performed ON the agent by others (metadata contains updatedUserId)
  // Prisma Json filtering: metadata path ['updatedUserId'] equals agentId
  const aboutEvents = prisma.eventLog.findMany({
    where: {
      metadata: { path: ['updatedUserId'], equals: agentId },
      NOT: { userId: agentId }, // exclude self-edits (already in ownEvents)
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const [own, about] = await Promise.all([ownEvents, aboutEvents])

  // Merge and deduplicate by ID
  const seen = new Set<string>()
  const merged = [...own, ...about].filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  // Sort newest first
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Take top 50
  const limited = merged.slice(0, 50)

  return limited.map((e) => ({
    date: e.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    event: e.description,
    type: mapEventType(e.eventType),
    actor: e.user?.name ?? null,
  }))
}

function mapEventType(eventType: string): 'info' | 'success' | 'warning' {
  switch (eventType) {
    case 'APPLICATION_APPROVED':
    case 'CLIENT_APPROVED':
    case 'BONUS_POOL_CREATED':
    case 'BONUS_POOL_DISTRIBUTED':
    case 'ALLOCATION_PAID':
    case 'LEADERSHIP_PROMOTED':
    case 'STAR_LEVEL_CHANGED':
      return 'success'
    case 'USER_DEACTIVATED':
    case 'APPLICATION_REJECTED':
      return 'warning'
    default:
      return 'info'
  }
}
