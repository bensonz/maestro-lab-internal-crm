import prisma from '@/backend/prisma/client'
import { IntakeStatus, UserRole } from '@/types'
import { transitionClientStatus } from './status-transition'

async function getSystemUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!admin) {
    throw new Error('No active admin user found for system operations')
  }

  return admin.id
}

export async function detectAndMarkOverdueClients(): Promise<{
  marked: number
  clientIds: string[]
}> {
  const now = new Date()

  const overdueClients = await prisma.client.findMany({
    where: {
      intakeStatus: IntakeStatus.IN_EXECUTION,
      executionDeadline: { lt: now },
    },
    select: { id: true },
  })

  if (overdueClients.length === 0) {
    return { marked: 0, clientIds: [] }
  }

  const systemUserId = await getSystemUserId()

  const markedIds: string[] = []

  for (const client of overdueClients) {
    const result = await transitionClientStatus(
      client.id,
      IntakeStatus.EXECUTION_DELAYED,
      systemUserId,
      { reason: 'Execution deadline has passed' },
    )

    if (result.success) {
      markedIds.push(client.id)
    }
  }

  return { marked: markedIds.length, clientIds: markedIds }
}
