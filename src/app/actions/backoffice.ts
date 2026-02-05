'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'
import { IntakeStatus, EventType, UserRole } from '@/types'

export async function approveClientIntake(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Verify client exists and is ready for approval
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, intakeStatus: true, firstName: true, lastName: true },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  if (client.intakeStatus !== IntakeStatus.READY_FOR_APPROVAL) {
    return { success: false, error: 'Client is not ready for approval' }
  }

  try {
    await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data: {
          intakeStatus: IntakeStatus.APPROVED,
          statusChangedAt: new Date(),
        },
      }),
      prisma.eventLog.create({
        data: {
          eventType: EventType.APPROVAL,
          description: `Client intake approved: ${client.firstName} ${client.lastName}`,
          clientId,
          userId: session.user.id,
        },
      }),
    ])

    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
    return { success: true }
  } catch (error) {
    console.error('Approve client error:', error)
    return { success: false, error: 'Failed to approve client' }
  }
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
