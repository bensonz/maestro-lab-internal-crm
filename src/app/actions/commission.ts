'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

export async function markAllocationPaid(allocationId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'FINANCE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const allocation = await prisma.bonusAllocation.findUnique({
    where: { id: allocationId },
    select: { id: true, status: true, agentId: true, amount: true },
  })

  if (!allocation) return { success: false, error: 'Allocation not found' }
  if (allocation.status === 'PAID') {
    return { success: false, error: 'Already paid' }
  }

  await prisma.bonusAllocation.update({
    where: { id: allocationId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidById: session.user.id,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'ALLOCATION_PAID',
      description: `Allocation $${allocation.amount} paid to agent`,
      userId: session.user.id,
      metadata: {
        allocationId,
        agentId: allocation.agentId,
        amount: allocation.amount,
      },
    },
  })

  revalidatePath('/backoffice/commissions')
  revalidatePath('/agent/earnings')

  return { success: true }
}

export async function bulkMarkPaid(allocationIds: string[]) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'FINANCE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  if (!allocationIds.length) {
    return { success: false, error: 'No allocations specified' }
  }

  const result = await prisma.bonusAllocation.updateMany({
    where: {
      id: { in: allocationIds },
      status: 'PENDING',
    },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidById: session.user.id,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'ALLOCATION_PAID',
      description: `Bulk payment: ${result.count} allocations marked paid`,
      userId: session.user.id,
      metadata: {
        allocationIds,
        paidCount: result.count,
      },
    },
  })

  revalidatePath('/backoffice/commissions')
  revalidatePath('/agent/earnings')

  return { success: true, paidCount: result.count }
}
