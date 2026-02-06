'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { transitionClientStatus } from '@/backend/services/status-transition'
import { revalidatePath } from 'next/cache'
import { IntakeStatus, UserRole } from '@/types'

export async function approveClientIntake(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Verify client is ready for approval before calling transition
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, intakeStatus: true },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  if (client.intakeStatus !== IntakeStatus.READY_FOR_APPROVAL) {
    return { success: false, error: 'Client is not ready for approval' }
  }

  const result = await transitionClientStatus(clientId, IntakeStatus.APPROVED, session.user.id)

  if (result.success) {
    revalidatePath('/backoffice/sales-interaction')
    revalidatePath('/backoffice')
    revalidatePath(`/agent/clients/${clientId}`)
  }

  return result
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
