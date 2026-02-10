'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import {
  IntakeStatus,
  EventType,
  ExtensionRequestStatus,
  UserRole,
  ToDoStatus,
} from '@/types'
import { revalidatePath } from 'next/cache'
import { addBusinessDays } from '@/backend/services/status-transition'
import {
  createNotification,
  notifyRole,
} from '@/backend/services/notifications'

const MAX_EXTENSIONS = 3
const DEFAULT_REQUESTED_DAYS = 3

export async function requestDeadlineExtension(
  clientId: string,
  reason: string,
  requestedDays?: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate reason
  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      error: 'Please provide a reason (at least 10 characters)',
    }
  }

  // Verify agent owns this client
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      agentId: session.user.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      intakeStatus: true,
      executionDeadline: true,
      deadlineExtensions: true,
      agent: { select: { name: true } },
    },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Client must be IN_EXECUTION with a deadline
  if (client.intakeStatus !== IntakeStatus.IN_EXECUTION) {
    return {
      success: false,
      error: 'Extensions can only be requested for clients in execution',
    }
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
    return {
      success: false,
      error: 'An extension request is already pending for this client',
    }
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

    try {
      const clientName = `${client.firstName} ${client.lastName}`
      await notifyRole({
        role: [UserRole.ADMIN, UserRole.BACKOFFICE],
        type: EventType.DEADLINE_EXTENDED,
        title: 'Extension request',
        message: `Extension request from ${client.agent.name} for ${clientName}`,
        link: '/backoffice/todo-list',
        clientId,
      })
    } catch {
      // Notification failure should not block the main action
    }

    return { success: true }
  } catch (error) {
    console.error('Extension request error:', error)
    return { success: false, error: 'Failed to submit extension request' }
  }
}

function revalidateExtensionPaths(clientId: string) {
  revalidatePath('/backoffice')
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath(`/agent/clients/${clientId}`)
}

export async function approveExtensionRequest(
  requestId: string,
  reviewNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (
    !user ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.BACKOFFICE)
  ) {
    return {
      success: false,
      error: 'Unauthorized — admin or backoffice role required',
    }
  }

  // Find extension request
  const request = await prisma.extensionRequest.findUnique({
    where: { id: requestId },
    include: {
      client: {
        select: {
          id: true,
          executionDeadline: true,
        },
      },
    },
  })

  if (!request) {
    return { success: false, error: 'Extension request not found' }
  }

  if (request.status !== ExtensionRequestStatus.PENDING) {
    return { success: false, error: 'Extension request is not pending' }
  }

  const newDeadline = addBusinessDays(
    request.currentDeadline,
    request.requestedDays,
  )

  // Calculate calendar day difference for shifting todo due dates
  const calendarDayDiff = Math.round(
    (newDeadline.getTime() - request.currentDeadline.getTime()) /
      (1000 * 60 * 60 * 24),
  )

  try {
    await prisma.$transaction(async (tx) => {
      // Update extension request
      await tx.extensionRequest.update({
        where: { id: requestId },
        data: {
          status: ExtensionRequestStatus.APPROVED,
          reviewedById: session.user!.id,
          reviewedAt: new Date(),
          newDeadline,
          reviewNotes: reviewNotes?.trim() || null,
        },
      })

      // Update client deadline
      await tx.client.update({
        where: { id: request.clientId },
        data: {
          executionDeadline: newDeadline,
          deadlineExtensions: { increment: 1 },
        },
      })

      // Push forward due dates on active todos that were due at or before the old deadline
      const todosToUpdate = await tx.toDo.findMany({
        where: {
          clientId: request.clientId,
          status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
          dueDate: { lte: request.currentDeadline },
        },
        select: { id: true, dueDate: true },
      })

      for (const todo of todosToUpdate) {
        if (todo.dueDate) {
          const newDueDate = new Date(todo.dueDate)
          newDueDate.setDate(newDueDate.getDate() + calendarDayDiff)
          await tx.toDo.update({
            where: { id: todo.id },
            data: { dueDate: newDueDate },
          })
        }
      }

      // Create event log
      const formattedDeadline = newDeadline.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      await tx.eventLog.create({
        data: {
          eventType: EventType.DEADLINE_EXTENDED,
          description: `Extension approved: deadline extended to ${formattedDeadline} (+${request.requestedDays} business days)`,
          clientId: request.clientId,
          userId: session.user!.id,
          metadata: {
            extensionRequestId: requestId,
            previousDeadline: request.currentDeadline.toISOString(),
            newDeadline: newDeadline.toISOString(),
            requestedDays: request.requestedDays,
            todosUpdated: todosToUpdate.length,
          },
        },
      })
    })

    revalidateExtensionPaths(request.clientId)

    try {
      await createNotification({
        userId: request.requestedById,
        type: EventType.DEADLINE_EXTENDED,
        title: 'Extension approved',
        message: `Your extension request has been approved (+${request.requestedDays} business days)`,
        link: `/agent/clients/${request.clientId}`,
        clientId: request.clientId,
      })
    } catch {
      // Notification failure should not block the main action
    }

    return { success: true }
  } catch (error) {
    console.error('Approve extension error:', error)
    return { success: false, error: 'Failed to approve extension request' }
  }
}

export async function rejectExtensionRequest(
  requestId: string,
  reviewNotes: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate notes
  if (!reviewNotes || reviewNotes.trim().length === 0) {
    return { success: false, error: 'Rejection notes are required' }
  }

  // Check role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (
    !user ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.BACKOFFICE)
  ) {
    return {
      success: false,
      error: 'Unauthorized — admin or backoffice role required',
    }
  }

  // Find extension request
  const request = await prisma.extensionRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      clientId: true,
      status: true,
      reason: true,
      requestedById: true,
    },
  })

  if (!request) {
    return { success: false, error: 'Extension request not found' }
  }

  if (request.status !== ExtensionRequestStatus.PENDING) {
    return { success: false, error: 'Extension request is not pending' }
  }

  try {
    // Update extension request
    await prisma.extensionRequest.update({
      where: { id: requestId },
      data: {
        status: ExtensionRequestStatus.REJECTED,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes.trim(),
      },
    })

    // Create event log
    await prisma.eventLog.create({
      data: {
        eventType: EventType.DEADLINE_EXTENDED,
        description: `Extension rejected: ${reviewNotes.trim()}`,
        clientId: request.clientId,
        userId: session.user.id,
        metadata: {
          extensionRequestId: requestId,
          reason: request.reason,
        },
      },
    })

    revalidateExtensionPaths(request.clientId)

    try {
      await createNotification({
        userId: request.requestedById,
        type: EventType.DEADLINE_EXTENDED,
        title: 'Extension rejected',
        message: `Your extension request was rejected: ${reviewNotes.trim()}`,
        link: `/agent/clients/${request.clientId}`,
        clientId: request.clientId,
      })
    } catch {
      // Notification failure should not block the main action
    }

    return { success: true }
  } catch (error) {
    console.error('Reject extension error:', error)
    return { success: false, error: 'Failed to reject extension request' }
  }
}
