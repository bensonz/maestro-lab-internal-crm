'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole, EventType } from '@/types'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]

// ── Partner CRUD ──

export async function createPartner(data: {
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  company?: string
  type?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Partner name is required' }
  }

  await prisma.partner.create({
    data: {
      name: data.name.trim(),
      contactName: data.contactName?.trim() || null,
      contactEmail: data.contactEmail?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      company: data.company?.trim() || null,
      type: data.type || 'referral',
      notes: data.notes?.trim() || null,
    },
  })

  revalidatePath('/backoffice/partners')
  return { success: true }
}

export async function updatePartner(
  partnerId: string,
  data: {
    name?: string
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    company?: string
    type?: string
    status?: string
    notes?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!partnerId) {
    return { success: false, error: 'Partner ID is required' }
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.contactName !== undefined && {
        contactName: data.contactName.trim() || null,
      }),
      ...(data.contactEmail !== undefined && {
        contactEmail: data.contactEmail.trim() || null,
      }),
      ...(data.contactPhone !== undefined && {
        contactPhone: data.contactPhone.trim() || null,
      }),
      ...(data.company !== undefined && {
        company: data.company.trim() || null,
      }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && {
        notes: data.notes.trim() || null,
      }),
    },
  })

  revalidatePath('/backoffice/partners')
  return { success: true }
}

export async function deletePartner(
  partnerId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!partnerId) {
    return { success: false, error: 'Partner ID is required' }
  }

  // Check no clients assigned
  const assignedCount = await prisma.client.count({
    where: { partnerId },
  })

  if (assignedCount > 0) {
    return {
      success: false,
      error: `Cannot delete partner with ${assignedCount} assigned client(s). Reassign them first.`,
    }
  }

  await prisma.partner.delete({ where: { id: partnerId } })

  revalidatePath('/backoffice/partners')
  return { success: true }
}

// ── Client-Partner Assignment ──

export async function assignClientToPartner(data: {
  clientId: string
  partnerId: string | null
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!data.clientId) {
    return { success: false, error: 'Client ID is required' }
  }

  await prisma.client.update({
    where: { id: data.clientId },
    data: { partnerId: data.partnerId },
  })

  // Log the assignment event
  const description = data.partnerId
    ? 'Client assigned to partner'
    : 'Client unassigned from partner'

  await prisma.eventLog.create({
    data: {
      eventType: EventType.STATUS_CHANGE,
      description,
      clientId: data.clientId,
      userId: session.user.id,
    },
  })

  revalidatePath('/backoffice/partners')
  revalidatePath('/backoffice/client-management')
  return { success: true }
}

export async function bulkAssignPartner(data: {
  clientIds: string[]
  partnerId: string
}): Promise<{ success: boolean; updated: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, updated: 0, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, updated: 0, error: 'Insufficient permissions' }
  }

  if (!data.clientIds.length) {
    return { success: false, updated: 0, error: 'No clients selected' }
  }

  if (!data.partnerId) {
    return { success: false, updated: 0, error: 'Partner ID is required' }
  }

  const result = await prisma.client.updateMany({
    where: { id: { in: data.clientIds } },
    data: { partnerId: data.partnerId },
  })

  revalidatePath('/backoffice/partners')
  revalidatePath('/backoffice/client-management')
  return { success: true, updated: result.count }
}
