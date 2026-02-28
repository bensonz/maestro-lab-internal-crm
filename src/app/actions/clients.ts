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

  const client = await prisma.client.create({
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      closerId,
      status: 'PENDING',
    },
  })

  revalidatePath('/backoffice/client-management')
  revalidatePath('/agent/clients')

  return { success: true, clientId: client.id }
}

export async function approveClient(clientId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'BACKOFFICE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, status: true, closerId: true, firstName: true, lastName: true },
  })

  if (!client) return { success: false, error: 'Client not found' }
  if (client.status === 'APPROVED') {
    return { success: false, error: 'Client already approved' }
  }

  // Update client status
  await prisma.client.update({
    where: { id: clientId },
    data: { status: 'APPROVED', approvedAt: new Date() },
  })

  // Log approval event
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVED',
      description: `Client ${client.firstName} ${client.lastName} approved`,
      userId: session.user.id,
      metadata: { clientId, closerId: client.closerId },
    },
  })

  // Recalculate closer's star level
  await recalculateAgentStarLevel(client.closerId)

  // Create and distribute bonus pool
  const poolResult = await createAndDistributeBonusPool(clientId, client.closerId)

  // Notify the agent — congratulatory event log entry visible on agent timeline
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVED_NOTIFICATION',
      description: `Congratulations! Your client ${client.firstName} ${client.lastName} has been approved. A $400 bonus pool has been created and distributed.`,
      userId: client.closerId,
      metadata: {
        clientId,
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
    clientName: `${client.firstName} ${client.lastName}`,
  }
}

export async function revertApproval(clientId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'BACKOFFICE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, status: true, closerId: true, firstName: true, lastName: true, approvedAt: true },
  })

  if (!client) return { success: false, error: 'Client not found' }
  if (client.status !== 'APPROVED') {
    return { success: false, error: 'Client is not approved' }
  }

  // Enforce 5-minute revert window
  if (client.approvedAt) {
    const minutesSinceApproval = (Date.now() - new Date(client.approvedAt).getTime()) / 60000
    if (minutesSinceApproval > 5) {
      return { success: false, error: 'Revert window expired (5 minutes)' }
    }
  }

  // Delete bonus allocations and pool for this client
  const pool = await prisma.bonusPool.findUnique({
    where: { clientId },
    select: { id: true },
  })

  if (pool) {
    await prisma.bonusAllocation.deleteMany({
      where: { poolId: pool.id },
    })
    await prisma.bonusPool.delete({
      where: { id: pool.id },
    })
  }

  // Revert client status to PENDING, clear approvedAt
  await prisma.client.update({
    where: { id: clientId },
    data: { status: 'PENDING', approvedAt: null },
  })

  // Recalculate closer's star level
  await recalculateAgentStarLevel(client.closerId)

  // Log the revert event
  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_APPROVAL_REVERTED',
      description: `Approval reverted for client ${client.firstName} ${client.lastName}`,
      userId: session.user.id,
      metadata: { clientId, closerId: client.closerId },
    },
  })

  revalidatePath('/backoffice/client-management')
  revalidatePath('/backoffice/commissions')
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/clients')
  revalidatePath('/agent/earnings')
  revalidatePath('/agent')

  return { success: true }
}
