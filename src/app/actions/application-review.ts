'use server'

import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'

export async function approveApplication(
  applicationId: string,
  data: { supervisorId?: string; tier?: string; notes?: string },
) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Not authorized' }
  }

  const application = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
  })

  if (!application) {
    return { success: false, error: 'Application not found' }
  }

  if (application.status !== 'PENDING') {
    return { success: false, error: 'Application has already been reviewed' }
  }

  // Create user from application data
  const user = await prisma.user.create({
    data: {
      email: application.email,
      passwordHash: application.password, // already hashed during application
      name: `${application.firstName} ${application.lastName}`,
      role: 'AGENT',
      phone: application.phone,
      gender: application.gender,
      dateOfBirth: application.dateOfBirth,
      citizenship: application.citizenship,
      address: application.address
        ? [application.address, application.city, application.state, application.zipCode, application.country]
            .filter(Boolean)
            .join(', ')
        : null,
      idDocument: application.idDocument,
      addressDocument: application.addressDocument,
      idNumber: application.idNumber,
      idExpiry: application.idExpiry,
      zelle: application.zelle,
      supervisorId: data.supervisorId || null,
      tier: data.tier || 'rookie',
    },
  })

  // Update application
  await prisma.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: 'APPROVED',
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: data.notes || null,
      resultUserId: user.id,
    },
  })

  // Log event
  await prisma.eventLog.create({
    data: {
      eventType: 'APPLICATION_APPROVED',
      description: `Application approved for ${application.firstName} ${application.lastName}`,
      userId: session.user.id,
      metadata: {
        applicationId,
        createdUserId: user.id,
        email: application.email,
      },
    },
  })

  revalidatePath('/backoffice/agent-management')

  return {
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
  }
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Not authorized' }
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Rejection reason is required' }
  }

  const application = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
  })

  if (!application) {
    return { success: false, error: 'Application not found' }
  }

  if (application.status !== 'PENDING') {
    return { success: false, error: 'Application has already been reviewed' }
  }

  await prisma.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: 'REJECTED',
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reason,
    },
  })

  // Log event
  await prisma.eventLog.create({
    data: {
      eventType: 'APPLICATION_REJECTED',
      description: `Application rejected for ${application.firstName} ${application.lastName}: ${reason}`,
      userId: session.user.id,
      metadata: { applicationId, email: application.email },
    },
  })

  revalidatePath('/backoffice/agent-management')

  return { success: true }
}
