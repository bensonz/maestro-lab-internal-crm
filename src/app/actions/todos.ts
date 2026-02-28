'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

const ISSUE_CATEGORIES = [
  'Re-Open Bank Account / Schedule with Client',
  'Contact Bank',
  'Contact PayPal',
  'Platforms Verification',
] as const

type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export async function assignTodo(
  clientDraftId: string,
  issueCategory: string,
  dueDate: string,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate issue category
  if (!ISSUE_CATEGORIES.includes(issueCategory as IssueCategory)) {
    return { success: false, error: 'Invalid issue category' }
  }

  if (!clientDraftId?.trim()) {
    return { success: false, error: 'Client draft is required' }
  }

  if (!dueDate?.trim()) {
    return { success: false, error: 'Due date is required' }
  }

  // Look up the draft to get agent and client name
  const draft = await prisma.clientDraft.findUnique({
    where: { id: clientDraftId },
    select: {
      id: true,
      closerId: true,
      firstName: true,
      lastName: true,
      closer: { select: { name: true } },
    },
  })

  if (!draft) return { success: false, error: 'Client draft not found' }

  const clientName = [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unknown Client'
  const parsedDueDate = new Date(dueDate)

  if (isNaN(parsedDueDate.getTime())) {
    return { success: false, error: 'Invalid due date' }
  }

  // Create todo + event log in a transaction
  const todo = await prisma.todo.create({
    data: {
      title: issueCategory,
      description: `${issueCategory} — ${clientName}`,
      issueCategory,
      clientDraftId: draft.id,
      assignedToId: draft.closerId,
      createdById: session.user.id,
      dueDate: parsedDueDate,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_ASSIGNED',
      description: `To-do assigned: "${issueCategory}" for ${clientName} to ${draft.closer.name}`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientDraftId: draft.id,
        clientName,
        agentId: draft.closerId,
        agentName: draft.closer.name,
        issueCategory,
        dueDate,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true, todoId: todo.id }
}

export async function completeTodo(todoId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!todoId?.trim()) {
    return { success: false, error: 'Todo ID is required' }
  }

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      clientDraft: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'PENDING') return { success: false, error: 'Todo is not pending' }

  const clientName = [todo.clientDraft.firstName, todo.clientDraft.lastName].filter(Boolean).join(' ') || 'Unknown'

  await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      metadata: {
        ...(todo.metadata && typeof todo.metadata === 'object' ? todo.metadata as Record<string, unknown> : {}),
        completedById: session.user.id,
      },
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_COMPLETED',
      description: `To-do completed: "${todo.issueCategory}" for ${clientName} (agent: ${todo.assignedTo.name})`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientDraftId: todo.clientDraftId,
        clientName,
        agentId: todo.assignedTo.id,
        agentName: todo.assignedTo.name,
        issueCategory: todo.issueCategory,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true }
}

export async function revertTodo(todoId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!todoId?.trim()) {
    return { success: false, error: 'Todo ID is required' }
  }

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      clientDraft: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'COMPLETED') return { success: false, error: 'Todo is not completed' }

  const clientName = [todo.clientDraft.firstName, todo.clientDraft.lastName].filter(Boolean).join(' ') || 'Unknown'

  await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: 'PENDING',
      completedAt: null,
      metadata: {
        ...(todo.metadata && typeof todo.metadata === 'object' ? todo.metadata as Record<string, unknown> : {}),
        revertedById: session.user.id,
        revertedAt: new Date().toISOString(),
      },
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_REVERTED',
      description: `To-do reverted to pending: "${todo.issueCategory}" for ${clientName} (agent: ${todo.assignedTo.name})`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientDraftId: todo.clientDraftId,
        clientName,
        agentId: todo.assignedTo.id,
        agentName: todo.assignedTo.name,
        issueCategory: todo.issueCategory,
        action: 'revert_to_pending',
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true }
}
