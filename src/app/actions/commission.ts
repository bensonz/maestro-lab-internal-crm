'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]

export async function markAllocationPaid(
  allocationId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!allocationId) {
    return { success: false, error: 'Allocation ID is required' }
  }

  const allocation = await prisma.bonusAllocation.findUnique({
    where: { id: allocationId },
  })

  if (!allocation) {
    return { success: false, error: 'Allocation not found' }
  }

  if (allocation.status === 'paid') {
    return { success: false, error: 'Allocation is already paid' }
  }

  await prisma.bonusAllocation.update({
    where: { id: allocationId },
    data: { status: 'paid', paidAt: new Date() },
  })

  revalidatePath('/backoffice/commissions')
  return { success: true }
}

export async function bulkMarkPaid(
  allocationIds: string[],
): Promise<{ success: boolean; updated: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, updated: 0, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, updated: 0, error: 'Insufficient permissions' }
  }

  if (!allocationIds.length) {
    return { success: false, updated: 0, error: 'No allocations selected' }
  }

  const result = await prisma.bonusAllocation.updateMany({
    where: { id: { in: allocationIds }, status: 'pending' },
    data: { status: 'paid', paidAt: new Date() },
  })

  revalidatePath('/backoffice/commissions')
  return { success: true, updated: result.count }
}
