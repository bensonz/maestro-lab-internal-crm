'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { transitionClientStatus } from '@/backend/services/status-transition'
import { revalidatePath } from 'next/cache'
import { IntakeStatus, UserRole, PlatformType, PlatformStatus, EventType } from '@/types'
import { createNotification } from '@/backend/services/notifications'
import logger from '@/backend/logger'

export async function approveClientIntake(
  clientId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.APPROVED,
    session.user.id,
  )

  if (result.success) {
    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
    revalidatePath(`/agent/clients/${clientId}`)
  }

  return result
}

export async function rejectClientIntake(
  clientId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.REJECTED,
    session.user.id,
    reason ? { reason } : undefined,
  )

  if (result.success) {
    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
    revalidatePath(`/agent/clients/${clientId}`)
  }

  return result
}

export async function approvePrequal(
  clientId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Also set BetMGM to VERIFIED when approving prequal
  await prisma.clientPlatform.updateMany({
    where: {
      clientId,
      platformType: PlatformType.BETMGM,
      status: PlatformStatus.PENDING_REVIEW,
    },
    data: {
      status: PlatformStatus.VERIFIED,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  })

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.PREQUAL_APPROVED,
    session.user.id,
  )

  if (result.success) {
    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
  }

  return result
}

export async function rejectPrequal(
  clientId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.REJECTED,
    session.user.id,
    reason ? { reason } : undefined,
  )

  if (result.success) {
    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
  }

  return result
}

export async function rejectPrequalWithRetry(
  clientId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Find BetMGM platform — must be PENDING_REVIEW
    const platform = await prisma.clientPlatform.findFirst({
      where: {
        clientId,
        platformType: PlatformType.BETMGM,
        status: PlatformStatus.PENDING_REVIEW,
      },
      include: {
        client: { select: { firstName: true, lastName: true, agentId: true } },
      },
    })

    if (!platform) {
      return { success: false, error: 'BetMGM platform not in PENDING_REVIEW state' }
    }

    // Set to RETRY_PENDING with 24h cooldown
    const retryAfter = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.clientPlatform.update({
      where: { id: platform.id },
      data: {
        status: PlatformStatus.RETRY_PENDING,
        retryAfter,
        reviewNotes: reason || null,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        retryCount: { increment: 1 },
      },
    })

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.PLATFORM_STATUS_CHANGE,
        description: `BetMGM rejected with retry (24h cooldown)${reason ? `: ${reason}` : ''}`,
        clientId,
        userId: session.user.id,
        oldValue: PlatformStatus.PENDING_REVIEW,
        newValue: PlatformStatus.RETRY_PENDING,
      },
    })

    // Notify the agent
    if (platform.client?.agentId) {
      const clientName = `${platform.client.firstName} ${platform.client.lastName}`
      try {
        await createNotification({
          userId: platform.client.agentId,
          type: EventType.PLATFORM_STATUS_CHANGE,
          title: 'BetMGM needs resubmission',
          message: `${clientName}'s BetMGM was rejected — you can retry after 24 hours${reason ? `. Reason: ${reason}` : ''}`,
          link: `/agent/new-client?client=${clientId}`,
          clientId,
        })
      } catch (err) {
        logger.warn('Notification failed after BetMGM reject-with-retry', { error: err, clientId })
      }
    }

    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')

    return { success: true }
  } catch (error) {
    logger.error('BetMGM reject-with-retry failed', { error, clientId })
    return { success: false, error: 'Failed to reject BetMGM with retry' }
  }
}

export async function updatePlatformStatus(
  clientId: string,
  platformType: string,
  newStatus: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Map view-model status to DB PlatformStatus enum
  const statusMap: Record<string, string> = {
    active: 'VERIFIED',
    pipeline: 'NOT_STARTED',
    limited: 'LIMITED',
    permanent_limited: 'LIMITED',
    rejected: 'REJECTED',
    dead: 'REJECTED',
  }

  const dbStatus = statusMap[newStatus]
  if (!dbStatus) {
    return { success: false, error: `Invalid status: ${newStatus}` }
  }

  // Validate platformType is a valid enum value
  if (!Object.values(PlatformType).includes(platformType as PlatformType)) {
    return { success: false, error: `Invalid platform type: ${platformType}` }
  }
  const dbPlatformType = platformType as PlatformType

  const platform = await prisma.clientPlatform.findUnique({
    where: { clientId_platformType: { clientId, platformType: dbPlatformType } },
  })

  if (!platform) {
    return { success: false, error: 'Platform not found' }
  }

  const oldStatus = platform.status

  await prisma.clientPlatform.update({
    where: { clientId_platformType: { clientId, platformType: dbPlatformType } },
    data: { status: dbStatus as PlatformStatus },
  })

  // Log the status change (fire-and-forget, don't block the update)
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'PLATFORM_STATUS_CHANGE',
      description: `${platformType} status changed from ${oldStatus} to ${dbStatus}`,
      clientId,
      userId: userExists ? session.user.id : undefined,
      oldValue: oldStatus,
      newValue: dbStatus,
    },
  })

  revalidatePath('/backoffice/client-management')
  return { success: true }
}

export async function getVerificationTaskDetails(todoId: string) {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return null
  }

  return prisma.toDo.findUnique({
    where: { id: todoId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })
}
