'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole, SettlementStatus, EventType } from '@/types'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]

export async function confirmSettlement(data: {
  movementId: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!data.movementId) {
    return { success: false, error: 'Movement ID is required' }
  }

  const movement = await prisma.fundMovement.findUnique({
    where: { id: data.movementId },
    select: {
      id: true,
      settlementStatus: true,
      fromClientId: true,
      amount: true,
      fromPlatform: true,
      toPlatform: true,
    },
  })

  if (!movement) {
    return { success: false, error: 'Fund movement not found' }
  }

  if (movement.settlementStatus !== SettlementStatus.PENDING_REVIEW) {
    return {
      success: false,
      error: `Cannot confirm — current status is ${movement.settlementStatus}`,
    }
  }

  await prisma.fundMovement.update({
    where: { id: data.movementId },
    data: {
      settlementStatus: SettlementStatus.CONFIRMED,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: data.notes?.trim() || null,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: EventType.STATUS_CHANGE,
      description: `Settlement confirmed: $${Number(movement.amount)} ${movement.fromPlatform} → ${movement.toPlatform}`,
      clientId: movement.fromClientId,
      userId: session.user.id,
      metadata: {
        movementId: movement.id,
        settlementStatus: SettlementStatus.CONFIRMED,
      },
    },
  })

  revalidatePath('/backoffice/client-settlement')

  return { success: true }
}

export async function rejectSettlement(data: {
  movementId: string
  notes: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!data.movementId) {
    return { success: false, error: 'Movement ID is required' }
  }

  if (!data.notes?.trim()) {
    return { success: false, error: 'Rejection reason is required' }
  }

  const movement = await prisma.fundMovement.findUnique({
    where: { id: data.movementId },
    select: {
      id: true,
      settlementStatus: true,
      fromClientId: true,
      amount: true,
      fromPlatform: true,
      toPlatform: true,
    },
  })

  if (!movement) {
    return { success: false, error: 'Fund movement not found' }
  }

  if (movement.settlementStatus !== SettlementStatus.PENDING_REVIEW) {
    return {
      success: false,
      error: `Cannot reject — current status is ${movement.settlementStatus}`,
    }
  }

  await prisma.fundMovement.update({
    where: { id: data.movementId },
    data: {
      settlementStatus: SettlementStatus.REJECTED,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: data.notes.trim(),
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: EventType.STATUS_CHANGE,
      description: `Settlement rejected: $${Number(movement.amount)} ${movement.fromPlatform} → ${movement.toPlatform}`,
      clientId: movement.fromClientId,
      userId: session.user.id,
      metadata: {
        movementId: movement.id,
        settlementStatus: SettlementStatus.REJECTED,
        reason: data.notes.trim(),
      },
    },
  })

  revalidatePath('/backoffice/client-settlement')

  return { success: true }
}

export async function bulkConfirmSettlements(data: {
  movementIds: string[]
  notes?: string
}): Promise<{ success: boolean; confirmed: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, confirmed: 0, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, confirmed: 0, error: 'Insufficient permissions' }
  }

  if (!data.movementIds.length) {
    return { success: false, confirmed: 0, error: 'No movements selected' }
  }

  const result = await prisma.fundMovement.updateMany({
    where: {
      id: { in: data.movementIds },
      settlementStatus: SettlementStatus.PENDING_REVIEW,
    },
    data: {
      settlementStatus: SettlementStatus.CONFIRMED,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: data.notes?.trim() || null,
    },
  })

  revalidatePath('/backoffice/client-settlement')

  return { success: true, confirmed: result.count }
}
