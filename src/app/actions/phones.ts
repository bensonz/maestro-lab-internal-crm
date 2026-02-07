'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { transitionClientStatus } from '@/backend/services/status-transition'
import { IntakeStatus, UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

const BACKOFFICE_ROLES: string[] = [UserRole.BACKOFFICE, UserRole.ADMIN]

function revalidatePhonePaths(clientId?: string) {
  revalidatePath('/backoffice/phone-tracking')
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/clients')
  if (clientId) {
    revalidatePath(`/agent/clients/${clientId}`)
  }
}

export async function assignPhone(
  clientId: string,
  phoneNumber: string,
  deviceId?: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      intakeStatus: true,
      agentId: true,
      phoneAssignment: { select: { id: true } },
    },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  if (client.intakeStatus !== IntakeStatus.PENDING) {
    return {
      success: false,
      error: 'Client must be in PENDING status to assign a phone',
    }
  }

  if (client.phoneAssignment) {
    return { success: false, error: 'Client already has a phone assignment' }
  }

  if (!client.agentId) {
    return { success: false, error: 'Client has no assigned agent' }
  }

  try {
    await prisma.phoneAssignment.create({
      data: {
        phoneNumber,
        deviceId: deviceId || null,
        notes: notes || null,
        clientId,
        agentId: client.agentId,
        issuedAt: new Date(),
      },
    })

    const result = await transitionClientStatus(
      clientId,
      IntakeStatus.PHONE_ISSUED,
      session.user.id,
    )

    if (!result.success) {
      return result
    }

    revalidatePhonePaths(clientId)
    return { success: true }
  } catch (error) {
    console.error('Assign phone error:', error)
    return { success: false, error: 'Failed to assign phone' }
  }
}

export async function signOutPhone(
  assignmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const assignment = await prisma.phoneAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, issuedAt: true, signedOutAt: true, clientId: true },
  })

  if (!assignment) {
    return { success: false, error: 'Assignment not found' }
  }

  if (!assignment.issuedAt) {
    return { success: false, error: 'Phone has not been issued yet' }
  }

  if (assignment.signedOutAt) {
    return { success: false, error: 'Phone is already signed out' }
  }

  try {
    await prisma.phoneAssignment.update({
      where: { id: assignmentId },
      data: { signedOutAt: new Date() },
    })

    revalidatePhonePaths(assignment.clientId ?? undefined)
    return { success: true }
  } catch (error) {
    console.error('Sign out phone error:', error)
    return { success: false, error: 'Failed to sign out phone' }
  }
}

export async function returnPhone(
  assignmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const assignment = await prisma.phoneAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, signedOutAt: true, returnedAt: true, clientId: true },
  })

  if (!assignment) {
    return { success: false, error: 'Assignment not found' }
  }

  if (!assignment.signedOutAt) {
    return {
      success: false,
      error: 'Phone must be signed out before returning',
    }
  }

  if (assignment.returnedAt) {
    return { success: false, error: 'Phone has already been returned' }
  }

  try {
    await prisma.phoneAssignment.update({
      where: { id: assignmentId },
      data: { returnedAt: new Date() },
    })

    revalidatePhonePaths(assignment.clientId ?? undefined)
    return { success: true }
  } catch (error) {
    console.error('Return phone error:', error)
    return { success: false, error: 'Failed to return phone' }
  }
}
