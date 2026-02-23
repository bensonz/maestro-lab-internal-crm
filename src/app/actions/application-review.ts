'use server'

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

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: application.email },
    select: { id: true },
  })
  if (existingUser) {
    return { success: false, error: `A user with email ${application.email} already exists` }
  }

  // Derive starLevel, tier, and leadershipTier from selected tier value
  const LEADERSHIP_VALUES = ['ED', 'SED', 'MD', 'CMO'] as const
  const STAR_LEVEL_MAP: Record<string, number> = {
    'rookie': 0, '1-star': 1, '2-star': 2, '3-star': 3, '4-star': 4,
  }

  const selectedTier = data.tier || 'rookie'
  const isLeadership = LEADERSHIP_VALUES.includes(selectedTier as typeof LEADERSHIP_VALUES[number])

  const starLevel = isLeadership ? 4 : (STAR_LEVEL_MAP[selectedTier] ?? 0)
  const leadershipTier = isLeadership ? selectedTier : 'NONE'
  const dbTier = isLeadership ? '4-star' : selectedTier

  // Create user from application data
  let user
  try {
    user = await prisma.user.create({
      data: {
        email: application.email,
        passwordHash: application.password, // already hashed during application
        name: `${application.firstName} ${application.lastName}`,
        role: 'AGENT',
        phone: application.phone || null,
        gender: application.gender || null,
        dateOfBirth: application.dateOfBirth,
        citizenship: application.citizenship || null,
        address: application.address
          ? [application.address, application.city, application.state, application.zipCode, application.country]
              .filter(Boolean)
              .join(', ')
          : null,
        idDocument: application.idDocument || null,
        addressDocument: application.addressDocument || null,
        idNumber: application.idNumber || null,
        idExpiry: application.idExpiry,
        zelle: application.zelle || null,
        supervisorId: data.supervisorId || null,
        tier: dbTier,
        starLevel,
        leadershipTier: leadershipTier as 'NONE' | 'ED' | 'SED' | 'MD' | 'CMO',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Failed to create agent account: ${message}` }
  }

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

export async function revertApplicationToPending(applicationId: string) {
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

  if (application.status === 'PENDING') {
    return { success: false, error: 'Application is already pending' }
  }

  // If approved, delete the created User (only if safe to do so)
  if (application.status === 'APPROVED' && application.resultUserId) {
    try {
      await prisma.user.delete({
        where: { id: application.resultUserId },
      })
    } catch {
      return {
        success: false,
        error: 'Cannot revert: the created agent account has dependent records (clients, commissions, etc.)',
      }
    }
  }

  await prisma.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: 'PENDING',
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
      resultUserId: null,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'APPLICATION_REJECTED', // reuse closest event type
      description: `Application reverted to pending for ${application.firstName} ${application.lastName}`,
      userId: session.user.id,
      metadata: { applicationId, email: application.email, action: 'revert_to_pending' },
    },
  })

  revalidatePath('/backoffice/agent-management')

  return { success: true }
}
