'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

export async function confirmFundAllocation(
  allocationId: string,
  emailId?: string,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE' && role !== 'FINANCE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!allocationId?.trim()) {
    return { success: false, error: 'Allocation ID is required' }
  }

  const allocation = await prisma.fundAllocation.findUnique({
    where: { id: allocationId },
    include: { recordedBy: { select: { name: true } } },
  })

  if (!allocation) return { success: false, error: 'Allocation not found' }
  if (allocation.confirmationStatus === 'CONFIRMED') {
    return { success: false, error: 'Allocation already confirmed' }
  }

  await prisma.fundAllocation.update({
    where: { id: allocationId },
    data: {
      confirmationStatus: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedById: session.user.id,
      confirmedAmount: allocation.amount,
      emailConfirmationId: emailId ?? null,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'FUND_CONFIRMED',
      description: `Fund allocation confirmed: $${allocation.amount} ${allocation.direction} on ${allocation.platform}`,
      userId: session.user.id,
      metadata: {
        allocationId,
        amount: Number(allocation.amount),
        platform: allocation.platform,
        direction: allocation.direction,
        emailId,
      },
    },
  })

  revalidatePath('/backoffice/todo-list')
  return { success: true }
}

export async function flagDiscrepancy(
  allocationId: string,
  confirmedAmount: number,
  notes: string,
  emailId?: string,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE' && role !== 'FINANCE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!allocationId?.trim()) {
    return { success: false, error: 'Allocation ID is required' }
  }

  const allocation = await prisma.fundAllocation.findUnique({
    where: { id: allocationId },
    include: { recordedBy: { select: { name: true } } },
  })

  if (!allocation) return { success: false, error: 'Allocation not found' }

  await prisma.fundAllocation.update({
    where: { id: allocationId },
    data: {
      confirmationStatus: 'DISCREPANCY',
      confirmedAt: new Date(),
      confirmedById: session.user.id,
      confirmedAmount,
      emailConfirmationId: emailId ?? null,
      discrepancyNotes: notes,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'FUND_DISCREPANCY_FLAGGED',
      description: `Fund discrepancy flagged: recorded $${allocation.amount} vs confirmed $${confirmedAmount} on ${allocation.platform}`,
      userId: session.user.id,
      metadata: {
        allocationId,
        recordedAmount: Number(allocation.amount),
        confirmedAmount,
        platform: allocation.platform,
        direction: allocation.direction,
        notes,
        emailId,
      },
    },
  })

  revalidatePath('/backoffice/todo-list')
  return { success: true }
}

export async function manualConfirmAllocation(allocationId: string) {
  return confirmFundAllocation(allocationId)
}
