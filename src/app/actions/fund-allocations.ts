'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { getConfig } from '@/backend/data/config'
import { getClearingHours, computeExpectedArrival } from '@/lib/clearing-windows'

export async function recordFundAllocation(
  platform: string,
  amount: string,
  direction: string,
  notes?: string,
  destinationPlatform?: string,
  transferMethod?: string,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!platform?.trim()) return { success: false, error: 'Platform is required' }
  if (!amount?.trim()) return { success: false, error: 'Amount is required' }
  if (!direction?.trim()) return { success: false, error: 'Direction is required' }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: 'Amount must be a positive number' }
  }

  if (!['DEPOSIT', 'WITHDRAWAL'].includes(direction)) {
    return { success: false, error: 'Direction must be DEPOSIT or WITHDRAWAL' }
  }

  // Compute clearing window for withdrawals (deposits are instant)
  const clearingHours = await getClearingHours(platform, direction)
  const expectedArrivalAt = computeExpectedArrival(new Date(), clearingHours)

  const allocation = await prisma.fundAllocation.create({
    data: {
      platform,
      amount: parsedAmount,
      direction,
      notes: notes?.trim() || null,
      recordedById: session.user.id,
      destinationPlatform: destinationPlatform?.trim() || null,
      transferMethod: transferMethod?.trim() || null,
      expectedArrivalAt,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'FUND_ALLOCATED',
      description: `Fund ${direction.toLowerCase()}: $${parsedAmount.toFixed(2)} on ${platform}`,
      userId: session.user.id,
      metadata: {
        allocationId: allocation.id,
        platform,
        amount: parsedAmount,
        direction,
        notes: notes?.trim() || null,
      },
    },
  })

  // Auto-create confirmation reminder todo for withdrawals
  if (direction === 'WITHDRAWAL') {
    const confirmHours = await getConfig('WITHDRAWAL_CONFIRM_HOURS', 24)
    const dueDate = new Date(Date.now() + confirmHours * 60 * 60 * 1000)

    await prisma.todo.create({
      data: {
        title: `Confirm Fund Withdrawal — $${parsedAmount.toFixed(2)} on ${platform}`,
        issueCategory: 'Confirm Fund Withdrawal',
        dueDate,
        assignedToId: session.user.id,
        createdById: session.user.id,
        source: 'MANUAL',
        metadata: { fundAllocationId: allocation.id },
      },
    })
  }

  revalidatePath('/backoffice/todo-list')

  return { success: true, allocationId: allocation.id }
}
