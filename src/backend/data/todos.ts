import prisma from '@/backend/prisma/client'

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
      clientDraft: {
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
      clientDraft: {
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
