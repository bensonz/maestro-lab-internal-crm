'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { IntakeStatus, EventType, ExtensionRequestStatus } from '@/types'
import { revalidatePath } from 'next/cache'

const MAX_EXTENSIONS = 3
const DEFAULT_REQUESTED_DAYS = 3

export async function requestDeadlineExtension(
  clientId: string,
  reason: string,
  requestedDays?: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate reason
  if (!reason || reason.trim().length < 10) {
    return { success: false, error: 'Please provide a reason (at least 10 characters)' }
  }

  // Verify agent owns this client
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      agentId: session.user.id,
    },
    select: {
      id: true,
      intakeStatus: true,
      executionDeadline: true,
      deadlineExtensions: true,
    },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Client must be IN_EXECUTION with a deadline
  if (client.intakeStatus !== IntakeStatus.IN_EXECUTION) {
    return { success: false, error: 'Extensions can only be requested for clients in execution' }
  }

  if (!client.executionDeadline) {
    return { success: false, error: 'Client has no execution deadline set' }
  }

  // Check max extensions
  if (client.deadlineExtensions >= MAX_EXTENSIONS) {
    return { success: false, error: 'Maximum number of extensions reached' }
  }

  // Check no pending request already exists
  const existingPending = await prisma.extensionRequest.findFirst({
    where: {
      clientId,
      status: ExtensionRequestStatus.PENDING,
    },
  })

  if (existingPending) {
    return { success: false, error: 'An extension request is already pending for this client' }
  }

  const days = requestedDays ?? DEFAULT_REQUESTED_DAYS

  try {
    // Create extension request
    await prisma.extensionRequest.create({
      data: {
        clientId,
        requestedById: session.user.id,
        reason: reason.trim(),
        requestedDays: days,
        currentDeadline: client.executionDeadline,
      },
    })

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.DEADLINE_EXTENDED,
        description: `Extension requested: ${reason.trim()} (awaiting approval)`,
        clientId,
        userId: session.user.id,
        metadata: {
          requestedDays: days,
          currentDeadline: client.executionDeadline.toISOString(),
          extensionsUsed: client.deadlineExtensions,
        },
      },
    })

    revalidatePath(`/agent/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Extension request error:', error)
    return { success: false, error: 'Failed to submit extension request' }
  }
}
