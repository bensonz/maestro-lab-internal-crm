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

export interface ApplicationTimelineEntry {
  id: string
  date: string
  time: string
  event: string
  type: 'info' | 'success' | 'warning'
  actor: string | null
  applicationId: string | null
  action: string | null  // 'approved' | 'rejected' | 'revert_to_pending'
}

/**
 * Fetches application review events (approved, rejected, reverted) for the activity timeline.
 * Queries events with APPLICATION_APPROVED and APPLICATION_REJECTED types.
 * APPLICATION_REJECTED with metadata.action='revert_to_pending' is shown as "Reverted".
 * Sorted newest first, limit 100.
 */
export async function getApplicationTimeline(): Promise<ApplicationTimelineEntry[]> {
  const events = await prisma.eventLog.findMany({
    where: {
      eventType: {
        in: ['APPLICATION_APPROVED', 'APPLICATION_REJECTED'],
      },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return events.map((e) => {
    const metadata = (e.metadata ?? {}) as Record<string, unknown>
    const isRevert = metadata.action === 'revert_to_pending'
    let action: string
    if (isRevert) {
      action = 'revert_to_pending'
    } else if (e.eventType === 'APPLICATION_APPROVED') {
      action = 'approved'
    } else {
      action = 'rejected'
    }

    return {
      id: e.id,
      date: e.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: e.createdAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      event: e.description,
      type: isRevert ? 'warning' as const : mapEventType(e.eventType),
      actor: e.user?.name ?? null,
      applicationId: (metadata.applicationId as string) ?? null,
      action,
    }
  })
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
