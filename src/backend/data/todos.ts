import prisma from '@/backend/prisma/client'
import { format } from 'date-fns'

/**
 * Fetch PENDING todos assigned to a specific agent.
 */
export async function getTodosByAgent(agentId: string) {
  return prisma.todo.findMany({
    where: {
      assignedToId: agentId,
      status: 'PENDING',
    },
    include: {
      clientRecord: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          step: true,
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Fetch all PENDING todos for the backoffice Verification Needed section.
 */
export async function getPendingTodosForBackoffice() {
  return prisma.todo.findMany({
    where: {
      status: 'PENDING',
    },
    include: {
      clientRecord: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          step: true,
          closerId: true,
          phoneAssignments: {
            orderBy: { signedOutAt: 'desc' },
            take: 1,
            select: {
              phoneNumber: true,
              carrier: true,
            },
          },
        },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Fetch COMPLETED todos for the backoffice Review tab.
 */
export async function getCompletedTodosForBackoffice() {
  return prisma.todo.findMany({
    where: {
      status: 'COMPLETED',
    },
    include: {
      clientRecord: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          step: true,
        },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: 100,
  })
}

/**
 * Fetch todo + device EventLog entries for the activity timeline.
 */
export async function getTodoTimeline() {
  const events = await prisma.eventLog.findMany({
    where: {
      eventType: {
        in: [
          'TODO_ASSIGNED',
          'TODO_COMPLETED',
          'TODO_REVERTED',
          'DEVICE_SIGNED_OUT',
          'DEVICE_RETURNED',
          'DEVICE_REISSUED',
          'CLIENT_APPROVED',
          'CLIENT_APPROVAL_REVERTED',
        ],
      },
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  type TimelineAction = 'assigned' | 'completed' | 'reverted' | 'device_out' | 'device_returned' | 'device_reissued' | 'client_approved' | 'client_reverted'

  const actionMap: Record<string, TimelineAction> = {
    TODO_ASSIGNED: 'assigned',
    TODO_COMPLETED: 'completed',
    TODO_REVERTED: 'reverted',
    DEVICE_SIGNED_OUT: 'device_out',
    DEVICE_RETURNED: 'device_returned',
    DEVICE_REISSUED: 'device_reissued',
    CLIENT_APPROVED: 'client_approved',
    CLIENT_APPROVAL_REVERTED: 'client_reverted',
  }

  const typeMap: Record<string, 'info' | 'success' | 'warning'> = {
    TODO_ASSIGNED: 'info',
    TODO_COMPLETED: 'success',
    TODO_REVERTED: 'warning',
    DEVICE_SIGNED_OUT: 'info',
    DEVICE_RETURNED: 'success',
    DEVICE_REISSUED: 'warning',
    CLIENT_APPROVED: 'success',
    CLIENT_APPROVAL_REVERTED: 'warning',
  }

  return events.map((e) => ({
    id: e.id,
    date: format(e.createdAt, 'MMM d, yyyy'),
    time: format(e.createdAt, 'h:mm a'),
    createdAt: e.createdAt,
    event: e.description,
    type: typeMap[e.eventType] ?? ('info' as const),
    actor: e.user?.name ?? null,
    action: actionMap[e.eventType] ?? ('assigned' as const),
  }))
}
