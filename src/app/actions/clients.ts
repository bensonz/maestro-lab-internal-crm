'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { recalculateAgentStarLevel } from '@/backend/services/star-level'
import { createAndDistributeBonusPool } from '@/backend/services/bonus-pool'

export async function createClient(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'BACKOFFICE', 'AGENT'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = (formData.get('email') as string) || undefined
  const phone = (formData.get('phone') as string) || undefined
  const closerId = (formData.get('closerId') as string) || session.user.id

  if (!firstName || !lastName) {
    return { success: false, error: 'First name and last name are required' }
  }

  const record = await prisma.clientRecord.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      closerId,
      status: 'SUBMITTED',
    },
  })

  revalidatePath('/backoffice/client-management')
  revalidatePath('/agent/clients')

  return { success: true, clientRecordId: record.id }
}

export async function approveClient(clientId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'BACKOFFICE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const record = await prisma.clientRecord.findUnique({
    where: { id: clientId },
    select: { id: true, status: true, closerId: true, firstName: true, lastName: true },
  })

  if (!record) return { success: false, error: 'Client not found' }
  if (record.status === 'APPROVED') {
    return { success: false, error: 'Client already approved' }
  }

  // Update record status
  await prisma.clientRecord.update({
    where: { id: clientId },
    data: { status: 'APPROVED', approvedAt: new Date() },
  })

  // Log approval event (backoffice audit)
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVED',
      description: `Client ${record.firstName} ${record.lastName} approved`,
      userId: session.user.id,
      metadata: { clientRecordId: clientId, closerId: record.closerId },
    },
  })

  // Recalculate closer's star level
  await recalculateAgentStarLevel(record.closerId)

  // Create and distribute bonus pool
  const poolResult = await createAndDistributeBonusPool(clientId, record.closerId)

  // Notify the agent — congratulatory event log entry visible on agent timeline
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVED_NOTIFICATION',
      description: `Congratulations! Your client ${record.firstName} ${record.lastName} has been approved. A $400 bonus pool has been created and distributed.`,
      userId: record.closerId,
      metadata: {
        clientRecordId: clientId,
        poolId: poolResult.poolId,
        distributedSlices: poolResult.distributedSlices,
        recycledSlices: poolResult.recycledSlices,
        approvedBy: session.user.id,
      },
    },
  })

  revalidatePath('/backoffice/client-management')
  revalidatePath('/backoffice/commissions')
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/clients')
  revalidatePath('/agent/earnings')
  revalidatePath('/agent')

  return {
    success: true,
    poolId: poolResult.poolId,
    distributedSlices: poolResult.distributedSlices,
    recycledSlices: poolResult.recycledSlices,
    clientName: `${record.firstName} ${record.lastName}`,
  }
}

/**
 * Revert an approved client record back to SUBMITTED.
 * Only allowed within 5 minutes of approval.
 * Deletes bonus pool + allocations, recalculates star level.
 */
export async function revertApproval(clientId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'BACKOFFICE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const record = await prisma.clientRecord.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      status: true,
      closerId: true,
      firstName: true,
      lastName: true,
      approvedAt: true,
    },
  })

  if (!record) return { success: false, error: 'Client not found' }
  if (record.status !== 'APPROVED') {
    return { success: false, error: 'Client is not approved' }
  }

  // Enforce 5-minute revert window
  if (record.approvedAt) {
    const minutesSinceApproval = (Date.now() - new Date(record.approvedAt).getTime()) / (1000 * 60)
    if (minutesSinceApproval > 5) {
      return { success: false, error: 'Revert window expired (5 minutes)' }
    }
  }

  // Delete bonus allocations + pool for this client record
  const pool = await prisma.bonusPool.findFirst({
    where: { clientRecordId: clientId },
    select: { id: true },
  })

  if (pool) {
    await prisma.bonusAllocation.deleteMany({ where: { poolId: pool.id } })
    await prisma.bonusPool.delete({ where: { id: pool.id } })
  }

  // Revert record status
  await prisma.clientRecord.update({
    where: { id: clientId },
    data: { status: 'SUBMITTED', approvedAt: null },
  })

  // Recalculate closer's star level (removal of an approved client)
  await recalculateAgentStarLevel(record.closerId)

  // Log revert event
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVAL_REVERTED',
      description: `Approval reverted for ${record.firstName} ${record.lastName} — bonus pool removed, star level recalculated`,
      userId: session.user.id,
      metadata: {
        clientRecordId: clientId,
        closerId: record.closerId,
        poolId: pool?.id ?? null,
      },
    },
  })

  revalidatePath('/backoffice/client-management')
  revalidatePath('/backoffice/commissions')
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/clients')
  revalidatePath('/agent/earnings')
  revalidatePath('/agent')

  return {
    success: true,
    clientName: `${record.firstName} ${record.lastName}`,
  }
}
