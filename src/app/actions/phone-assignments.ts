'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

export async function assignAndSignOutDevice(
  draftId: string,
  phoneNumber: string,
  carrier?: string,
  deviceId?: string,
  notes?: string,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!phoneNumber?.trim()) {
    return { success: false, error: 'Phone number is required' }
  }

  const draft = await prisma.clientDraft.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      closerId: true,
      deviceReservationDate: true,
      firstName: true,
      lastName: true,
    },
  })

  if (!draft) return { success: false, error: 'Draft not found' }
  if (!draft.deviceReservationDate) {
    return { success: false, error: 'Draft has no device reservation date' }
  }

  // Check for existing active assignment on this draft
  const existingActive = await prisma.phoneAssignment.findFirst({
    where: { clientDraftId: draftId, status: 'SIGNED_OUT' },
    select: { id: true },
  })

  if (existingActive) {
    return { success: false, error: 'Draft already has an active device assignment' }
  }

  const now = new Date()
  const dueBackAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days

  const assignment = await prisma.phoneAssignment.create({
    data: {
      phoneNumber: phoneNumber.trim(),
      carrier: carrier?.trim() || null,
      deviceId: deviceId?.trim() || null,
      notes: notes?.trim() || null,
      clientDraftId: draftId,
      agentId: draft.closerId,
      signedOutById: session.user.id,
      signedOutAt: now,
      dueBackAt,
      status: 'SIGNED_OUT',
    },
  })

  // Auto-advance draft to step 3 — device assignment unlocks platform registration
  await prisma.clientDraft.update({
    where: { id: draftId },
    data: { step: 3 },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'DEVICE_SIGNED_OUT',
      description: `Device signed out for ${draft.firstName} ${draft.lastName}: ${phoneNumber.trim()}`,
      userId: session.user.id,
      metadata: {
        assignmentId: assignment.id,
        draftId,
        agentId: draft.closerId,
        phoneNumber: phoneNumber.trim(),
        dueBackAt: dueBackAt.toISOString(),
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/backoffice/phone-tracking')
  revalidatePath('/agent/new-client')

  return { success: true, assignmentId: assignment.id }
}

export async function returnDevice(assignmentId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  const assignment = await prisma.phoneAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      phoneNumber: true,
      clientDraftId: true,
      agentId: true,
      clientDraft: { select: { firstName: true, lastName: true } },
    },
  })

  if (!assignment) return { success: false, error: 'Assignment not found' }
  if (assignment.status === 'RETURNED') {
    return { success: false, error: 'Device already returned' }
  }

  const now = new Date()

  await prisma.phoneAssignment.update({
    where: { id: assignmentId },
    data: {
      status: 'RETURNED',
      returnedAt: now,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'DEVICE_RETURNED',
      description: `Device returned for ${assignment.clientDraft.firstName} ${assignment.clientDraft.lastName}: ${assignment.phoneNumber}`,
      userId: session.user.id,
      metadata: {
        assignmentId,
        draftId: assignment.clientDraftId,
        agentId: assignment.agentId,
        phoneNumber: assignment.phoneNumber,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/backoffice/phone-tracking')

  return { success: true }
}

export async function reissueDevice(assignmentId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  const assignment = await prisma.phoneAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      phoneNumber: true,
      clientDraftId: true,
      agentId: true,
      dueBackAt: true,
      clientDraft: { select: { firstName: true, lastName: true } },
    },
  })

  if (!assignment) return { success: false, error: 'Assignment not found' }
  if (assignment.status !== 'RETURNED') {
    return { success: false, error: 'Device is not in RETURNED status' }
  }

  // Restore to SIGNED_OUT — keep original dueBackAt (clock never stopped)
  await prisma.phoneAssignment.update({
    where: { id: assignmentId },
    data: {
      status: 'SIGNED_OUT',
      returnedAt: null,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'DEVICE_REISSUED',
      description: `Device re-issued for ${assignment.clientDraft.firstName} ${assignment.clientDraft.lastName}: ${assignment.phoneNumber}`,
      userId: session.user.id,
      metadata: {
        assignmentId,
        draftId: assignment.clientDraftId,
        agentId: assignment.agentId,
        phoneNumber: assignment.phoneNumber,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/backoffice/phone-tracking')

  return { success: true }
}
