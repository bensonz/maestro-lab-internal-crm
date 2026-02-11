'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { EventType, PlatformStatus, PlatformType, UserRole } from '@/types'
import { notifyRole } from '@/backend/services/notifications'
import logger from '@/backend/logger'
import { revalidatePath } from 'next/cache'

export type RetryActionState = {
  success?: boolean
  message?: string
}

/**
 * Agent action: resubmit BetMGM evidence after a backoffice "reject with retry" decision.
 * Validates cooldown has passed, updates platform status back to PENDING_REVIEW.
 */
export async function retryBetmgmSubmission(
  clientId: string,
  agentResult: string,
  screenshots: string[],
): Promise<RetryActionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: 'You must be logged in' }
  }

  // Verify agent owns this client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { agentId: true, firstName: true, lastName: true },
  })

  if (!client) {
    return { success: false, message: 'Client not found' }
  }

  if (client.agentId !== session.user.id) {
    return { success: false, message: 'You are not assigned to this client' }
  }

  // Find BetMGM platform — must be in RETRY_PENDING
  const platform = await prisma.clientPlatform.findFirst({
    where: {
      clientId,
      platformType: PlatformType.BETMGM,
    },
    select: {
      id: true,
      status: true,
      retryAfter: true,
      retryCount: true,
    },
  })

  if (!platform) {
    return { success: false, message: 'BetMGM platform record not found' }
  }

  if (platform.status !== PlatformStatus.RETRY_PENDING) {
    return { success: false, message: 'BetMGM is not in retry-pending state' }
  }

  // Verify cooldown has passed
  if (platform.retryAfter && platform.retryAfter.getTime() > Date.now()) {
    return { success: false, message: 'Retry cooldown has not expired yet' }
  }

  // Require at least 1 screenshot
  if (screenshots.length === 0) {
    return { success: false, message: 'At least one screenshot is required' }
  }

  try {
    await prisma.clientPlatform.update({
      where: { id: platform.id },
      data: {
        status: PlatformStatus.PENDING_REVIEW,
        screenshots,
        agentResult,
        retryAfter: null,
        retryCount: platform.retryCount + 1,
      },
    })

    await prisma.eventLog.create({
      data: {
        eventType: EventType.PLATFORM_STATUS_CHANGE,
        description: `BetMGM resubmitted by agent (attempt ${platform.retryCount + 1}, agent result: ${agentResult})`,
        clientId,
        userId: session.user.id,
        oldValue: PlatformStatus.RETRY_PENDING,
        newValue: PlatformStatus.PENDING_REVIEW,
      },
    })

    // Notify backoffice
    try {
      const clientName = `${client.firstName} ${client.lastName}`
      await notifyRole({
        role: [UserRole.ADMIN, UserRole.BACKOFFICE],
        type: EventType.PLATFORM_STATUS_CHANGE,
        title: 'BetMGM resubmitted for review',
        message: `${clientName} BetMGM resubmitted (attempt ${platform.retryCount + 1}, agent reported: ${agentResult})`,
        link: `/backoffice/client-management?client=${clientId}`,
        clientId,
      })
    } catch (err) {
      logger.warn('Notification failed after BetMGM retry', { error: err, clientId })
    }

    revalidatePath(`/agent/new-client`)
    revalidatePath('/backoffice/client-management')

    return { success: true, message: 'BetMGM resubmitted for review' }
  } catch (error) {
    logger.error('BetMGM retry submission failed', { error, clientId })
    return { success: false, message: 'Failed to resubmit BetMGM' }
  }
}
