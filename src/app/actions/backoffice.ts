'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { transitionClientStatus } from '@/backend/services/status-transition'
import { revalidatePath } from 'next/cache'
import { IntakeStatus, UserRole, PlatformType, PlatformStatus } from '@/types'

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

  // Log the status change
  await prisma.eventLog.create({
    data: {
      eventType: 'PLATFORM_STATUS_CHANGE',
      description: `${platformType} status changed from ${oldStatus} to ${dbStatus}`,
      clientId,
      userId: session.user.id,
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
